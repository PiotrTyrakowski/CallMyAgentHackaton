"""Env-loaded config. Single import point for keys + DEMO_MODE."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


# Load .env from repo root, then api/.env if present
repo_root = Path(__file__).resolve().parent.parent
load_dotenv(repo_root / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")


DEMO_MODE = os.getenv("DEMO_MODE", "mock_only").strip()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
BROWSER_USE_API_KEY = os.getenv("BROWSER_USE_API_KEY", "").strip()
AGENTPHONE_API_KEY = os.getenv("AGENTPHONE_API_KEY", "").strip()
AGENTPHONE_AGENT_ID = os.getenv("AGENTPHONE_AGENT_ID", "").strip()
AGENTPHONE_CALL_URL = os.getenv("AGENTPHONE_CALL_URL", "https://api.agentphone.dev/v1/calls").strip()
REAL_DEMO_NUMBER = os.getenv("REAL_DEMO_NUMBER", "").strip()
SPONGE_API_KEY = os.getenv("SPONGE_API_KEY", "").strip()

CACHE_DIR = Path(__file__).resolve().parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)


def has_anthropic() -> bool:
    return bool(ANTHROPIC_API_KEY)


def is_mock() -> bool:
    return DEMO_MODE == "mock_only"


def is_live() -> bool:
    return DEMO_MODE == "live"


def is_cache_first() -> bool:
    return DEMO_MODE == "cache_first"
