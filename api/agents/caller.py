"""Caller agent: rings each card's owner and negotiates.

All 25 calls start at once. Each finishes after a random 3-15s with streamed
transcript chunks. Aggressive 15-25% discount target — discount > 0 highlighted.

- mock: scripted Anthropic transcript (or canned if no key)
- real: AgentPhone webhook mode to REAL_DEMO_NUMBER for ONE card (configurable)
"""
from __future__ import annotations

import asyncio
import json
import random
import re

import httpx

import config
import cache
from state import Card, RunState, store


NEGOTIATION_SYSTEM_PROMPT = (
    "You are a savvy real-estate negotiation agent calling a property owner on behalf of a guest. "
    "Your single goal: secure a 15-25% discount off the listed price, citing the dates and length-of-stay. "
    "Anchor high (start at 25% off), settle gracefully. Be warm, fast, decisive. "
    "Walk away if the owner refuses any discount. End each call with a one-line outcome."
)


def _canned_transcript(card: Card, parsed: dict) -> list[dict]:
    nights = 2  # placeholder
    return [
        {"role": "agent", "text": f"Hi, this is Avery — calling about your {card.title} listing for {card.dates}."},
        {"role": "owner", "text": "Hi Avery, yes the listing is still available."},
        {"role": "agent", "text": f"Great — my guest is booking {nights} nights at ${card.original_price}/night. We're juggling a few options, could you do 25% off?"},
        {"role": "owner", "text": "25% is steep. Best I can do is 15."},
        {"role": "agent", "text": "Could we meet at 20%? They'll book on the call."},
        {"role": "owner", "text": "Deal at 18%."},
    ]


def _canned_outcome(card: Card) -> dict:
    return {
        "accepted": True,
        "discount_pct": 0.18,
        "final_price": round(card.original_price * 0.82, 2),
        "summary": "18% off agreed on the call.",
    }


async def _emit_chunks(rs: RunState, card: Card, chunks: list[dict]) -> None:
    for ch in chunks:
        await store.bus.publish(
            rs.run_id,
            "call_transcript",
            {"card_id": card.card_id, "role": ch["role"], "text": ch["text"]},
        )
        card.transcript.append(ch)
        await asyncio.sleep(0.6 + random.random() * 0.6)


async def _run_llm_call(rs: RunState, card: Card) -> dict:
    """Generate a transcript + outcome via Anthropic. Falls back to canned on error."""
    if not config.has_anthropic():
        chunks = _canned_transcript(card, rs.parsed)
        await _emit_chunks(rs, card, chunks)
        return _canned_outcome(card)

    user_msg = (
        f"Property: {card.title} @ ${card.original_price}/night for {card.dates}. "
        f"Owner: {card.owner_phone}. Generate a believable, snappy 4-8 turn phone transcript "
        "where you negotiate. End with a JSON line on its own: "
        '{"accepted": bool, "discount_pct": number 0-0.3, "final_price": number, "summary": "..."}. '
        'Each transcript line should look like: "AGENT: ..." or "OWNER: ...".'
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as cx:
            r = await cx.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": config.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 700,
                    "system": NEGOTIATION_SYSTEM_PROMPT,
                    "messages": [{"role": "user", "content": user_msg}],
                },
            )
            r.raise_for_status()
            text = r.json()["content"][0]["text"]
    except Exception:
        chunks = _canned_transcript(card, rs.parsed)
        await _emit_chunks(rs, card, chunks)
        return _canned_outcome(card)

    chunks: list[dict] = []
    outcome: dict | None = None
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("{"):
            try:
                outcome = json.loads(line)
            except Exception:
                pass
            continue
        m = re.match(r"(AGENT|OWNER)\s*[:\-]\s*(.+)", line, flags=re.I)
        if m:
            chunks.append({"role": m.group(1).lower(), "text": m.group(2).strip()})

    if not chunks:
        chunks = _canned_transcript(card, rs.parsed)
    await _emit_chunks(rs, card, chunks)

    if not outcome:
        outcome = _canned_outcome(card)
    # Normalize
    outcome.setdefault("accepted", True)
    outcome.setdefault("discount_pct", 0.0)
    outcome.setdefault("final_price", card.original_price * (1 - float(outcome.get("discount_pct", 0))))
    outcome.setdefault("summary", "Call complete.")
    return outcome


async def _call_one(rs: RunState, card: Card, real_call_for: str | None) -> None:
    # Stagger ring start slightly so phones all pulse but don't return identically
    await asyncio.sleep(random.uniform(0.0, 1.0))
    card.call_started = True
    await store.bus.publish(rs.run_id, "call_started", {"card_id": card.card_id})

    # cache_first replay
    if config.is_cache_first() and not rs.fresh:
        cached = cache.load_call(rs.query, card.card_id)
        if cached:
            await _emit_chunks(rs, card, cached.get("chunks", []))
            outcome = cached.get("outcome", _canned_outcome(card))
            await _finalize(rs, card, outcome)
            return

    # Random call duration 3-15s — handled via the chunk pacing
    if real_call_for == card.card_id and config.AGENTPHONE_API_KEY and config.REAL_DEMO_NUMBER:
        # Lazy import so missing httpx envs don't crash mock mode
        from integrations import agentphone

        try:
            outcome = await agentphone.run_call(rs, card)
        except Exception:
            outcome = await _run_llm_call(rs, card)
    else:
        outcome = await _run_llm_call(rs, card)

    # cache_first save (chunks were recorded onto card.transcript by _emit_chunks)
    if config.is_cache_first():
        cache.save_call(
            rs.query,
            card.card_id,
            {"chunks": card.transcript, "outcome": outcome},
        )

    await _finalize(rs, card, outcome)


async def _finalize(rs: RunState, card: Card, outcome: dict) -> None:
    card.call_finished = True
    card.accepted = bool(outcome.get("accepted", True))
    card.discount_pct = float(outcome.get("discount_pct", 0.0))
    card.final_price = float(outcome.get("final_price", card.original_price))
    card.summary = str(outcome.get("summary", ""))
    await store.bus.publish(
        rs.run_id,
        "call_finished",
        {
            "card_id": card.card_id,
            "accepted": card.accepted,
            "original_price": card.original_price,
            "final_price": card.final_price,
            "discount_pct": card.discount_pct,
            "summary": card.summary,
        },
    )


async def run_calls(rs: RunState) -> None:
    await store.bus.publish(rs.run_id, "phase", {"phase": "calling"})

    # Choose at most ONE card to dial the real demo number, if configured
    real_call_for: str | None = None
    if config.AGENTPHONE_API_KEY and config.REAL_DEMO_NUMBER and not config.is_mock():
        # Pick the first card; predictable for demo
        first = next(iter(rs.cards.values()), None)
        if first is not None:
            real_call_for = first.card_id

    await asyncio.gather(*[_call_one(rs, c, real_call_for) for c in list(rs.cards.values())])
