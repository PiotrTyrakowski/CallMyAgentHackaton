import type { MossProvider } from "./types";

const cache = new Map<string, unknown>();

export const mockMoss: MossProvider = {
  async store(key: string, data: unknown) {
    cache.set(key, data);
  },
  async query(q: string) {
    const out: unknown[] = [];
    for (const [k, v] of cache) {
      if (k.includes(q)) out.push(v);
    }
    return out;
  },
};
