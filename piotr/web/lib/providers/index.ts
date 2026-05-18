import { devOfferProvider } from "./devOffers";
import { devCallProvider } from "./devCalls";
import { devBookingProvider } from "./devBooking";
import { prodBookingProvider } from "./prodBooking";
import { prodCallProvider } from "./prodCalls";
import { prodOfferProvider } from "./prodOffers";

// Each provider auto-detects on key presence: if the credentials for the live
// adapter are configured, the live adapter runs; otherwise the in-process dev
// adapter runs. Drop in a key → goes live. Remove it → back to dev. Matches
// the same convention as the Memory factory in lib/memory/index.ts.
//
// Live adapters:
//   - prodOffers.ts   — parallel Browser-Use sessions across SF neighborhoods
//   - prodCalls.ts    — AgentPhone outbound with negotiation prompt
//   - prodBooking.ts  — Sponge per-transaction virtual cards with merchant lock

export const offerProvider = process.env.BROWSERUSE_API_KEY
  ? prodOfferProvider
  : devOfferProvider;

export const callProvider =
  process.env.AGENTPHONE_API_KEY && process.env.AGENTPHONE_AGENT_ID
    ? prodCallProvider
    : devCallProvider;

export const bookingProvider = process.env.SPONGE_API_KEY
  ? prodBookingProvider
  : devBookingProvider;

export { DEV_OFFERS } from "./devOffers";
export type { OfferProvider } from "./OfferProvider";
export type { CallProvider } from "./CallProvider";
export type { BookingProvider, BookingAuthorization } from "./BookingProvider";
