import { localOfferProvider } from "./mockOffers";
import { localCallProvider } from "./mockCalls";
import { agentPhoneCallProvider } from "./agentphoneCalls";
import { browserUseOfferProvider } from "./browseruseOffers";

// Provider factory. Defaults to in-process fixtures so the app boots without
// any third-party credentials configured; flip the PROVIDERS_* env flags to
// swap each piece in for its live adapter without touching call-site code.
// Live adapters:
//   - browseruseOffers.ts  — parallel Browser-Use sessions across SF neighborhoods
//   - agentphoneCalls.ts   — AgentPhone outbound with negotiation prompt

export const offerProvider =
  process.env.PROVIDERS_OFFERS === "real"
    ? browserUseOfferProvider
    : localOfferProvider;

export const callProvider =
  process.env.PROVIDERS_CALLS === "real"
    ? agentPhoneCallProvider
    : localCallProvider;

export { CATALOG_OFFERS } from "./mockOffers";
export type { OfferProvider } from "./OfferProvider";
export type { CallProvider } from "./CallProvider";
