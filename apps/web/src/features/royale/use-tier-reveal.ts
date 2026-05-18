import type { OfferId } from '@callmyagent/lib/ids';
import { useEffect, useMemo } from 'react';
import { useFlow, useFlowShallow } from '@/stores/flow/flow-store-provider';

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

interface TierRevealSlice {
  scoredIds: OfferId[];
  revealedSize: number;
}

export function useTierReveal(): { done: boolean } {
  const slice = useFlowShallow<TierRevealSlice | null>((s) => {
    if (s.phase.name !== 'royale') return null;
    return {
      // `Object.keys` produces strings; we cast to the branded id type because
      // the `scored` map's keys ARE OfferIds by construction (startRoyale).
      scoredIds: Object.keys(s.phase.scored) as OfferId[],
      revealedSize: s.phase.revealed.size,
    };
  });
  const revealOne = useFlow((s) => s.revealOne);

  // Shuffle once per royale entry; identity of `scoredIds` is stable across
  // re-renders because immer produces frozen arrays per phase.
  const order = useMemo(
    () => (slice ? shuffled(slice.scoredIds) : []),
    [slice?.scoredIds],
  );

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

  const total = slice?.scoredIds.length ?? 0;
  const done = total > 0 && (slice?.revealedSize ?? 0) >= total;
  return { done };
}
