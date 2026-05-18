import { GoldShockwave } from '@/components/effects/gold-shockwave';
import { useDissolveCascade } from './use-dissolve-cascade';
import { useGoldShockwave } from './use-gold-shockwave';
import { useTierReveal } from './use-tier-reveal';

/**
 * Composes the three royale sub-orchestrators (spec §13):
 *
 *   1. `useTierReveal`        — randomised waves of 3–5 reveals every ~120 ms.
 *   2. `useDissolveCascade`   — gated on (1); marks reds dissolved every 80 ms.
 *   3. `useGoldShockwave`     — gated on (2); fires shockwave, 600 ms hand-off
 *                                to PvP via `enterPvP(goldA, goldB)`.
 *
 * Mounted by MasonryCanvas during the `royale` phase. Renders only the
 * shockwave overlay; tier badges and dissolve exits live on the OfferCards
 * themselves so the orchestrator doesn't fight the canvas for layout.
 */
export function RoyaleOrchestrator() {
  const tier = useTierReveal();
  const dissolve = useDissolveCascade({ enabled: tier.done });
  const shockwave = useGoldShockwave({ enabled: dissolve.done });

  if (!shockwave.active || shockwave.origins.length === 0) return null;
  return <GoldShockwave origins={shockwave.origins} />;
}
