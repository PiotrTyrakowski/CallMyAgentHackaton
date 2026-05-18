import { mockOfferProvider } from "./mockOffers";
import { mockCallProvider } from "./mockCalls";
import { agentPhoneCallProvider } from "./agentphoneCalls";
import { browserUseOfferProvider } from "./browseruseOffers";

// Provider factory. Default to local mocks so the demo runs offline; flip the
// PROVIDERS_* env flags to swap each piece in for its real adapter without
// touching call-site code. Real adapters are implemented in:
//   - browseruseOffers.ts  — parallel browser-use sessions across SF neighborhoods
//   - agentphoneCalls.ts   — AgentPhone outbound with negotiation prompt

export const offerProvider =
  process.env.PROVIDERS_OFFERS === "real"
    ? browserUseOfferProvider
    : mockOfferProvider;

export const callProvider =
  process.env.PROVIDERS_CALLS === "real"
    ? agentPhoneCallProvider
    : mockCallProvider;

export { MOCK_OFFERS } from "./mockOffers";
export type { OfferProvider } from "./OfferProvider";
export type { CallProvider } from "./CallProvider";
