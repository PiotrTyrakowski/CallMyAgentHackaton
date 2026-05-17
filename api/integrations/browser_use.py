"""Browser-Use Cloud v3 wrapper. Looks up a single listing per call."""
from __future__ import annotations

import asyncio
import json
import re

import httpx

import config


BASE = "https://api.browser-use.com/api/v3"


PROMPT_TMPL = (
    "Go to airbnb.com OR booking.com and find ONE listing matching: "
    "location={location}, dates={date_start} to {date_end}, "
    "budget around ${budget_per_night}/night, capacity {capacity}. "
    "Pick a listing different from common ones — vary your choice with seed={seed}. "
    "Return ONLY a JSON object with keys: title, price (number USD/night), "
    "photo_url (image URL), dates (string), capacity (integer), "
    "owner_contact (the contact-host link or pseudo phone), source ('airbnb' or 'booking'). "
    "No prose."
)


async def find_listing(parsed: dict, seed: int) -> dict:
    if not config.BROWSER_USE_API_KEY:
        raise RuntimeError("BROWSER_USE_API_KEY not set")

    task = PROMPT_TMPL.format(seed=seed, **parsed)

    async with httpx.AsyncClient(timeout=120.0) as cx:
        r = await cx.post(
            f"{BASE}/sessions",
            headers={"Authorization": f"Bearer {config.BROWSER_USE_API_KEY}"},
            json={"task": task},
        )
        r.raise_for_status()
        session_id = r.json()["id"]

        # poll
        for _ in range(60):
            await asyncio.sleep(2)
            s = await cx.get(
                f"{BASE}/sessions/{session_id}",
                headers={"Authorization": f"Bearer {config.BROWSER_USE_API_KEY}"},
            )
            s.raise_for_status()
            sd = s.json()
            if sd.get("status") in ("completed", "finished", "done"):
                output = sd.get("output") or sd.get("result") or ""
                if isinstance(output, dict):
                    listing = output
                else:
                    m = re.search(r"\{.*\}", str(output), flags=re.S)
                    listing = json.loads(m.group(0)) if m else {}
                # normalize
                return {
                    "title": listing.get("title", "Listing"),
                    "photo_url": listing.get("photo_url", "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600"),
                    "original_price": float(listing.get("price", parsed.get("budget_per_night", 400))),
                    "dates": listing.get("dates", f"{parsed.get('date_start')}–{parsed.get('date_end')}"),
                    "capacity": int(listing.get("capacity", 3)),
                    "owner_phone": str(listing.get("owner_contact", "+14155550100")),
                    "source": listing.get("source", "airbnb"),
                    "owner_name": "Host",
                }
            if sd.get("status") in ("failed", "error"):
                raise RuntimeError(f"browser-use session failed: {sd}")

    raise RuntimeError("browser-use session timed out")
