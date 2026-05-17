import { AnimatePresence, motion, type Variants } from 'motion/react';
import { OfferCard } from '@/components/card/offer-card';
import { useFlowShallow } from '@/stores/flow/flow-store-provider';
import { PlaceholderSlot } from './placeholder-slot';

/**
 * 40-slot grid for the spawn phase (spec §10 / §13). Every slot is reserved
 * up front so the canvas never reflows as cards arrive — placeholders fade
 * out under each real card via `<AnimatePresence mode="popLayout">`.
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

export function MasonryCanvas() {
  const phaseSlice = useFlowShallow((s) =>
    s.phase.name === 'spawning'
      ? { received: s.phase.receivedIds, query: s.phase.query }
      : null,
  );

  // While the phase is anything else (e.g. on /q with the loader still
  // resolving, or after the 40th card flips us to `calling`), the canvas is
  // not responsible for the render. The phase router (or Suspense fallback)
  // takes over.
  if (!phaseSlice) return null;

  const { received } = phaseSlice;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-5 gap-4 p-8"
    >
      {Array.from({ length: SLOT_COUNT }, (_, i) => {
        const offerId = received[i];
        return (
          <AnimatePresence
            key={`slot-${i}`}
            mode="popLayout"
            initial={false}
          >
            {offerId ? (
              <OfferCard key={offerId} offerId={offerId} />
            ) : (
              <PlaceholderSlot key={`ph-${i}`} />
            )}
          </AnimatePresence>
        );
      })}
    </motion.div>
  );
}
