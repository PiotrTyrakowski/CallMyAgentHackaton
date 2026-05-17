import type { BrowserUseProvider } from "./types";
import { makeOffers } from "@/lib/mock-offers";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockBrowserUse: BrowserUseProvider = {
  async *searchOffers(_query: string) {
    const offers = makeOffers();
    for (const o of offers) {
      await sleep(140 + Math.random() * 140);
      yield o;
    }
  },
};
