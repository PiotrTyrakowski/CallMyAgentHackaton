"""FastAPI entry. Routes:
- POST /run                  -> start a run
- GET  /run/{id}/events      -> SSE stream
- POST /run/{id}/pick        -> tournament pick
- POST /run/{id}/book        -> trigger EASY BOOKING
- GET  /health
- + AgentPhone webhook (mounted from integrations.agentphone)
"""
from __future__ import annotations

import asyncio
import json

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

import config
from agents import tournament as tournament_agent
from integrations.agentphone import router as agentphone_router
from orchestrator import run_pipeline, trigger_booking
from state import store


app = FastAPI(title="Flow UI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agentphone_router)


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "mode": config.DEMO_MODE}


@app.post("/run")
async def start_run(req: Request) -> dict:
    body = await req.json()
    query = (body.get("query") or "").strip()
    fresh = bool(body.get("fresh", False))
    if not query:
        raise HTTPException(400, "missing query")
    rs = store.new_run(query, fresh)
    asyncio.create_task(run_pipeline(rs))
    return {"run_id": rs.run_id}


@app.get("/run/{run_id}/events")
async def events(run_id: str) -> StreamingResponse:
    rs = store.get(run_id)
    if not rs:
        raise HTTPException(404, "unknown run")

    async def gen():
        async for ev in store.bus.subscribe(run_id):
            data = json.dumps({"type": ev["type"], "data": ev["data"]})
            yield f"event: {ev['type']}\ndata: {data}\n\n"

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/run/{run_id}/pick")
async def pick(run_id: str, req: Request) -> dict:
    rs = store.get(run_id)
    if not rs:
        raise HTTPException(404, "unknown run")
    body = await req.json()
    winner_id = body.get("winner_id")
    if not winner_id:
        raise HTTPException(400, "missing winner_id")
    ok = tournament_agent.submit_pick(rs, winner_id)
    return {"ok": ok}


@app.post("/run/{run_id}/book")
async def book(run_id: str) -> dict:
    rs = store.get(run_id)
    if not rs:
        raise HTTPException(404, "unknown run")
    ok = trigger_booking(rs)
    return {"ok": ok}
