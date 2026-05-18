import type { CallContext } from "../memory";
import type { CallEvent, Offer } from "../types";

export interface CallProvider {
  // `context` is optional so adapters that don't need user-preference injection
  // (eg. local mock) can ignore it. The real AgentPhone adapter folds the
  // user's preferences and the geo facts about the offer's neighborhood into
  // the negotiation system prompt.
  call(offer: Offer, context?: CallContext): AsyncIterable<CallEvent>;
}
