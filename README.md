# Call My Agent

> Booking should feel like asking a friend to handle it — not 30 tabs of price-comparing.

**Call My Agent** is a single prompt that books your trip. You tell it what you want, it scrapes the listings, calls every owner to negotiate, and books the winner. The whole loop runs while you grab a coffee.

This is the YC Hack submission — built around three sponsor tools wired into a real flow you can hold in one hand.

## The pitch

Today, getting a "good" deal on a vacation rental means opening Airbnb in fifteen tabs, comparing prices, reading 30 reviews per listing, sometimes DMing hosts to ask if the price is flexible. Most people don't bother — they accept whatever Airbnb shows them and overpay by 10-20%.

The other thing nobody does: actually call the host. Yet hosts will give discounts on the phone that they won't give on the platform. Direct bookings save the host the ~15% Airbnb fee, so there's real win-win money on the table — but the friction of "make N phone calls to total strangers in a foreign language" makes it not worth it for a 3-night stay.

We remove both friction points with a single agent that has a phone number.

## What it does (the 90-second demo)

1. **You type** what you want in plain language. Example: *"Find me a place in SF, June 16-18, around $400 a night, walkable to Mission."*
2. **Browser-use** fans out across SF neighborhoods, scraping Airbnb in parallel. Cards land on screen with real photos, real prices, real ratings.
3. **AgentPhone** calls every owner simultaneously. Each call has its own live transcript bubble. The agent introduces itself as Alex, says it'd happily book directly, asks for a discount. Some hosts say no. Some say yes. The discount badges pop in real time.
4. **Tinder-style Agent's Pick** — the agent ranks the offers and swipes through them: best one stays, others fly off. You can override.
5. **Sponge** issues a one-shot virtual card scoped to the merchant + negotiated amount. Tap *EASY BOOKING*, the card is provisioned in <2s, you're done.

End-to-end with real keys plugged in: under two minutes from prompt to confirmation, with measurable savings highlighted on the final screen.

## The stack

| Layer | Tool | What it does here |
|---|---|---|
| Listing discovery | [browser-use](https://browser-use.com/) | Parallel headless agents scraping Airbnb across neighborhoods |
| Outbound calling | [AgentPhone](https://agentphone.ai/) | LLM-driven phone calls with live transcript streaming over SSE |
| Payments | [Sponge](https://paysponge.com/) | Per-transaction virtual cards, scoped to a single merchant + amount |
| App shell | Next.js 16 (App Router), React 19, Tailwind v4 | UI, server routes, SSE plumbing |

## Architecture: "drop in a key, it goes live"

Every external service has the same two-file shape:

```
lib/providers/
├── {service}Calls.ts        ← real adapter, hits the vendor API
├── mock{Service}.ts         ← scripted local fallback
├── client{Service}.ts       ← browser-side fetch wrapper for the API route
app/api/{search,call,book}/route.ts ← decides real vs mock at request time
```

The decision is **automatic**: if the server sees the corresponding env key, the real adapter runs. If the key is missing, the mock kicks in and the demo still works offline. There is no `USE_MOCK=true` flag to flip — the keys themselves are the switch.

```
BROWSERUSE_API_KEY            -> real Airbnb scrape
AGENTPHONE_API_KEY + AGENT_ID -> real outbound phone calls
SPONGE_API_KEY                -> real virtual-card checkout
```

API keys live only on the server. The client never sees them — it just fetches `/api/*` routes and consumes server-sent events.

## Running it

```bash
npm install
npm run dev
# http://localhost:3000
```

Out of the box, every layer runs as a mock — you get instant clickable demo with no API costs. To go live on one or more layers, copy `.env.example` to `.env.local` and uncomment the relevant key.

## Flow state machine

```
idle
  ↓ user submits query
researching        ── browser-use spawns N parallel sessions
  ↓ first offers stream in
cards_landed
  ↓
calling            ── AgentPhone dials every owner in parallel
  ↓ transcripts + discount badges stream in
tiering
  ↓ score by price × rating × negotiated discount
eliminating_red    ── worst tier flies off the screen
eliminating_norm
  ↓
agent_pick         ── tinder-style: AI picks the winner, you can override
  ↓
winner
  ↓ tap EASY BOOKING
booking            ── Sponge issues a virtual card scoped to merchant + total
  ↓
booked
```

Each transition is instrumented; you can see the state machine in `lib/flow/machine.ts`.

## What's deliberately not in here

- A login / account system. The demo is one-shot per browser session.
- Multi-city support. SF only — the parallel neighborhood split is hard-coded.
- A user-facing API. The `/api/*` routes are internal plumbing, not public.
- Hotel chains, Booking.com, VRBO. We picked Airbnb because the inventory and the negotiation-by-phone friction are biggest there. Adding adapters is a 30-line file each.

## Why this is a real product, not a hackathon toy

- The agent saves the user real money — measured as `originalPrice − negotiatedPrice` on the final screen.
- The agent saves the host real money too — they pocket the ~15% Airbnb fee they'd otherwise lose on direct bookings.
- The phone-call layer is the moat. Scraping prices is a commodity; getting a human on the line to commit to a number is what closes the gap.
- The Sponge virtual-card layer means we never touch user card details ourselves. Cards are minted just-in-time, scoped to the merchant + amount; if the booking fails, the card never charges.

## Credits

Built at YC Hack by team **Call My Agent**: Michał, Piotr, Łukasz, Wojtek.
Powered by [browser-use](https://browser-use.com/), [AgentPhone](https://agentphone.ai/), and [Sponge](https://paysponge.com/).
