"""RunState + EventBus. Single source of truth for a query run."""
from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Literal, Optional


Phase = Literal[
    "spawning",
    "calling",
    "filtering",
    "tournament",
    "booking",
    "done",
    "error",
]


@dataclass
class Card:
    card_id: str
    source: str  # "airbnb" | "booking" | "fixture"
    title: str
    photo_url: str
    original_price: float
    final_price: float
    dates: str
    capacity: int
    owner_phone: str
    grid_cell: int  # 0..24 for 5x5
    # call lifecycle
    call_started: bool = False
    call_finished: bool = False
    accepted: bool = False
    discount_pct: float = 0.0
    transcript: list[dict] = field(default_factory=list)
    summary: str = ""
    # filter
    passed: Optional[bool] = None
    reject_reason: str = ""
    score: float = 0.0


@dataclass
class TournamentState:
    champion_id: Optional[str] = None
    challengers: list[str] = field(default_factory=list)
    round: int = 0
    awaiting_pick: bool = False
    pick_future: Optional[asyncio.Future] = None
    winner_id: Optional[str] = None


@dataclass
class RunState:
    run_id: str
    query: str
    fresh: bool
    phase: Phase = "spawning"
    parsed: dict = field(default_factory=dict)
    cards: dict[str, Card] = field(default_factory=dict)
    tournament: TournamentState = field(default_factory=TournamentState)
    booking: dict = field(default_factory=dict)
    error: str = ""
    started_at: float = field(default_factory=time.time)


class EventBus:
    """Per-run async pub/sub. SSE consumers subscribe; agents publish."""

    def __init__(self) -> None:
        self._queues: dict[str, list[asyncio.Queue]] = {}
        self._history: dict[str, list[dict]] = {}

    def _register(self, run_id: str, q: asyncio.Queue) -> None:
        self._queues.setdefault(run_id, []).append(q)

    def _unregister(self, run_id: str, q: asyncio.Queue) -> None:
        if run_id in self._queues and q in self._queues[run_id]:
            self._queues[run_id].remove(q)

    async def publish(self, run_id: str, event_type: str, payload: dict[str, Any]) -> None:
        ev = {"type": event_type, "data": payload, "t": time.time()}
        self._history.setdefault(run_id, []).append(ev)
        for q in self._queues.get(run_id, []):
            await q.put(ev)

    async def subscribe(self, run_id: str) -> AsyncIterator[dict]:
        q: asyncio.Queue = asyncio.Queue()
        # replay history so a late connection still sees prior events
        for ev in self._history.get(run_id, []):
            await q.put(ev)
        self._register(run_id, q)
        try:
            while True:
                ev = await q.get()
                yield ev
                if ev["type"] == "phase" and ev["data"].get("phase") in ("done", "error"):
                    return
        finally:
            self._unregister(run_id, q)


class Store:
    """In-memory store of RunState. Single-process only — fine for hackathon."""

    def __init__(self) -> None:
        self.runs: dict[str, RunState] = {}
        self.bus = EventBus()

    def new_run(self, query: str, fresh: bool) -> RunState:
        run_id = uuid.uuid4().hex[:12]
        rs = RunState(run_id=run_id, query=query, fresh=fresh)
        self.runs[run_id] = rs
        return rs

    def get(self, run_id: str) -> Optional[RunState]:
        return self.runs.get(run_id)


store = Store()
