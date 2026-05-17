import type { MossProvider } from "./types";

/**
 * REAL Moss adapter — not yet implemented.
 *
 * Moss = retrieval layer for production AI systems, <10ms search without
 * vector DBs. Built for browser/edge/on-device/cloud.
 *   → https://github.com/usemoss/moss
 *
 * Suggested usage in this project:
 *   - cache /api/search results keyed by query (next run is instant during demo)
 *   - feed AgentPhone transcripts in for retrieval during long calls
 *
 * Env: MOSS_API_KEY (or self-host)
 */
export const realMoss: MossProvider = {
  async store(_key, _data) {
    throw new Error(
      "realMoss not implemented — set PROVIDERS_MOSS=mock or wire it up in providers/moss.real.ts",
    );
  },
  async query(_q) {
    throw new Error("realMoss not implemented");
  },
};
