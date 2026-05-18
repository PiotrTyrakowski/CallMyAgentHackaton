# Call My Agent

**One prompt. Parallel search. Real phone calls. A scoped virtual card. Your trip books while you’re still in line for coffee.**

Booking a short stay shouldn’t be a part-time job. **Call My Agent** is a YC Hack build that treats vacation rental booking like delegating to a sharp friend: you describe the trip once; the system finds real listings, negotiates with hosts on the phone, ranks what comes back, and checks out with a one-shot card—no tab archaeology.

---

## The problem (why this still sucks in 2026)

- **Tab bankruptcy.** A “good” deal means Airbnb in a dozen windows, stale prices, and review rabbit holes—most people quit and take whatever the feed shows.
- **Hidden margin.** Hosts often discount on the phone for direct bookings because they’re not eating platform fees—but almost nobody makes _N_ outbound calls for a weekend trip.
- **Checkout trust.** Handing a random site your real card for a negotiated total is mentally expensive; people default back to the platform.

We built the smallest closed loop that captures **discovery → human negotiation → ranked decision → safe payment**.

---

## The insight

Scraping listings is table stakes. **The phone call is the product.** A poly-agent scrape tells you _what exists_; a voice agent gets you _a committed number_ from a human who can say yes. Pair that with **issuer-scoped virtual cards** and the user never over-exposes their primary card for a one-off deal.

---

## What you see (≈90 seconds)

| Act                             | What happens                                                                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. You prompt**               | Plain language: _“SF, Jun 16–18, ~$400/night, walkable to Mission.”_                                                                                       |
| **2. Research fans out**        | Headless browser agents scrape Airbnb in parallel across neighborhoods; real cards land with photos, prices, ratings.                                      |
| **3. Every owner gets a call**  | AI calls run concurrently; live transcripts stream in; the agent introduces itself, asks for a direct-booking discount. Nos and yeses arrive in real time. |
| **4. Tinder for the best deal** | The agent tiers offers (price × quality × negotiated discount), “swipes” away the worst, surfaces an **Agent’s Pick**—you can override.                    |
| **5. One tap to book**          | **Sponge** mints a virtual card locked to merchant + negotiated amount. _EASY BOOKING_ provisions in seconds; savings are explicit on the final screen.    |

Plug in API keys and the same path runs on live vendors; run without keys and the mocks keep the story fully clickable.

---

## Holler

- **User upside:** savings are explicit (`originalPrice − negotiatedPrice`) on the confirmation surface—not vibes.
- **Host upside:** direct bookings reclaim the ~15% that would’ve gone to the platform on many stays.
- **Moat-shaped layer:** price aggregation is a commodity; **commitment from a live human** over voice is not.
- **Safety-shaped layer:** just-in-time, **merchant- and amount-scoped** cards reduce leak risk versus dropping a saved card into an ad-hoc flow.

---

## The stack

| Sponsor | When it fires | What it does in this repo |
|---|---|---|
| **[browser-use](https://browser-use.com/) (W25)** | "Scanning rentals" phase | Spawns 8 parallel headless sessions—one per SF neighborhood—each scraping Airbnb against a structured JSON output schema. Sessions are staggered 250 ms apart to stay inside the API's per-second rate limit. Results stream into the grid card-by-card as sessions complete. `lib/providers/browseruseOffers.ts` |
| **[AgentPhone](https://agentphone.ai/) (P26, hackathon host)** | "Agents on the line" phase — the live price tickers | Fires one outbound call per listing simultaneously. Each call gets a per-offer system-prompt override: a negotiation playbook with voice/style rules, a direct-booking-fee angle, and a 90-second hard cap. The call transcript streams back over SSE; we regex-parse discount mentions (`"I can do 15% off"`) in real time and walk the price counter down on the card. `lib/providers/agentphoneCalls.ts` |
| **[Sponge](https://paysponge.com/) (W26)** | "Issue card & book" → "Booked!" | Issues a single-use virtual card scoped to `(merchant, negotiated_total)` at checkout. The card number, merchant lock, and charge ceiling are displayed before confirmation; after booking the last-4 surfaces on the confirmation screen as proof. Your real card is never transmitted. `lib/providers/spongePayments.ts` |
| **[AgentMail](https://agentmail.to/) (S25)** | Supply expansion — see below | Not wired yet, but the supply-side GTM answer. |
| Shell | — | Next.js 16 · React 19 · Tailwind v4 · `motion` — app UI, server-side SSE plumbing, real/mock auto-detect per route |

---

## Architecture: “drop in a key, it goes live”

Every integration follows the same shape:

```
lib/providers/
├── {service}Calls.ts        ← production adapter → vendor API
├── mock{Service}.ts         ← scripted local fallback
├── client{Service}.ts       ← browser fetch helper for `/api/*`
app/api/{search,call,book}/route.ts ← picks real vs mock per request
```

**No mock flag.** If the server env has the key, you get live behavior; if not, mocks keep judges and teammates unblocked. Keys never touch the client—only server routes.

```
BROWSERUSE_API_KEY            → real Airbnb scrape (browser-use W25)
AGENTPHONE_API_KEY            → AgentPhone API key (P26)
AGENTPHONE_AGENT_ID           → the voice-agent persona driving each call
AGENTPHONE_PHONE_MAP          → JSON map of offer.id → E.164 number, e.g.
                                 {"pacific-heights-suite":"+14155550101"}
AGENTPHONE_TEST_NUMBER        → fallback E.164 for any offer not in the map
SPONGE_API_KEY                → real virtual-card checkout (Sponge W26)
```

---

## Run it

```bash
npm install
npm run dev
# http://localhost:3000
```

Create `.env.local` with the keys you need (`BROWSERUSE_API_KEY`, `AGENTPHONE_API_KEY` + `AGENTPHONE_AGENT_ID`, `SPONGE_API_KEY`, etc.); omit a key to stay on mocks for that layer.

---

## Supply: what about hosts without a public phone?

Direct-booking phone numbers cover a real but incomplete slice of inventory — many platform listings hide them. The path forward is **browser-use + [AgentMail](https://agentmail.to/) (S25)**:

Every major short-term rental platform has an internal host-message channel. AgentMail gives our agent an email address that can originate platform-native messages and receive host replies. browser-use opens the listing's contact flow; AgentMail handles the async conversation thread. Same negotiation playbook, same price-tick UI — medium swaps from voice to text, latency stretches from seconds to minutes.

```
Phase 1 (this build) — voice-only
  ✓ Host has a public phone → 15-second outbound call → live price tick

Phase 2 — browser-use + AgentMail fallback
  No phone found → browser-use opens platform DM → AgentMail handles reply
  → discount lands in the same card UI, async
```

Voice wins on commitment speed (the host says yes or no in one call); text wins on coverage (every listing is addressable). We need both. Phase 2 collapses the "no phone" objection and makes every platform's full inventory addressable without scraping phone numbers off the open web.

---

## Intentional boundaries (honest scope)

- No accounts or persisted sessions—one-shot demo per browser.
- Single metro (SF); neighborhood fan-out is explicit and hard-coded.
- `/api/*` is internal plumbing, not a public product API.
- Airbnb-first: biggest inventory + negotiation gap; extra providers are ~adapter-sized if you extend.

---

## Team

**Call My Agent** — Michał, Piotr, Łukasz, Wojtek · YC Hack

Powered by [browser-use](https://browser-use.com/), [AgentPhone](https://agentphone.ai/), and [Sponge](https://paysponge.com/).
