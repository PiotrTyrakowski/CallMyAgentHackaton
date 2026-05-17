"""Parse a freeform query into structured criteria.

Accepts Polish/English/anything. Uses Anthropic if available, else a heuristic fallback
so the demo works even without an API key.
"""
from __future__ import annotations

import json
import re

import httpx

import config


SYSTEM = (
    "You convert short freeform housing-search queries into JSON. "
    "Return ONLY a JSON object with keys: "
    "location (string), date_start (string, e.g. 'May 16'), date_end (string), "
    "budget_per_night (number USD), capacity (integer), vibe (string, 1-3 words). "
    "If a field is unclear, infer a reasonable default. No prose."
)


def _heuristic(query: str) -> dict:
    q = query.lower()
    # budget
    budget = 400.0
    m = re.search(r"(\$|usd|budget|budzet)\s*(\d{2,5})", q)
    if m:
        budget = float(m.group(2))
    else:
        m = re.search(r"\b(\d{3,4})\b", q)
        if m:
            budget = float(m.group(1))
    # capacity
    cap = 4
    m = re.search(r"(\d+)\s*(person|people|guest|os[oó]b)", q)
    if m:
        cap = int(m.group(1))
    # location
    loc = "San Francisco"
    for hint in ["sf", "san francisco", "nyc", "new york", "lisbon", "lizbona"]:
        if hint in q:
            loc = "San Francisco" if "sf" in hint or "san" in hint else hint.title()
            break
    # dates: look for two numbers like 16-18
    date_start, date_end = "May 16", "May 18"
    m = re.search(r"(\d{1,2})\s*[–\-]\s*(\d{1,2})", q)
    if m:
        date_start, date_end = f"May {m.group(1)}", f"May {m.group(2)}"
    return {
        "location": loc,
        "date_start": date_start,
        "date_end": date_end,
        "budget_per_night": budget,
        "capacity": cap,
        "vibe": "cozy",
    }


async def parse_query(query: str) -> dict:
    if not config.has_anthropic():
        return _heuristic(query)
    try:
        async with httpx.AsyncClient(timeout=15.0) as cx:
            r = await cx.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": config.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 300,
                    "system": SYSTEM,
                    "messages": [{"role": "user", "content": query}],
                },
            )
            r.raise_for_status()
            text = r.json()["content"][0]["text"]
            # extract first {...} block defensively
            m = re.search(r"\{.*\}", text, flags=re.S)
            if m:
                return json.loads(m.group(0))
    except Exception:
        pass
    return _heuristic(query)
