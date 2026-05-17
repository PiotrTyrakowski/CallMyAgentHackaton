import { createFileRoute, redirect } from '@tanstack/react-router';
import { Suspense, useEffect } from 'react';
import { z } from 'zod';
import { MasonryCanvas } from '@/features/canvas/masonry-canvas';
import { useSpawnOrchestrator } from '@/features/canvas/use-spawn-orchestrator';
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
  return (
    <main className="flex-1">
      <Suspense fallback={<MasonryCanvas />}>
        <SpawnDriver query={text} />
        <MasonryCanvas />
      </Suspense>
    </main>
  );
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
