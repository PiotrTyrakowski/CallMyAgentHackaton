"use client";
import type { Offer } from "../types";
import type { OfferProvider } from "./OfferProvider";

/**
 * Client-side offer provider. Always fetches /api/search; the API route is
 * the one that knows whether to run real browser-use or the mock, based on
 * the PROVIDERS_OFFERS env flag (server-only).
 *
 * This keeps API keys server-side and lets the client just consume an
 * AsyncIterable<Offer> exactly like the previous in-process providers.
 */

type ServerEvent =
  | { kind: "offer"; offer: Offer }
  | { kind: "done" }
  | { kind: "error"; message: string };

export const clientOfferProvider: OfferProvider = {
  async *search(query: string): AsyncIterable<Offer> {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const blocks = buf.split("\n\n");
      buf = blocks.pop() ?? "";
      for (const block of blocks) {
        const m = block.match(/^data: (.+)$/m);
        if (!m) continue;
        let evt: ServerEvent;
        try {
          evt = JSON.parse(m[1]);
        } catch {
          continue;
        }
        if (evt.kind === "offer") yield evt.offer;
        else if (evt.kind === "error") throw new Error(evt.message);
        else if (evt.kind === "done") return;
      }
    }
  },
};
