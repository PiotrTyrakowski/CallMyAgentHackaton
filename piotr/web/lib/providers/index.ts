import { devOfferProvider } from "./devOffers";
import { devCallProvider } from "./devCalls";
import { devBookingProvider } from "./devBooking";
import { prodBookingProvider } from "./prodBooking";
import { prodCallProvider } from "./prodCalls";
import { prodOfferProvider } from "./prodOffers";

// Provider factory. Defaults to dev providers (in-process fixtures) so the app
// boots without any third-party credentials configured; flip the PROVIDERS_*
// env flags to "prod" to swap in the live adapters without touching call-site
// code. Prod adapters:
//   - prodOffers.ts   — parallel Browser-Use sessions across SF neighborhoods
//   - prodCalls.ts    — AgentPhone outbound with negotiation prompt
//   - prodBooking.ts  — Sponge per-transaction virtual cards with merchant lock

export const offerProvider =
  process.env.PROVIDERS_OFFERS === "prod"
    ? prodOfferProvider
    : devOfferProvider;

export const callProvider =
  process.env.PROVIDERS_CALLS === "prod"
    ? prodCallProvider
    : devCallProvider;

export const bookingProvider =
  process.env.PROVIDERS_BOOKING === "prod"
    ? prodBookingProvider
    : devBookingProvider;

export { DEV_OFFERS } from "./devOffers";
export type { OfferProvider } from "./OfferProvider";
export type { CallProvider } from "./CallProvider";
export type { BookingProvider, BookingAuthorization } from "./BookingProvider";
