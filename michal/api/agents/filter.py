"""Filter agent: hard-filter + ranking to top 8 for tournament."""
from __future__ import annotations

import asyncio

from state import RunState, store


TOP_N = 8


async def run_filter(rs: RunState) -> None:
    await store.bus.publish(rs.run_id, "phase", {"phase": "filtering"})
    budget = float(rs.parsed.get("budget_per_night", 400))
    capacity = int(rs.parsed.get("capacity", 1))

    passing = []
    for card in rs.cards.values():
        reasons = []
        if not card.accepted:
            reasons.append("owner declined")
        if card.final_price > budget * 1.05:
            reasons.append(f"over budget (${card.final_price:.0f} > ${budget:.0f})")
        if card.capacity < capacity:
            reasons.append(f"capacity {card.capacity} < {capacity}")

        passed = not reasons
        card.passed = passed
        card.reject_reason = ", ".join(reasons)
        card.score = card.discount_pct * 2.0 + max(0.0, (budget - card.final_price) / max(1.0, budget))

        await store.bus.publish(
            rs.run_id,
            "card_filtered",
            {
                "card_id": card.card_id,
                "passed": passed,
                "reason": card.reject_reason,
                "score": round(card.score, 3),
            },
        )
        if passed:
            passing.append(card)
        # tiny stagger so red fly-offs cascade
        await asyncio.sleep(0.04)

    passing.sort(key=lambda c: c.score, reverse=True)
    top = passing[:TOP_N]
    # Mark cards beyond top_n as not passing so UI can fade them too
    for card in passing[TOP_N:]:
        card.passed = False
        card.reject_reason = "outside top 8"
        await store.bus.publish(
            rs.run_id,
            "card_filtered",
            {
                "card_id": card.card_id,
                "passed": False,
                "reason": card.reject_reason,
                "score": round(card.score, 3),
            },
        )

    # Give the UI a moment to render the red-card flash + fly-off before tournament
    await asyncio.sleep(1.4)

    # Announce the tournament lineup so the UI can stack them center
    await store.bus.publish(
        rs.run_id,
        "tournament_lineup",
        {"card_ids": [c.card_id for c in top]},
    )
    rs.tournament.challengers = [c.card_id for c in top]
