/**
 * Query key factory for the flow domain.
 *
 * Per spec §7: all keys live under `['flow', ...]` so a single
 * `invalidateQueries({ queryKey: flowKeys.all })` clears every cached value
 * tied to the in-flight search/scoring lifecycle.
 *
 * Defined with a local `all` so the per-endpoint keys mechanically extend it
 * — adding a new prefix segment never gets out of sync.
 */
const all = ['flow'] as const;

export const flowKeys = {
  all,
  search: (q: string) => [...all, 'search', q] as const,
  scoring: (offerIds: readonly string[]) =>
    [...all, 'scoring', offerIds] as const,
} as const;
