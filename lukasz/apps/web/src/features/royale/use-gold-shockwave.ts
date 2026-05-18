import type { OfferId } from '@callmyagent/lib/ids';
import type { OfferTier } from '@callmyagent/lib/types';
import { useEffect, useMemo, useState } from 'react';
import { log } from '@/lib/log';
import { useFlow } from '@/stores/flow/flow-store-provider';

/**
 * Fires the gold-card shockwave once the dissolve cascade finishes, then 600 ms
 * later transitions to PvP via `enterPvP(goldA, goldB)`. Returns the per-card
 * origin coordinates so the orchestrator can mount the `<GoldShockwave>`
 * overlay positioned over each gold card's centre.
 *
 * Spec §13: "Gold shockwave 800–1200 ms total", then **600 ms after shockwave
 * → transition to PvP**.
 *
 * Origins are computed at fire time via `getBoundingClientRect()` against the
 * cards' `data-card-id` selectors — this lets the canvas decide where the
 * cards land without the orchestrator knowing anything about layout. If a
 * lookup fails (card unmounted between dissolve and fire) we just skip that
 * origin; the second wave still gets its visual.
 */

const SHOCKWAVE_DURATION_MS = 800;
const HANDOFF_DELAY_MS = 600;

interface ShockwaveState {
  origins: ReadonlyArray<{ x: number; y: number }>;
  active: boolean;
}

interface UseGoldShockwaveOptions {
  enabled: boolean;
}

export function useGoldShockwave({
  enabled,
}: UseGoldShockwaveOptions): ShockwaveState {
  // Stable ref under Immer — `scored` doesn't change after `startRoyale`,
  // so deriving `goldIds` via useMemo runs once per royale entry instead of
  // every re-render of the orchestrator.
  const scored = useFlow((s) =>
    s.phase.name === 'royale' ? s.phase.scored : null,
  );
  const enterPvP = useFlow((s) => s.enterPvP);

  const [state, setState] = useState<ShockwaveState>({
    origins: [],
    active: false,
  });

  const goldIds = useMemo<OfferId[]>(() => {
    if (!scored) return [];
    const out: OfferId[] = [];
    for (const [id, info] of Object.entries(scored) as [
      OfferId,
      { tier: OfferTier; score: number },
    ][]) {
      if (info.tier === 'gold') out.push(id);
    }
    return out;
  }, [scored]);

  useEffect(() => {
    if (!enabled) return;

    // Probe the DOM for the two gold cards. Wrap in rAF so layout has
    // committed after the dissolve unmounts before we measure.
    let cancelled = false;
    const probeAndFire = () => {
      if (cancelled) return;
      const origins: { x: number; y: number }[] = [];
      for (const id of goldIds) {
        const el = document.querySelector<HTMLElement>(
          `[data-card-id="${CSS.escape(id)}"]`,
        );
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        origins.push({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
      // Even if probing failed completely, advance the FSM so the user
      // doesn't end up stranded on a stopped royale canvas. The shockwave
      // is decorative; PvP is the user-visible product step.
      setState({ origins, active: true });

      if (origins.length === 0) {
        log.warn('gold shockwave: no gold cards found in DOM', {
          goldIds: goldIds.length,
        });
      }
    };
    const raf = requestAnimationFrame(probeAndFire);

    // ~800 ms after the shockwave fires, wait the extra 600 ms hand-off, then
    // enter PvP. Single combined timer keeps cleanup trivial.
    const handoff = setTimeout(() => {
      if (cancelled) return;
      setState((prev) => ({ ...prev, active: false }));
      const [a, b] = goldIds;
      if (a === undefined || b === undefined) {
        log.warn('royale: missing gold ids on PvP hand-off', {
          have: goldIds.length,
        });
        return;
      }
      enterPvP(a, b);
    }, SHOCKWAVE_DURATION_MS + HANDOFF_DELAY_MS);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(handoff);
    };
  }, [enabled, goldIds, enterPvP]);

  return state;
}
