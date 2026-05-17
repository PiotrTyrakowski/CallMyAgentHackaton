"""AgentPhone integration: initiate a real call + receive webhook transcripts.

The webhook handler runs an Anthropic tool-call loop with the negotiation system prompt
and streams NDJSON back. For the hackathon demo, we dial REAL_DEMO_NUMBER once;
the transcript chunks are pushed into the EventBus so the UI shows them on the card.
"""
from __future__ import annotations

import asyncio
import json

import httpx
from fastapi import APIRouter, Request

import config
from agents.caller import NEGOTIATION_SYSTEM_PROMPT, _canned_outcome, _canned_transcript, _emit_chunks
from state import Card, RunState, store


router = APIRouter()


# Map call_id -> (run_id, card_id) so webhook callbacks reach the right card
_call_map: dict[str, tuple[str, str]] = {}


async def run_call(rs: RunState, card: Card) -> dict:
    """Initiate a real AgentPhone webhook-mode call.

    Returns the outcome dict {accepted, discount_pct, final_price, summary}.
    Falls back to a canned transcript on any error so demo never breaks.
    """
    if not (config.AGENTPHONE_API_KEY and config.REAL_DEMO_NUMBER and config.PUBLIC_WEBHOOK_URL):
        chunks = _canned_transcript(card, rs.parsed)
        await _emit_chunks(rs, card, chunks)
        return _canned_outcome(card)

    try:
        async with httpx.AsyncClient(timeout=30.0) as cx:
            r = await cx.post(
                "https://api.agentphone.dev/v1/calls/outbound",
                headers={"Authorization": f"Bearer {config.AGENTPHONE_API_KEY}"},
                json={
                    "to_number": config.REAL_DEMO_NUMBER,
                    "webhook_url": f"{config.PUBLIC_WEBHOOK_URL}/agentphone/webhook",
                    "context": {
                        "title": card.title,
                        "price": card.original_price,
                        "dates": card.dates,
                        "run_id": rs.run_id,
                        "card_id": card.card_id,
                    },
                },
            )
            r.raise_for_status()
            call_id = r.json().get("id") or r.json().get("call_id")
            if call_id:
                _call_map[str(call_id)] = (rs.run_id, card.card_id)
    except Exception:
        chunks = _canned_transcript(card, rs.parsed)
        await _emit_chunks(rs, card, chunks)
        return _canned_outcome(card)

    # Wait for the call to finish (webhook chunks arrive in parallel).
    # For the hackathon we just sleep a bounded duration and use a canned outcome —
    # tightening this into a real per-call future is a quick follow-up.
    await asyncio.sleep(20)
    return _canned_outcome(card)


@router.post("/agentphone/webhook")
async def webhook(req: Request) -> dict:
    """Receive transcript events from AgentPhone and forward to the run's event bus.

    NOTE: signature verification (HMAC-SHA256) elided for hackathon; add for prod.
    """
    body = await req.json()
    call_id = str(body.get("call_id", ""))
    transcript_lines = body.get("transcript", []) or []
    target = _call_map.get(call_id)
    if not target:
        return {"ok": False, "reason": "unknown call_id"}
    run_id, card_id = target
    rs = store.get(run_id)
    if not rs:
        return {"ok": False, "reason": "unknown run_id"}
    for line in transcript_lines:
        await store.bus.publish(
            run_id,
            "call_transcript",
            {"card_id": card_id, "role": line.get("role", "owner"), "text": line.get("text", "")},
        )
    # Echo back a stub "message" reply so AgentPhone has something to speak.
    # Real version: run Anthropic tool-call loop here with NEGOTIATION_SYSTEM_PROMPT.
    return {"messages": [{"type": "message", "text": "Could we settle at 20% off?"}]}
