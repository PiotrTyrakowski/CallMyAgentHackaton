import { clientOfferProvider } from "./clientOffers";
import { clientCallProvider } from "./clientCalls";
import { clientPaymentsProvider } from "./clientPayments";

// The factory is intentionally trivial on the client — every provider proxies
// to its respective /api/* route. The routes decide mock vs real based on
// which keys are present in the server env:
//   - BROWSERUSE_API_KEY            -> real browser-use scrape
//   - AGENTPHONE_API_KEY + AGENT_ID -> real AgentPhone outbound call
//   - SPONGE_API_KEY                -> real Sponge virtual-card checkout
// Without those, the routes fall back to local mocks so the demo runs offline.

export const offerProvider = clientOfferProvider;
export const callProvider = clientCallProvider;
export const paymentsProvider = clientPaymentsProvider;

export { MOCK_OFFERS } from "./mockOffers";
export type { OfferProvider } from "./OfferProvider";
export type { CallProvider } from "./CallProvider";
export type {
  PaymentsProvider,
  BookingRequest,
  BookingResult,
} from "./PaymentsProvider";
