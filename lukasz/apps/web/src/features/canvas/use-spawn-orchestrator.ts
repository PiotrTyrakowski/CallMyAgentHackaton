import { offerId as toOfferId, type OfferId } from '@callmyagent/lib/ids';
import type { Offer } from '@callmyagent/lib/types';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { SearchResponse } from '@/api/schemas';
import { searchQueryOptions } from '@/queries/search-query-options';
import { useFlow } from '@/stores/flow/flow-store-provider';

/**
 * Decouples animation rhythm from network speed (spec §13). The route
 * loader has already primed the search cache; we just consume it with
 * Suspense and drip ids into the store on a stagger so the UI fades cards
 * in at a perceptible cadence instead of the whole batch popping at once.
 *
 * - Idempotent against StrictMode double-invoke: `appendOffer` ignores
 *   duplicate ids, `setOffer` is a write-through cache.
 * - Cleanup cancels every pending timer so navigating away mid-stagger
 *   doesn't leak future store writes.
 * - Only runs when the phase is `spawning` AND the in-store query matches
 *   the route param. Otherwise we'd race the next phase's render.
 */

const MIN_STAGGER_MS = 30;
const MAX_STAGGER_MS = 50;

function pickStagger() {
  return (
    MIN_STAGGER_MS +
    Math.floor(Math.random() * (MAX_STAGGER_MS - MIN_STAGGER_MS + 1))
  );
}

/**
 * Zod's `.optional()` infers `T | undefined`, but the lib's `Offer` type uses
 * the stricter `T?` shape (no explicit `undefined` under
 * `exactOptionalPropertyTypes`). Strip absent optionals so the cast is sound.
 */
function toOffer(
  raw: SearchResponse['offers'][number],
  id: OfferId,
): Offer {
  const { hostName, hostPhone, ...rest } = raw;
  return {
    ...rest,
    id,
    ...(hostName !== undefined ? { hostName } : {}),
    ...(hostPhone !== undefined ? { hostPhone } : {}),
  };
}

export function useSpawnOrchestrator(query: string) {
  // Suspense throws to the parent boundary until the loader's prefetch resolves;
  // by the time this runs synchronously, `data` is guaranteed defined.
  const { data } = useSuspenseQuery(searchQueryOptions(query));
  const appendOffer = useFlow((s) => s.appendOffer);
  const setOffer = useFlow((s) => s.setOffer);
  const markEmptyQuery = useFlow((s) => s.markEmptyQuery);
  const isSpawningThisQuery = useFlow(
    (s) => s.phase.name === 'spawning' && s.phase.query === query,
  );

  useEffect(() => {
    if (!isSpawningThisQuery) return;
    const offers = data.offers;
    if (offers.length === 0) {
      // Empty result set — bounce phase back to idle and raise the silly
      // empty flag so the `/q` and `/` routes can render `<SillyEmpty />`
      // instead of stranding the user in `spawning` (spec §6).
      markEmptyQuery();
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    for (const o of offers) {
      const id = toOfferId(o.id);
      const delay = elapsed;
      elapsed += pickStagger();
      const handle = setTimeout(() => {
        // Write the full Offer first so consumers reading the cache from
        // inside `appendOffer`'s subscriber notification already see it.
        setOffer(id, toOffer(o, id));
        appendOffer(id);
      }, delay);
      timers.push(handle);
    }

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [data, isSpawningThisQuery, appendOffer, setOffer, markEmptyQuery]);
}
