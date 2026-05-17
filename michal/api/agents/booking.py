"""Booking agent: Sponge tap + owner confirmation call."""
from __future__ import annotations

import asyncio

import config
from state import RunState, store
from integrations import sponge


async def run_booking(rs: RunState, winner_id: str) -> None:
    await store.bus.publish(rs.run_id, "phase", {"phase": "booking"})
    card = rs.cards.get(winner_id)
    if not card:
        rs.error = "Winner card not found."
        await store.bus.publish(rs.run_id, "phase", {"phase": "error"})
        return

    # Step 1: charge
    await store.bus.publish(
        rs.run_id,
        "booking_step",
        {"step": "charging", "detail": f"Tapping Sponge for $0.01 to hold ${card.final_price:.0f}/night booking..."},
    )
    await asyncio.sleep(0.6)
    receipt = await sponge.tap_one_cent()
    await store.bus.publish(
        rs.run_id,
        "booking_step",
        {"step": "charged", "detail": f"Receipt: {receipt.get('id', 'mock-receipt')}"},
    )

    # Step 2: confirmation call
    await store.bus.publish(
        rs.run_id,
        "booking_step",
        {"step": "calling_owner", "detail": f"Calling {card.title} owner to confirm dates {card.dates}..."},
    )
    await asyncio.sleep(1.2)
    await store.bus.publish(
        rs.run_id,
        "booking_step",
        {"step": "confirmed", "detail": f"Booked {card.title} at ${card.final_price:.0f}/night ({int(card.discount_pct * 100)}% off)."},
    )

    rs.booking = {
        "card_id": card.card_id,
        "amount_charged": 0.01,
        "final_price_per_night": card.final_price,
        "discount_pct": card.discount_pct,
        "receipt_id": receipt.get("id", "mock-receipt"),
    }
    await store.bus.publish(rs.run_id, "phase", {"phase": "done"})
