"""Top-level run coroutine: ties all agent phases together."""
from __future__ import annotations

import asyncio

from agents import booking, caller, query_parser, scout, tournament
from agents import filter as filt
from state import RunState, store


async def run_pipeline(rs: RunState) -> None:
    try:
        rs.parsed = await query_parser.parse_query(rs.query)
        await store.bus.publish(rs.run_id, "query_parsed", rs.parsed)

        await scout.run_scout(rs)
        await caller.run_calls(rs)
        await filt.run_filter(rs)
        winner_id = await tournament.run_tournament(rs)
        # Wait for the frontend to press EASY BOOKING (it calls /book endpoint).
        # That endpoint sets the booking_future; we await it here.
        rs.booking.setdefault("future", asyncio.get_event_loop().create_future())
        await rs.booking["future"]
        await booking.run_booking(rs, winner_id)
    except Exception as e:  # noqa: BLE001
        rs.error = str(e)
        await store.bus.publish(rs.run_id, "phase", {"phase": "error", "detail": str(e)[:200]})


def trigger_booking(rs: RunState) -> bool:
    fut = rs.booking.get("future")
    if fut and not fut.done():
        fut.set_result(True)
        return True
    return False
