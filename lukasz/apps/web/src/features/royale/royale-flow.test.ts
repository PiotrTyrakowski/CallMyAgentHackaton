import { offerId as toOfferId } from '@callmyagent/lib/ids';
import type { OfferTier } from '@callmyagent/lib/types';
import { describe, expect, it } from 'vitest';
import { createFlowStore } from '@/stores/flow/create-flow-store';

/**
 * Phase-3 reducer-level tests. We exercise the store directly (no React) so
 * the focus is the FSM contract: startRoyale → revealOne → markDissolved →
 * enterPvP. The orchestrator timers are integration-tested elsewhere (manual
 * for now; jsdom + fake timers add noise without catching real bugs at this
 * layer).
 */

function makeScored(
  pairs: ReadonlyArray<readonly [string, OfferTier, number]>,
) {
  const out: Record<
    ReturnType<typeof toOfferId>,
    { tier: OfferTier; score: number }
  > = {};
  for (const [raw, tier, score] of pairs) {
    out[toOfferId(raw)] = { tier, score };
  }
  return out;
}

describe('royale reducers', () => {
  it('startRoyale seeds revealed/dissolved as empty and the dissolveQueue with reds', () => {
    const store = createFlowStore({});
    const scored = makeScored([
      ['A', 'gold', 99],
      ['B', 'gold', 98],
      ['C', 'green', 70],
      ['D', 'red', 12],
      ['E', 'red', 5],
    ]);

    store.getState().startRoyale(scored);

    const phase = store.getState().phase;
    expect(phase.name).toBe('royale');
    if (phase.name !== 'royale') return;
    expect(phase.revealed.size).toBe(0);
    expect(phase.dissolvedIds.size).toBe(0);
    expect(phase.dissolveQueue.slice().sort()).toEqual(
      [toOfferId('D'), toOfferId('E')].sort(),
    );
  });

  it('revealOne / markDissolved mutate sets only while in royale', () => {
    const store = createFlowStore({});
    const scored = makeScored([
      ['X', 'red', 10],
      ['Y', 'gold', 90],
    ]);
    store.getState().startRoyale(scored);

    store.getState().revealOne(toOfferId('X'));
    store.getState().markDissolved(toOfferId('X'));

    const phase = store.getState().phase;
    if (phase.name !== 'royale') throw new Error('expected royale');
    expect(phase.revealed.has(toOfferId('X'))).toBe(true);
    expect(phase.dissolvedIds.has(toOfferId('X'))).toBe(true);

    // After enterPvP, revealOne/markDissolved are no-ops (guarded).
    store.getState().enterPvP(toOfferId('Y'), toOfferId('X'));
    store.getState().revealOne(toOfferId('Y'));
    expect(store.getState().phase.name).toBe('pvp');
  });

  it('enterPvP(goldA, goldB) carries both ids forward', () => {
    const store = createFlowStore({});
    const scored = makeScored([
      ['G1', 'gold', 99],
      ['G2', 'gold', 95],
    ]);
    store.getState().startRoyale(scored);
    store.getState().enterPvP(toOfferId('G1'), toOfferId('G2'));

    const phase = store.getState().phase;
    expect(phase.name).toBe('pvp');
    if (phase.name !== 'pvp') return;
    expect(phase.goldA).toBe(toOfferId('G1'));
    expect(phase.goldB).toBe(toOfferId('G2'));
  });
});
