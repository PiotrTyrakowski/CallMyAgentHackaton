import { mockOfferProvider } from "./mockOffers";
import { mockCallProvider } from "./mockCalls";

const USE_MOCK = true;

export const offerProvider = USE_MOCK ? mockOfferProvider : mockOfferProvider;
export const callProvider = USE_MOCK ? mockCallProvider : mockCallProvider;

export { MOCK_OFFERS } from "./mockOffers";
export type { OfferProvider } from "./OfferProvider";
export type { CallProvider } from "./CallProvider";
