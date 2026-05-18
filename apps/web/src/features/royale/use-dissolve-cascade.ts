import type { OfferId } from '@callmyagent/lib/ids';
import type { OfferTier } from '@callmyagent/lib/types';
import { useEffect, useMemo } from 'react';
import { useFlow } from '@/stores/flow/flow-store-provider';

/**
 * After every tier is revealed, dissolves red cards one at a time in
 * random order, ~80 ms apart (spec §13). Each `markDissolved` causes the
 * matching OfferCard to return null; AnimatePresence then runs the
 * `exit_dissolve` variant (~600 ms) while the masonry slot stays open
 * via `<EmptySlot>`.
 *
 * Triggering: only fires once `enabled` is true (the orchestrator gates this
 * on `tierReveal.done`). Cleanup cancels all pending timers on unmount or
 * phase change so a fast hand-off into PvP doesn't fire dangling writes.
 */

const STAGGER_MS = 80;

function shuffled<T>(input: readonly T[]): T[] {
  const out = input.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    const swap = out[j];
    if (tmp === undefined || swap === undefined) continue;
    out[i] = swap;
    out[j] = tmp;
  }
  return out;
}

interface UseDissolveCascadeOptions {
  /** Gate the cascade on tier-reveal completion. */
  enabled: boolean;
}

export function useDissolveCascade({
  enabled,
}: UseDissolveCascadeOptions): { done: boolean } {
  // Read stable refs directly. `phase.scored` keeps its identity across
  // `markDissolved(id)` (only `dissolvedIds` mutates), so a `useMemo`
  // derivation runs once per royale entry rather than once per dissolve.
  const scored = useFlow((s) =>
    s.phase.name === 'royale' ? s.phase.scored : null,
  );
  const dissolvedSize = useFlow((s) =>
    s.phase.name === 'royale' ? s.phase.dissolvedIds.size : 0,
  );
  const markDissolved = useFlow((s) => s.markDissolved);

  const redIds = useMemo<OfferId[]>(() => {
    if (!scored) return [];
    const out: OfferId[] = [];
    for (const [id, info] of Object.entries(scored) as [
      OfferId,
      { tier: OfferTier; score: number },
    ][]) {
      if (info.tier === 'red') out.push(id);
    }
    return out;
  }, [scored]);

  const order = useMemo(
    () => (enabled ? shuffled(redIds) : []),
    [enabled, redIds],
  );

  useEffect(() => {
    if (!enabled || order.length === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      if (id === undefined) continue;
      timers.push(
        setTimeout(() => {
          markDissolved(id);
        }, i * STAGGER_MS),
      );
    }
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [enabled, order, markDissolved]);

  const total = redIds.length;
  // Empty red-set (degenerate scoring) still counts as done so the gold
  // shockwave doesn't hang waiting for a dissolve that will never happen.
  const done = enabled && (total === 0 || dissolvedSize >= total);
  return { done };
}
