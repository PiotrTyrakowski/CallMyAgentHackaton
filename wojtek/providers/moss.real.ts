import type { MossProvider } from "./types";

/**
 * REAL Moss adapter — retrieval layer for production AI systems.
 * <10ms search without vector databases. We use it as an AgentPhone harness
 * per the YCHack brief:
 *   https://github.com/usemoss/moss/tree/main/examples/cookbook/agentphone
 *
 * Two integration points in this app:
 *   1. Pre-call enrichment — query prior negotiations in the same neighborhood
 *      so the AgentPhone agent has live market context in its system prompt.
 *   2. Post-call storage — persist each call's outcome (negotiated discount,
 *      transcript) so the next call gets smarter.
 *
 * Env:
 *   MOSS_ENDPOINT  default https://api.usemoss.com/v1
 *   MOSS_API_KEY
 *   MOSS_INDEX     default ychack-booker
 */

const BASE = process.env.MOSS_ENDPOINT ?? "https://api.usemoss.com/v1";
const INDEX = process.env.MOSS_INDEX ?? "ychack-booker";

async function moss<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const key = process.env.MOSS_API_KEY;
  if (!key) throw new Error("MOSS_API_KEY missing");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`moss ${res.status} ${path}: ${txt.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export const realMoss: MossProvider = {
  async store(key: string, data: unknown) {
    await moss(`/indexes/${INDEX}/documents`, {
      method: "POST",
      body: JSON.stringify({
        id: key,
        content: typeof data === "string" ? data : JSON.stringify(data),
        metadata: { ts: Date.now() },
      }),
    });
  },

  async query(q: string) {
    try {
      const res = await moss<{ results?: Array<{ content?: string }> }>(
        `/indexes/${INDEX}/search?q=${encodeURIComponent(q)}&limit=10`,
      );
      return (res.results ?? [])
        .map((r) => {
          try {
            return r.content ? JSON.parse(r.content) : null;
          } catch {
            return r.content;
          }
        })
        .filter((x): x is unknown => x != null);
    } catch {
      return [];
    }
  },
};
