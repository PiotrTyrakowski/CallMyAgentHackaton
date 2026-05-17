"""Sponge wallet client. Real $0.01 tap when SPONGE_API_KEY is set."""
from __future__ import annotations

import time

import httpx

import config


async def tap_one_cent() -> dict:
    """Charge $0.01 from the configured Sponge sandbox wallet.

    Falls back to a mock receipt when no key is set, so the demo always works.
    """
    if not config.SPONGE_API_KEY or config.is_mock():
        return {"id": f"mock-{int(time.time())}", "amount": 0.01, "mocked": True}

    try:
        async with httpx.AsyncClient(timeout=15.0) as cx:
            r = await cx.post(
                "https://api.paysponge.com/v1/wallet/transfer",
                headers={
                    "Authorization": f"Bearer {config.SPONGE_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "amount_usd": 0.01,
                    "memo": "Flow UI booking hold tap",
                },
            )
            r.raise_for_status()
            data = r.json()
            data.setdefault("id", f"sponge-{int(time.time())}")
            return data
    except Exception as e:  # noqa: BLE001
        return {"id": f"mock-fallback-{int(time.time())}", "amount": 0.01, "error": str(e)[:120]}
