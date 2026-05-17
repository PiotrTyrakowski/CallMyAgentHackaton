import type { OfferId } from '@callmyagent/lib/ids';

/**
 * Decide _when_ each call should start. We don't dial all 40 cards at once —
 * the visual stampede looks chaotic and the browser caps origin connections
 * around 6 anyway. Instead we split into waves of 3–5 cards with 80–150ms
 * gaps between waves, so the ringing rolls across the canvas.
 *
 * Order is randomized so the wave pattern doesn't repeat the masonry grid
 * order (which would read as left-to-right scanning rather than scatter).
 *
 * Returns `{ id, delayMs }[]` sorted ascending by delay — callers can iterate
 * and schedule `setTimeout`s directly.
 */

export interface CallSchedule {
  id: OfferId;
  delayMs: number;
}

interface PlanOpts {
  /** Min cards per wave (inclusive). */
  minWaveSize?: number;
  /** Max cards per wave (inclusive). */
  maxWaveSize?: number;
  /** Min gap between waves (ms). */
  minWaveGapMs?: number;
  /** Max gap between waves (ms). */
  maxWaveGapMs?: number;
  /** Optional seeded RNG for tests; defaults to `Math.random`. */
  random?: () => number;
}

const DEFAULTS = {
  minWaveSize: 3,
  maxWaveSize: 5,
  minWaveGapMs: 80,
  maxWaveGapMs: 150,
} as const;

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  // Fisher–Yates so every permutation is equally likely.
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

function randInt(min: number, max: number, rand: () => number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

export function planCallFanOut(
  offerIds: readonly OfferId[],
  opts: PlanOpts = {},
): CallSchedule[] {
  const minWaveSize = opts.minWaveSize ?? DEFAULTS.minWaveSize;
  const maxWaveSize = opts.maxWaveSize ?? DEFAULTS.maxWaveSize;
  const minWaveGapMs = opts.minWaveGapMs ?? DEFAULTS.minWaveGapMs;
  const maxWaveGapMs = opts.maxWaveGapMs ?? DEFAULTS.maxWaveGapMs;
  const rand = opts.random ?? Math.random;

  const shuffled = shuffle(offerIds, rand);
  const out: CallSchedule[] = [];
  let cursor = 0;
  let elapsed = 0;

  while (cursor < shuffled.length) {
    const waveSize = Math.min(
      randInt(minWaveSize, maxWaveSize, rand),
      shuffled.length - cursor,
    );
    for (let i = 0; i < waveSize; i++) {
      const id = shuffled[cursor + i];
      if (id !== undefined) out.push({ id, delayMs: elapsed });
    }
    cursor += waveSize;
    elapsed += randInt(minWaveGapMs, maxWaveGapMs, rand);
  }

  return out;
}
