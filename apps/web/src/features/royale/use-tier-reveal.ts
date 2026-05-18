import type { OfferId } from '@callmyagent/lib/ids';
import { useEffect, useMemo } from 'react';
import { useFlow } from '@/stores/flow/flow-store-provider';

/**
 * Reveals tiers in randomised waves of 3–5 ids every ~120 ms (spec §13).
 *
 * The reveal order is shuffled once per royale entry — `useMemo` keys off the
 * stable `scored` id-array reference so a re-render of the orchestrator never
 * reshuffles mid-sequence. All timers are tracked and cleared on unmount or
 * phase change; nothing leaks into PvP.
 *
 * Idempotent: `revealOne` adds to a Set, so a stray duplicate timer firing
 * after a phase change is a no-op rather than a crash.
 */

const WAVE_MIN = 3;
const WAVE_MAX = 5;
const WAVE_INTERVAL_MS = 120;

function shuffled<T>(input: readonly T[]): T[] {
  const out = input.slice();
  // Fisher–Yates — unbiased and trivial to reason about.
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

function pickWaveSize(): number {
  return (
    WAVE_MIN + Math.floor(Math.random() * (WAVE_MAX - WAVE_MIN + 1))
  );
}

export function useTierReveal(): { done: boolean } {
  // Read the stable refs directly. Under Immer, `phase.scored` keeps its
  // reference across `revealOne(id)` (only `revealed` mutates), so deriving
  // `scoredIds` from it via useMemo doesn't re-run on every reveal — which
  // would otherwise restart the wave schedule on every tick and loop.
  const scored = useFlow((s) =>
    s.phase.name === 'royale' ? s.phase.scored : null,
  );
  const revealedSize = useFlow((s) =>
    s.phase.name === 'royale' ? s.phase.revealed.size : 0,
  );
  const revealOne = useFlow((s) => s.revealOne);

  const scoredIds = useMemo<OfferId[]>(
    () => (scored ? (Object.keys(scored) as OfferId[]) : []),
    [scored],
  );

  // Shuffle once per royale entry; `scoredIds` stability is now real.
  const order = useMemo(() => shuffled(scoredIds), [scoredIds]);

  useEffect(() => {
    if (order.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    let cursor = 0;
    let waveIndex = 0;

    while (cursor < order.length) {
      const size = Math.min(pickWaveSize(), order.length - cursor);
      const ids = order.slice(cursor, cursor + size);
      const delay = waveIndex * WAVE_INTERVAL_MS;
      timers.push(
        setTimeout(() => {
          for (const id of ids) revealOne(id);
        }, delay),
      );
      cursor += size;
      waveIndex += 1;
    }

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [order, revealOne]);

  const total = scoredIds.length;
  const done = total > 0 && revealedSize >= total;
  return { done };
}

