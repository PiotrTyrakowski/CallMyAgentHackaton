import { queryOptions } from '@tanstack/react-query';
import { apiSearch } from '@/api/client';
import { flowKeys } from './keys';

/**
 * Single source of truth for the search query.
 *
 * Used by both:
 * - the TanStack Router loader (`queryClient.ensureQueryData(searchQueryOptions(q))`)
 *   for prefetch / blocking navigation, and
 * - the component (`useSuspenseQuery(searchQueryOptions(q))`) for render.
 *
 * `enabled: q.length > 0` short-circuits the empty-string render that happens
 * on the idle route before the user submits a query.
 */
export function searchQueryOptions(q: string) {
  return queryOptions({
    queryKey: flowKeys.search(q),
    queryFn: ({ signal }) => apiSearch(q, { signal }),
    // Searches are expensive (LLM rewriting + multi-source aggregation in
    // prod) and result sets are cheap to recompute on demand. 5 min keeps
    // the back-button instant without hiding fresh inventory for long.
    staleTime: 5 * 60_000,
    enabled: q.length > 0,
  });
}
