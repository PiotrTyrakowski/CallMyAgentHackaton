"use client";
import type { CallEvent, Offer } from "../types";
import type { CallProvider } from "./CallProvider";

/**
 * Client-side call provider. Always proxies to /api/call; the route is what
 * decides between mock and real AgentPhone based on whether the AgentPhone
 * keys are present in the server env. Keeps secrets out of the browser bundle.
 */

type ServerEvent =
  | CallEvent
  | { kind: "done" }
  | { kind: "error"; message: string };

export const clientCallProvider: CallProvider = {
  async *call(offer: Offer): AsyncIterable<CallEvent> {
    const res = await fetch("/api/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer }),
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
        if ("offerId" in evt) yield evt;
        else if ("kind" in evt && evt.kind === "error") {
          throw new Error(evt.message);
        } else if ("kind" in evt && evt.kind === "done") {
          return;
        }
      }
    }
  },
};
