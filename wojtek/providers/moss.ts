import type { MossProvider } from "./types";

/**
 * In-memory Moss stand-in. Same shape as the real adapter (providers/moss.real.ts)
 * so the call flow doesn't care which one is active. Used by default so the demo
 * works offline — flip PROVIDERS_MOSS=real once a Moss endpoint is wired up.
 */
const store = new Map<string, { data: unknown; ts: number }>();

export const mockMoss: MossProvider = {
  async store(key: string, data: unknown) {
    store.set(key, { data, ts: Date.now() });
  },

  async query(q: string) {
    const out: unknown[] = [];
    for (const [k, v] of store) {
      if (k.includes(q) || JSON.stringify(v.data).includes(q)) {
        out.push(v.data);
      }
    }
    return out.slice(-10).reverse();
  },
};
