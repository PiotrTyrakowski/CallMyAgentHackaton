"""Disk cache for scout results and call transcripts.

Cache key is sha256(query). Used in DEMO_MODE=cache_first so demos don't burn
Browser-Use / Anthropic credits on every dry-run.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import config


def key_for_query(query: str) -> str:
    return hashlib.sha256(query.strip().lower().encode()).hexdigest()[:16]


def _path(query: str, kind: str) -> Path:
    return config.CACHE_DIR / f"{kind}_{key_for_query(query)}.json"


def load_scout(query: str) -> list[dict] | None:
    p = _path(query, "scout")
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text())
    except Exception:
        return None


def save_scout(query: str, cards: list[dict]) -> None:
    _path(query, "scout").write_text(json.dumps(cards, indent=2))


def load_call(query: str, card_id: str) -> dict | None:
    p = config.CACHE_DIR / f"call_{key_for_query(query)}_{card_id}.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text())
    except Exception:
        return None


def save_call(query: str, card_id: str, outcome_and_transcript: dict) -> None:
    p = config.CACHE_DIR / f"call_{key_for_query(query)}_{card_id}.json"
    p.write_text(json.dumps(outcome_and_transcript, indent=2))
