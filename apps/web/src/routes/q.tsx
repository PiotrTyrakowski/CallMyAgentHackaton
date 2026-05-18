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
 * Bridges the URL → store edge. Idempotent: only fires `submitQuery` when the
 * store isn't already spawning for this exact text, so React StrictMode's
 * double-invoke and re-renders from unrelated state changes don't reset the
 * receivedIds list.
 *
 * Rendered inside `<Suspense>` so `useSpawnOrchestrator`'s `useSuspenseQuery`
 * has a boundary; while suspended, the fallback `<MasonryCanvas />` paints
 * placeholders. As soon as the query resolves, the orchestrator starts
 * dripping ids and the placeholders swap to real cards.
 */
function SpawnDriver({ query }: { query: string }) {
  const phaseName = useFlow((s) => s.phase.name);
  const phaseQuery = useFlow((s) =>
    s.phase.name === 'spawning' ? s.phase.query : null,
  );
  const submitQuery = useFlow((s) => s.submitQuery);

  useEffect(() => {
    const isAlreadySpawning =
      phaseName === 'spawning' && phaseQuery === query;
    if (isAlreadySpawning) return;
    void submitQuery(query);
  }, [query, phaseName, phaseQuery, submitQuery]);

  useSpawnOrchestrator(query);
  return null;
}
