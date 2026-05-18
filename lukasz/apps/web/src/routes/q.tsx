import { createFileRoute, redirect } from '@tanstack/react-router';
import { Suspense, useEffect } from 'react';
import { z } from 'zod';
import { BookingPane } from '@/features/booking/booking-pane';
import { MasonryCanvas } from '@/features/canvas/masonry-canvas';
import { useSpawnOrchestrator } from '@/features/canvas/use-spawn-orchestrator';
import { PvPArena } from '@/features/pvp/pvp-arena';
import { SillyEmpty } from '@/features/query/silly-empty';
import { searchQueryOptions } from '@/queries/search-query-options';
import { useFlow } from '@/stores/flow/flow-store-provider';

const flowSearchSchema = z.object({ text: z.string().min(1) });

export const Route = createFileRoute('/q')({
  validateSearch: flowSearchSchema,
  // Bounce back to `/` when validation fails (e.g. `/q` with no `?text`).
  onError: () => {
    throw redirect({ to: '/' });
  },
  loaderDeps: ({ search: { text } }) => ({ text }),
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(searchQueryOptions(deps.text)),
  component: FlowView,
});

function FlowView() {
  const { text } = Route.useSearch();
  const lastQueryWasEmpty = useFlow((s) => s.lastQueryWasEmpty);
  // Empty result short-circuit (spec §6): skip the spawn driver entirely so we
  // don't loop submit → empty → submit again with the same cached response.
  if (lastQueryWasEmpty) {
    return (
      <main className="flex-1 relative">
        <SillyEmpty />
      </main>
    );
  }
  return (
    <main className="flex-1 relative">
      <Suspense fallback={<MasonryCanvas />}>
        <SpawnDriver query={text} />
        <PhaseRouter />
      </Suspense>
    </main>
  );
}

/**
 * Picks the right view per phase. `spawning` / `calling` / `royale` all render
 * the MasonryCanvas — cards stay mounted so per-card state (tier reveal,
 * dissolve, gold shockwave) animates in place. The royale orchestrator is
 * mounted by MasonryCanvas itself during the `royale` phase.
 *
 * `pvp` unmounts the canvas entirely; only the two gold cards re-render
 * inside <PvPArena> via shared `layoutId` so Motion morphs them from their
 * masonry slots into the arena. The remaining canvas cards (greens / neutrals)
 * just disappear — we're done with them.
 *
 * `booking` / `booked` route to <BookingPane> — the same component handles
 * both internal states (Easy Book button vs. confirmation badge). The pane
 * carries the same `layoutId="card-${winnerId}"` so Motion morphs the picked
 * arena card forward into the centred pane.
 */
function PhaseRouter() {
  const phaseName = useFlow((s) => s.phase.name);

  if (
    phaseName === 'spawning' ||
    phaseName === 'calling' ||
    phaseName === 'royale'
  ) {
    return <MasonryCanvas />;
  }

  if (phaseName === 'pvp') {
    return <PvPArena />;
  }

  if (phaseName === 'booking' || phaseName === 'booked') {
    return <BookingPane />;
  }

  return <MasonryCanvas />;
}

/**
 * Bridges the URL → store edge. The trigger to submit is "URL query differs
 * from the store's `currentQuery`". Using `phase === 'spawning'` here would
 * loop forever — once spawn finishes and phase transitions to `calling`,
 * the predicate would flip back to "not spawning, re-submit", which resets
 * the FSM to `spawning` with an empty `receivedIds`, kicking off another
 * orchestrator pass.
 *
 * `currentQuery` lives at the top of FlowState and survives every phase
 * transition until `resetToIdle` / `cancelMidFlow` clears it, so this stays
 * idempotent across StrictMode double-invoke and every phase the user
 * progresses through.
 */
function SpawnDriver({ query }: { query: string }) {
  const currentQuery = useFlow((s) => s.currentQuery);
  const submitQuery = useFlow((s) => s.submitQuery);

  useEffect(() => {
    if (currentQuery === query) return;
    void submitQuery(query);
  }, [query, currentQuery, submitQuery]);

  useSpawnOrchestrator(query);
  return null;
}
