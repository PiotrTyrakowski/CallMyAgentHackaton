"""Scout agent: spawns listing cards.

- mock_only: yields fixture cards with staggered timing
- live / cache_first: dispatches Browser-Use Cloud v3 sessions in parallel

Emits `card_spawned` events as each card arrives.
"""
from __future__ import annotations

import asyncio
import json
import random
import time
from pathlib import Path

import config
import cache
from state import Card, RunState, store
from integrations import browser_use


FIXTURES_PATH = Path(__file__).resolve().parent.parent / "fixtures" / "sf_houses.json"


def _load_fixtures() -> list[dict]:
    return json.loads(FIXTURES_PATH.read_text())


def _assign_grid_cells(n: int) -> list[int]:
    cells = list(range(25))
    random.shuffle(cells)
    return cells[:n]


async def _emit_card(rs: RunState, raw: dict, cell: int, idx: int) -> Card:
    card = Card(
        card_id=f"c{idx}",
        source=raw.get("source", "fixture"),
        title=raw["title"],
        photo_url=raw["photo_url"],
        original_price=float(raw["original_price"]),
        final_price=float(raw["original_price"]),
        dates=raw.get("dates", f"{rs.parsed.get('date_start')}–{rs.parsed.get('date_end')}"),
        capacity=int(raw.get("capacity", 4)),
        owner_phone=raw.get("owner_phone", "+14155550100"),
        grid_cell=cell,
    )
    rs.cards[card.card_id] = card
    await store.bus.publish(
        rs.run_id,
        "card_spawned",
        {
            "card_id": card.card_id,
            "source": card.source,
            "title": card.title,
            "photo_url": card.photo_url,
            "price": card.original_price,
            "dates": card.dates,
            "capacity": card.capacity,
            "owner_phone": card.owner_phone,
            "owner_name": raw.get("owner_name", "Owner"),
            "grid_cell": card.grid_cell,
        },
    )
    return card


async def run_scout(rs: RunState) -> None:
    await store.bus.publish(rs.run_id, "phase", {"phase": "spawning"})

    # cache_first: replay if we have results for this query and user didn't force fresh
    if config.is_cache_first() and not rs.fresh:
        cached = cache.load_scout(rs.query)
        if cached:
            await _replay_cached(rs, cached)
            return

    if config.is_mock() or not config.BROWSER_USE_API_KEY:
        await _run_mock(rs)
    elif config.is_cache_first():
        await _run_live(rs)
        cache.save_scout(rs.query, [_card_to_dict(c) for c in rs.cards.values()])
    else:
        await _run_live(rs)


def _card_to_dict(c: Card) -> dict:
    return {
        "card_id": c.card_id,
        "source": c.source,
        "title": c.title,
        "photo_url": c.photo_url,
        "original_price": c.original_price,
        "dates": c.dates,
        "capacity": c.capacity,
        "owner_phone": c.owner_phone,
        "grid_cell": c.grid_cell,
    }


async def _replay_cached(rs: RunState, cached: list[dict]) -> None:
    cells = _assign_grid_cells(len(cached))
    for idx, raw in enumerate(cached):
        # preserve original grid_cell if present, else reshuffle
        raw_with_cell = {**raw, "grid_cell": raw.get("grid_cell", cells[idx])}
        await _emit_card(rs, raw_with_cell, raw_with_cell["grid_cell"], idx)
        await asyncio.sleep(0.08 + random.random() * 0.12)


async def _run_mock(rs: RunState) -> None:
    fixtures = _load_fixtures()
    random.shuffle(fixtures)
    fixtures = fixtures[:25]
    cells = _assign_grid_cells(len(fixtures))
    for idx, (raw, cell) in enumerate(zip(fixtures, cells)):
        await _emit_card(rs, raw, cell, idx)
        # stagger spawn for cinematic effect — total ~3s
        await asyncio.sleep(0.08 + random.random() * 0.12)


async def _run_live(rs: RunState) -> None:
    """Fire up to 25 Browser-Use scouts in parallel (capped concurrency)."""
    target_n = 25
    cells = _assign_grid_cells(target_n)
    sem = asyncio.Semaphore(5)
    results: list[dict] = []

    async def one(i: int) -> None:
        async with sem:
            t0 = time.time()
            try:
                listing = await browser_use.find_listing(rs.parsed, seed=i)
            except Exception as e:  # noqa: BLE001
                # fall back to a fixture so the slot fills
                fx = _load_fixtures()
                listing = fx[i % len(fx)]
                listing["_error"] = str(e)[:120]
            results.append(listing)
            await _emit_card(rs, listing, cells[i], i)
            # tiny stagger so animation is visible even if returns are bursty
            elapsed = time.time() - t0
            if elapsed < 0.05:
                await asyncio.sleep(0.05)

    await asyncio.gather(*[one(i) for i in range(target_n)])
