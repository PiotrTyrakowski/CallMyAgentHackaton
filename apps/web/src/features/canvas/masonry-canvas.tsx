import { AnimatePresence, motion, type Variants } from 'motion/react';
import { OfferCard } from '@/components/card/offer-card';
import { CallingOrchestrator } from '@/features/calling/use-calling-orchestrator';
import { useFlowShallow } from '@/stores/flow/flow-store-provider';
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

interface CanvasSlice {
  ids: readonly string[]; // OfferId narrowing happens at the cell level
  isCalling: boolean;
}

export function MasonryCanvas() {
  const slice = useFlowShallow<CanvasSlice | null>((s) => {
    if (s.phase.name === 'spawning') {
      return { ids: s.phase.receivedIds, isCalling: false };
    }
    if (s.phase.name === 'calling') {
      return { ids: s.phase.offerIds, isCalling: true };
    }
    if (s.phase.name === 'royale') {
      // Royale keeps the canvas visible while tier reveal / dissolve happens.
      // The id set is the keys of `scored`.
      return {
        ids: Object.keys(s.phase.scored),
        isCalling: false,
      };
    }
    return null;
  });

  if (!slice) return null;

  const { ids, isCalling } = slice;

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
          return (
            <AnimatePresence
              key={`slot-${i}`}
              mode="popLayout"
              initial={false}
            >
              {offerId ? (
                <OfferCard
                  key={offerId}
                  offerId={offerId as import('@callmyagent/lib/ids').OfferId}
                />
              ) : (
                <PlaceholderSlot key={`ph-${i}`} />
              )}
            </AnimatePresence>
          );
        })}
      </motion.div>
      {isCalling ? <CallingOrchestrator /> : null}
    </>
  );
}
