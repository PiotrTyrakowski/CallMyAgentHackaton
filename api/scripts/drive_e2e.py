"""Drive a full mock_only run end-to-end against a local API. Verification helper."""
import asyncio
import json
import sys

import httpx


BASE = "http://localhost:8000"


async def main() -> None:
    async with httpx.AsyncClient(timeout=60.0) as cx:
        r = await cx.post(f"{BASE}/run", json={"query": "Chce dom w SF 16-18 i budzet 400"})
        run_id = r.json()["run_id"]
        print(f"run_id={run_id}")

        events_seen = {
            "phase": [],
            "card_spawned": 0,
            "call_started": 0,
            "call_finished": 0,
            "card_filtered_pass": 0,
            "card_filtered_reject": 0,
            "tournament_pair": 0,
            "tournament_winner": None,
            "booking_step": [],
        }

        async def consume() -> None:
            async with cx.stream("GET", f"{BASE}/run/{run_id}/events") as resp:
                cur_type = None
                async for line in resp.aiter_lines():
                    if line.startswith("event:"):
                        cur_type = line[6:].strip()
                    elif line.startswith("data:"):
                        try:
                            payload = json.loads(line[5:].strip())["data"]
                        except Exception:
                            continue
                        if cur_type == "phase":
                            events_seen["phase"].append(payload["phase"])
                            if payload["phase"] in ("done", "error"):
                                return
                        elif cur_type == "card_spawned":
                            events_seen["card_spawned"] += 1
                        elif cur_type == "call_started":
                            events_seen["call_started"] += 1
                        elif cur_type == "call_finished":
                            events_seen["call_finished"] += 1
                        elif cur_type == "card_filtered":
                            if payload["passed"]:
                                events_seen["card_filtered_pass"] += 1
                            else:
                                events_seen["card_filtered_reject"] += 1
                        elif cur_type == "tournament_pair":
                            events_seen["tournament_pair"] += 1
                            # auto-pick left
                            asyncio.create_task(
                                cx.post(
                                    f"{BASE}/run/{run_id}/pick",
                                    json={"winner_id": payload["left_id"]},
                                )
                            )
                        elif cur_type == "tournament_winner":
                            events_seen["tournament_winner"] = payload["card_id"]
                            # trigger booking
                            asyncio.create_task(cx.post(f"{BASE}/run/{run_id}/book"))
                        elif cur_type == "booking_step":
                            events_seen["booking_step"].append(payload["step"])

        try:
            await asyncio.wait_for(consume(), timeout=60)
        except asyncio.TimeoutError:
            print("TIMEOUT")

        print(json.dumps(events_seen, indent=2))
        ok = (
            events_seen["card_spawned"] == 25
            and events_seen["call_finished"] == 25
            and events_seen["tournament_pair"] == 7
            and events_seen["tournament_winner"] is not None
            and "confirmed" in events_seen["booking_step"]
            and "done" in events_seen["phase"]
        )
        sys.exit(0 if ok else 1)


asyncio.run(main())
