import type { BrowserUseProvider, SearchEvent } from "./types";
import { makeOffers } from "@/lib/mock-offers";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockBrowserUse: BrowserUseProvider = {
  async *searchOffers(_query: string): AsyncIterable<SearchEvent> {
    yield { kind: "status", status: "browsing", elapsedSeconds: 0 };
    const offers = makeOffers();
    for (const o of offers) {
      await sleep(140 + Math.random() * 140);
      yield { kind: "offer", offer: o };
    }
  },
};
