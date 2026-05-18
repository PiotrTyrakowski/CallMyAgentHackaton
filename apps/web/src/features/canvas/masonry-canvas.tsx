import { AnimatePresence, motion, type Variants } from 'motion/react';
import type { OfferId } from '@callmyagent/lib/ids';
import { OfferCard } from '@/components/card/offer-card';
import { CallingOrchestrator } from '@/features/calling/use-calling-orchestrator';
import { RoyaleOrchestrator } from '@/features/royale/royale-orchestrator';
import { useFlowShallow } from '@/stores/flow/flow-store-provider';
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

interface CanvasSlice {
  ids: readonly OfferId[];
  isCalling: boolean;
  isRoyale: boolean;
  /**
   * Royale-only: which ids have finished their dissolve animation. The slot
   * for each id renders an `<EmptySlot>` placeholder instead of the card so
   * the grid holds its shape (spec §13, D4 — survivors stay in place).
   */
  dissolvedIds: ReadonlySet<OfferId>;
}

const EMPTY_DISSOLVED: ReadonlySet<OfferId> = new Set();

export function MasonryCanvas() {
  const slice = useFlowShallow<CanvasSlice | null>((s) => {
    if (s.phase.name === 'spawning') {
      return {
        ids: s.phase.receivedIds,
        isCalling: false,
        isRoyale: false,
        dissolvedIds: EMPTY_DISSOLVED,
      };
    }
    if (s.phase.name === 'calling') {
      return {
        ids: s.phase.offerIds,
        isCalling: true,
        isRoyale: false,
        dissolvedIds: EMPTY_DISSOLVED,
      };
    }
    if (s.phase.name === 'royale') {
      // Royale keeps the canvas visible while tier reveal / dissolve happens.
      // The id set is the keys of `scored` cast back to OfferId — they
      // entered the map via OfferId-typed reducer args, so the cast is safe.
      return {
        ids: Object.keys(s.phase.scored) as OfferId[],
        isCalling: false,
        isRoyale: true,
        dissolvedIds: s.phase.dissolvedIds,
      };
    }
    return null;
  });

  if (!slice) return null;

  const { ids, isCalling, isRoyale, dissolvedIds } = slice;

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
