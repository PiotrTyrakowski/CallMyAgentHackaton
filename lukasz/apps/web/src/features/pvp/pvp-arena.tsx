import { AnimatePresence } from 'motion/react';
import { useFlow, useFlowShallow } from '@/stores/flow/flow-store-provider';
import { ArenaCard } from './arena-card';

/**
 * Phase 4 PvP arena — the simplest possible 2-card choice (spec §10,
 * "crystal clear 2 cards" mandate; ADR
 * `wiki/decisions/004-pvp-final-pick-just-two.md`). The two gold ids ride on
 * the `pvp` phase variant; we project them through `useFlowShallow` so a
 * sibling state change (e.g. unrelated `calls` updates that linger from the
 * call phase) doesn't re-render the arena.
 *
 * Wrapped in `<AnimatePresence>` so when one card is picked the other can run
 * its scale-down + fade exit (spec §13 "Loser exit") before unmounting; the
 * picked card morphs forward into the BookingPane via its shared `layoutId`.
 */
export function PvPArena() {
  const view = useFlowShallow((s) =>
    s.phase.name === 'pvp'
      ? { goldA: s.phase.goldA, goldB: s.phase.goldB }
      : null,
  );
  const pickPvP = useFlow((s) => s.pickPvP);

  if (!view) return null;

  return (
    <div className="grid place-items-center h-full">
      <div className="text-text-mute font-mono text-sm mb-6 uppercase tracking-widest">
        Pick your stay
      </div>
      <div className="relative flex gap-12 items-center justify-center">
        <AnimatePresence mode="popLayout">
          <ArenaCard
            key={view.goldA}
            offerId={view.goldA}
            onPick={() => pickPvP(view.goldA)}
          />
          <ArenaCard
            key={view.goldB}
            offerId={view.goldB}
            onPick={() => pickPvP(view.goldB)}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}
