import type { CallEvent, Offer } from "../types";

export interface CallProvider {
  call(offer: Offer): AsyncIterable<CallEvent>;
}
