/**
 * Moss harness — retrieval layer for production AI systems.
 *   https://github.com/usemoss/moss
 *
 * Two integration points in this app:
 *   1. Pre-call enrichment — query prior negotiations in the same neighborhood
 *      so the AgentPhone agent has live market context in its system prompt.
 *   2. Post-call storage — persist each call's outcome (negotiated discount,
 *      transcript) so the next call gets smarter.
 *
 * Default to an in-memory implementation so the local demo runs without
 * external dependencies; flip MOSS_API_KEY in env to use the real endpoint.
 */

export interface MossClient {
  store(key: string, data: unknown): Promise<void>;
  query(q: string): Promise<unknown[]>;
}

const BASE = process.env.MOSS_ENDPOINT ?? "https://api.usemoss.com/v1";
const INDEX = process.env.MOSS_INDEX ?? "ychack-booker";

class RealMoss implements MossClient {
  constructor(private apiKey: string) {}
  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      throw new Error(`moss ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }
  async store(key: string, data: unknown) {
    await this.req(`/indexes/${INDEX}/documents`, {
      method: "POST",
      body: JSON.stringify({
        id: key,
        content: typeof data === "string" ? data : JSON.stringify(data),
        metadata: { ts: Date.now() },
      }),
    });
  }
  async query(q: string) {
    const res = await this.req<{ results?: Array<{ content?: string }> }>(
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
  }
}

class MemoryMoss implements MossClient {
  private store_ = new Map<string, { data: unknown; ts: number }>();
  async store(key: string, data: unknown) {
    this.store_.set(key, { data, ts: Date.now() });
  }
  async query(q: string) {
    const out: unknown[] = [];
    for (const [k, v] of this.store_) {
      if (k.includes(q) || JSON.stringify(v.data).includes(q)) {
        out.push(v.data);
      }
    }
    return out.slice(-10).reverse();
  }
}

export const moss: MossClient = process.env.MOSS_API_KEY
  ? new RealMoss(process.env.MOSS_API_KEY)
  : new MemoryMoss();
