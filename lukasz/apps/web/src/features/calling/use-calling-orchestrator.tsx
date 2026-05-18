import type { OfferId } from '@callmyagent/lib/ids';
import { offerId as toOfferId } from '@callmyagent/lib/ids';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiScoring } from '@/api/client';
import { log } from '@/lib/log';
import { useFlow, useFlowShallow } from '@/stores/flow/flow-store-provider';
import { planCallFanOut } from './call-fan-out';
import { CallSubscriber } from './call-subscriber';

/**
 * Drives the calling phase end-to-end:
 * 1. Plans a wave-jittered start order for the 40 cards.
 * 2. Mounts `<CallSubscriber offerId>` per id, delayed by its scheduled offset.
 *    Each subscriber owns its own SSE connection; nothing else here cares.
 * 3. Watches `completedIds.size === offerIds.length`. When everyone's done
 *    (or failed), fires the scoring mutation in-line and transitions the
 *    store to `royale`.
 *
 * Resilience choices:
 * - If scoring fails we still flip to royale with an empty `scored` map so
 *   the user isn't stranded on the calling canvas. Phase 3 will treat
 *   missing entries as `red` by convention.
 * - `useRef` guards the scoring call against StrictMode double-invocation.
 */
export function useCallingOrchestrator(): readonly OfferId[] {
  const phaseSlice = useFlowShallow((s) =>
    s.phase.name === 'calling'
      ? {
          offerIds: s.phase.offerIds,
          completedCount: s.phase.completedIds.size,
        }
      : null,
  );
  const calls = useFlow((s) => s.calls);
  const startRoyale = useFlow((s) => s.startRoyale);

  const offerIds = phaseSlice?.offerIds ?? null;
  const completedCount = phaseSlice?.completedCount ?? 0;
  const totalCount = offerIds?.length ?? 0;

  // Compute the wave schedule once per phase entry — `offerIds` is the
  // stable identity (the immer-produced array is frozen and reference-equal
  // across renders within the phase).
  const schedule = useMemo(
    () => (offerIds ? planCallFanOut(offerIds) : []),
    [offerIds],
  );

  // Track which subscribers have been "released" by the wave timer.
  const [activeIds, setActiveIds] = useState<ReadonlySet<OfferId>>(
    () => new Set(),
  );

  useEffect(() => {
    if (schedule.length === 0) {
      setActiveIds(new Set());
      return;
    }
    setActiveIds(new Set());
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const { id, delayMs } of schedule) {
      const t = setTimeout(() => {
        setActiveIds((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }, delayMs);
      timers.push(t);
    }
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [schedule]);

  // Once every call has reached a terminal state, score + transition.
  const scoringFiredRef = useRef(false);
  useEffect(() => {
    if (!offerIds || totalCount === 0) return;
    if (completedCount < totalCount) return;
    if (scoringFiredRef.current) return;
    scoringFiredRef.current = true;

    log.info('calling phase complete; firing scoring', { totalCount });

    void apiScoring({
      offerIds: offerIds.map((id) => id as string),
      calls: Object.fromEntries(
        Object.entries(calls).map(([k, v]) => [k, v ?? []]),
      ),
    })
      .then((res) => {
        const scored: Record<OfferId, { tier: typeof res.scored[number]['tier']; score: number }> = {};
        for (const entry of res.scored) {
          scored[toOfferId(entry.offerId)] = {
            tier: entry.tier,
            score: entry.score,
          };
        }
        startRoyale(scored);
      })
      .catch((err) => {
        log.error('scoring failed; advancing to royale with empty scores', {
          err,
        });
        startRoyale({});
      });
  }, [offerIds, totalCount, completedCount, calls, startRoyale]);

  // Reset the fired-ref when we leave the calling phase so a subsequent
  // calling phase (new query) starts clean.
  useEffect(() => {
    if (offerIds === null) {
      scoringFiredRef.current = false;
    }
  }, [offerIds]);

  return useMemo(() => Array.from(activeIds), [activeIds]);
}

/**
 * Renderable host: mounts a hidden `<CallSubscriber>` per offer id once the
 * wave timer has released that id. Each subscriber owns its own SSE.
 */
export function CallingOrchestrator(): React.JSX.Element | null {
  const activeIds = useCallingOrchestrator();
  if (activeIds.length === 0) return null;
  return (
    <>
      {activeIds.map((id) => (
        <CallSubscriber key={id} offerId={id} />
      ))}
    </>
  );
}
