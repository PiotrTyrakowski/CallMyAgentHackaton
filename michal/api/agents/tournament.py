"""Tournament agent: king-of-the-hill 2-card PVP.

Holds the current champion + remaining challengers. Emits `tournament_pair`,
awaits the frontend's `POST /run/{id}/pick`, advances. 7 rounds → winner.
"""
from __future__ import annotations

import asyncio

from state import RunState, store


async def run_tournament(rs: RunState) -> str:
    await store.bus.publish(rs.run_id, "phase", {"phase": "tournament"})

    t = rs.tournament
    if not t.challengers:
        # nothing survived filtering — abort
        await store.bus.publish(rs.run_id, "phase", {"phase": "error"})
        rs.error = "No listings survived filtering."
        return ""

    if len(t.challengers) == 1:
        winner_id = t.challengers[0]
        t.winner_id = winner_id
        await store.bus.publish(rs.run_id, "tournament_winner", {"card_id": winner_id})
        return winner_id

    # First champion is the highest-scoring (already sorted by filter.py)
    t.champion_id = t.challengers[0]
    queue = t.challengers[1:]

    loop = asyncio.get_event_loop()
    while queue:
        challenger_id = queue.pop(0)
        t.round += 1
        t.awaiting_pick = True
        t.pick_future = loop.create_future()
        await store.bus.publish(
            rs.run_id,
            "tournament_pair",
            {
                "round": t.round,
                "left_id": t.champion_id,
                "right_id": challenger_id,
                "remaining": len(queue),
            },
        )
        winner = await t.pick_future
        t.awaiting_pick = False
        # winner is the id picked by the user
        if winner == challenger_id:
            t.champion_id = challenger_id
            await store.bus.publish(rs.run_id, "tournament_advance", {"new_champion": challenger_id})

    t.winner_id = t.champion_id
    await store.bus.publish(rs.run_id, "tournament_winner", {"card_id": t.winner_id})
    return t.winner_id or ""


def submit_pick(rs: RunState, winner_id: str) -> bool:
    t = rs.tournament
    if not t.awaiting_pick or t.pick_future is None or t.pick_future.done():
        return False
    t.pick_future.set_result(winner_id)
    return True
