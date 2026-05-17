import type { Offer } from "../types";

export interface OfferProvider {
  search(query: string): AsyncIterable<Offer>;
}
