# Flow UI — Agentic Housing Search

Hackathon demo: type a natural-language query → cinematic flow of scout → call → filter → tournament → book.

## Quickstart (mock_only, zero credits)

```bash
cp .env.example .env
# DEMO_MODE=mock_only is the default; ANTHROPIC_API_KEY is needed even in mock_only
#   for query parsing + transcript generation. If left blank, fully canned fixtures are used.

# api
cd api
uv sync
uv run uvicorn main:app --reload --port 8000

# web (in another terminal)
cd web
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Modes

- `DEMO_MODE=mock_only` — fixtures, no external paid calls.
- `DEMO_MODE=cache_first` — first run hits real APIs; subsequent runs replay.
- `DEMO_MODE=live` — always real.

For real AgentPhone calls you also need `ngrok http 8000` and set `PUBLIC_WEBHOOK_URL` to the ngrok HTTPS URL.

## Architecture

See `/Users/michalzajaczkowski/.claude/plans/i-want-flow-ui-fuzzy-wilkes.md`.

Backend (FastAPI) owns all state, streams events over SSE. Frontend (Next.js + Framer Motion) is a reducer over events.
