import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useMemo } from 'react';
import type { OfferId } from '@callmyagent/lib/ids';
import { OfferCard } from '@/components/card/offer-card';
import { CallingOrchestrator } from '@/features/calling/use-calling-orchestrator';
import { RoyaleOrchestrator } from '@/features/royale/royale-orchestrator';
import { useFlow } from '@/stores/flow/flow-store-provider';
import { EmptySlot } from './empty-slot';
import { PlaceholderSlot } from './placeholder-slot';

/**
 * 40-slot grid for the spawn AND calling phases (spec §10 / §13). Every slot
 * is reserved up front so the canvas never reflows as cards arrive; cards
 * stay mounted through the spawn → calling → royale transitions so their
 * internal state (flip, badges, tier color) animates in place via Motion's
 * variants.
 *
 * Stagger lives at the container level (not per-card timeouts) so the rhythm
 * is independent of network speed; the spawn orchestrator drips ids into
 * the store at its own ~30–50 ms cadence.
 */

const SLOT_COUNT = 40;

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04 },
  },
};

const EMPTY_IDS: readonly OfferId[] = Object.freeze([]);
const EMPTY_DISSOLVED: ReadonlySet<OfferId> = new Set();

export function MasonryCanvas() {
  // Read stable refs directly. Building objects / new arrays inside a
  // useFlowShallow selector defeats its shallow compare and loops the
  // subscriber. Under Immer, `phase.receivedIds`, `phase.offerIds`,
  // `phase.scored`, and `phase.dissolvedIds` keep their refs across the
  // mutations that don't touch them, so useMemo only re-runs on real changes.
  const phaseName = useFlow((s) => s.phase.name);
  const spawningIds = useFlow((s) =>
    s.phase.name === 'spawning' ? s.phase.receivedIds : null,
  );
  const callingIds = useFlow((s) =>
    s.phase.name === 'calling' ? s.phase.offerIds : null,
  );
  const royaleScored = useFlow((s) =>
    s.phase.name === 'royale' ? s.phase.scored : null,
  );
  const royaleDissolvedIds = useFlow((s) =>
    s.phase.name === 'royale' ? s.phase.dissolvedIds : null,
  );

  const ids = useMemo<readonly OfferId[]>(() => {
    if (spawningIds) return spawningIds;
    if (callingIds) return callingIds;
    if (royaleScored) return Object.keys(royaleScored) as OfferId[];
    return EMPTY_IDS;
  }, [spawningIds, callingIds, royaleScored]);

  const isCalling = phaseName === 'calling';
  const isRoyale = phaseName === 'royale';
  const dissolvedIds = royaleDissolvedIds ?? EMPTY_DISSOLVED;

  const visible =
    phaseName === 'spawning' ||
    phaseName === 'calling' ||
    phaseName === 'royale';
  if (!visible) return null;

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-5 gap-4 p-8"
      >
        {Array.from({ length: SLOT_COUNT }, (_, i) => {
          const offerId = ids[i];
          // popLayout keeps survivors in their original slots while the exit
          // animation plays — exactly what spec §13 D4 mandates. The exit
          // itself lives on the OfferCard's `exit` prop (cardVariants.exit_dissolve).
          return (
            <AnimatePresence
              key={`slot-${i}`}
              mode="popLayout"
              initial={false}
            >
              {offerId && !dissolvedIds.has(offerId) ? (
                <OfferCard key={offerId} offerId={offerId} />
              ) : offerId && dissolvedIds.has(offerId) ? (
                <EmptySlot key={`empty-${offerId}`} />
              ) : (
                <PlaceholderSlot key={`ph-${i}`} />
              )}
            </AnimatePresence>
          );
        })}
      </motion.div>
      {isCalling ? <CallingOrchestrator /> : null}
      {isRoyale ? <RoyaleOrchestrator /> : null}
    </>
  );
}
