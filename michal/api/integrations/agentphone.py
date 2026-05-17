"""AgentPhone integration — HOSTED MODE.

We build the agent (negotiation prompt, voice, tools, attached phone number)
on the AgentPhone dashboard. Our backend only:
  1. POSTs an outbound-call request (agent_id + to_number + context)
  2. Polls the call until it ends
  3. Parses the final transcript/summary into our outcome shape

While the real call is in flight we still emit canned transcript chunks so the
UI card stays animated; the final outcome from AgentPhone overrides.
"""
from __future__ import annotations

import asyncio

import httpx

import config
from agents.caller import _canned_outcome, _canned_transcript, _emit_chunks
from state import Card, RunState, store


async def run_call(rs: RunState, card: Card) -> dict:
    """Trigger a hosted-mode AgentPhone call. Returns outcome dict."""
    if not (config.AGENTPHONE_API_KEY and config.AGENTPHONE_AGENT_ID and config.REAL_DEMO_NUMBER):
        # missing creds — fall back to canned animation
        chunks = _canned_transcript(card, rs.parsed)
        await _emit_chunks(rs, card, chunks)
        return _canned_outcome(card)

    headers = {
        "Authorization": f"Bearer {config.AGENTPHONE_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "agent_id": config.AGENTPHONE_AGENT_ID,
        "to_number": config.REAL_DEMO_NUMBER,
        # context the hosted agent can reference (templated into its prompt)
        "metadata": {
            "title": card.title,
            "price": card.original_price,
            "dates": card.dates,
            "card_id": card.card_id,
            "run_id": rs.run_id,
        },
    }

    call_id: str | None = None
    try:
        async with httpx.AsyncClient(timeout=30.0) as cx:
            r = await cx.post(config.AGENTPHONE_CALL_URL, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            call_id = str(data.get("id") or data.get("call_id") or "")
    except Exception:
        # call initiation failed — fall back to canned
        chunks = _canned_transcript(card, rs.parsed)
        await _emit_chunks(rs, card, chunks)
        return _canned_outcome(card)

    # Keep the UI alive with canned chunks while the real call runs in parallel.
    animation = asyncio.create_task(_emit_chunks(rs, card, _canned_transcript(card, rs.parsed)))

    # Poll the call until it completes (max ~60s).
    outcome: dict | None = None
    if call_id:
        outcome = await _poll_call(headers, call_id)

    # ensure the animation has finished before we publish call_finished
    await animation

    return outcome or _canned_outcome(card)


async def _poll_call(headers: dict, call_id: str) -> dict | None:
    """Poll GET {AGENTPHONE_CALL_URL}/{call_id} until it ends. Parse summary."""
    url = f"{config.AGENTPHONE_CALL_URL}/{call_id}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as cx:
            for _ in range(60):
                await asyncio.sleep(1.0)
                r = await cx.get(url, headers=headers)
                if r.status_code >= 400:
                    return None
                data = r.json()
                status = data.get("status") or data.get("state")
                if status in ("completed", "ended", "finished", "done"):
                    return _parse_outcome(data)
    except Exception:
        return None
    return None


def _parse_outcome(data: dict) -> dict:
    """Extract {accepted, discount_pct, final_price, summary} from AgentPhone's
    completion payload. Adjust field names once you've seen a real response."""
    summary_obj = data.get("summary") or data.get("result") or {}
    if isinstance(summary_obj, str):
        summary_text = summary_obj
        accepted = "no" not in summary_text.lower()[:40]
        return {
            "accepted": accepted,
            "discount_pct": 0.0,
            "final_price": 0.0,
            "summary": summary_text[:280],
        }
    return {
        "accepted": bool(summary_obj.get("accepted", True)),
        "discount_pct": float(summary_obj.get("discount_pct", 0.0)),
        "final_price": float(summary_obj.get("final_price", 0.0)),
        "summary": str(summary_obj.get("summary", "Call completed."))[:280],
    }
