import type { OfferId } from '@callmyagent/lib/ids';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { derivedCardPhase } from '@/lib/card-derivation';
import { cn } from '@/lib/cn';
import { cardVariants } from '@/motion/card-variants';
import { useFlow } from '@/stores/flow/flow-store-provider';
import { CardFront } from './card-front';

interface OfferCardProps {
  offerId: OfferId;
  className?: string;
}

/**
 * `layoutId` wrapper so cross-phase movement (canvas → deck → arena → booking)
 * morphs via Motion's FLIP rather than mount/unmount. The visual face lives in
 * `<CardFront>`; the variant key comes from `derivedCardPhase`, which is the
 * single source of truth for "what should this card look like right now".
 *
 * Phase 1 surface: only `hidden` / `idle` / `exit_dissolve` are exercised.
 * Other variants light up as the FSM advances in later phases.
 */
export function OfferCard({ offerId, className }: OfferCardProps) {
  const offer = useFlow((s) => s.offers[offerId]);
  const phase = useFlow((s) => s.phase);
  const calls = useFlow((s) => s.calls);

  const variantKey = useMemo(
    () => derivedCardPhase({ phase, calls }, offerId),
    [phase, calls, offerId],
  );

  // Don't paint a card we don't yet have data for. The placeholder slot in
  // the canvas keeps the grid cell occupied, so nothing reflows.
  if (!offer) return null;

  return (
    <motion.article
      layoutId={`card-${offerId}`}
      layout
      variants={cardVariants}
      initial="hidden"
      animate={variantKey}
      data-card-id={offerId}
      data-tier={variantKey}
      className={cn(
        'gpu rounded-2xl overflow-hidden',
        'border bg-card-bg border-card-border',
        className,
      )}
    >
      <CardFront offer={offer} />
    </motion.article>
  );
}
