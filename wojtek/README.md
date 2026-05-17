# wojtek/ychack

Booking-negotiator demo for YC Hack — agent searches for stays, calls every
owner in parallel to negotiate, ranks the offers, and you pick the winner
through head-to-head PvP. The signature feature is the negotiated discount
highlighted on every card.

## Run

```bash
npm install
npm run dev
# http://localhost:3000
```

## Architecture

Everything talks to provider interfaces in `providers/` — flip mock to real
by setting `PROVIDERS_*=real` in `.env.local` and filling in the matching
`*.real.ts` adapter:

```
providers/
├── types.ts                    # interfaces (contract)
├── index.ts                    # factory — reads PROVIDERS_* env, selects mock/real
├── browseruse.{ts,real.ts}     # search; real adapter for the browser-use cloud API is implemented
├── agentphone.{ts,real.ts}     # negotiate call; real adapter is a stub
├── moss.{ts,real.ts}           # retrieval/cache; real adapter is a stub
└── payments.{ts,real.ts}       # x402 / mpp; real adapter is a stub
```

Copy `.env.example` → `.env.local` and add the keys you need.

## Flow

`idle → searching → spawning → calling → battle → tinder-deck → pvp → winner → booking → done`

All transitions auto-progress except for the PvP picks (the game itself) and
the final "EASY BOOKING" tap (the transaction confirmation).

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · Framer Motion · zustand ·
canvas-confetti · lucide-react.

State lives in `lib/store.ts`. API routes in `app/api/{search,call,book}` are
thin wrappers over the provider factory and stream over SSE.
