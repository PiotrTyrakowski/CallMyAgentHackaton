import type { OfferId } from '@callmyagent/lib/ids';
import type { CallEvent } from '@callmyagent/lib/types';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { derivedCardPhase } from '@/lib/card-derivation';
import { cn } from '@/lib/cn';
import { cardVariants } from '@/motion/card-variants';
import { useFlow } from '@/stores/flow/flow-store-provider';
import { CardCallFace } from './card-call-face';
import { CardFront, type CallOutcome } from './card-front';

interface OfferCardProps {
  offerId: OfferId;
  className?: string;
}

interface OutcomeView {
  outcome: CallOutcome;
  savings?: number;
}

function deriveOutcome(
  events: CallEvent[] | undefined,
  basePrice: number,
): OutcomeView {
  if (!events || events.length === 0) return { outcome: 'none' };
  const last = events[events.length - 1];
  if (!last) return { outcome: 'none' };
  if (last.status === 'failed') return { outcome: 'no_answer' };
  if (last.status === 'done') {
    if (last.negotiatedPrice !== undefined) {
      const savings = Math.max(0, Math.round(basePrice - last.negotiatedPrice));
      return savings > 0
        ? { outcome: 'negotiated', savings }
        : { outcome: 'answered' };
    }
    return { outcome: 'answered' };
  }
  return { outcome: 'none' };
}

/**
 * `layoutId` wrapper so cross-phase movement (canvas → deck → arena → booking)
 * morphs via Motion's FLIP rather than mount/unmount. The variant key drives
 * the outer shake + tier styling; the inner 3D flipper swaps front/back faces
 * during the calling phase.
 *
 * Flip rule: the card shows its call face while the call is in flight (any
 * `dialing` / `on_call` / `negotiating` event); on `done` / `failed` it flips
 * back so the outcome badge sits on the familiar front face.
 */
export function OfferCard({ offerId, className }: OfferCardProps) {
  const offer = useFlow((s) => s.offers[offerId]);
  const phase = useFlow((s) => s.phase);
  const events = useFlow((s) => s.calls[offerId]);

  const variantKey = useMemo(
    () => derivedCardPhase({ phase, calls: { [offerId]: events } }, offerId),
    [phase, events, offerId],
  );

  const lastStatus = events?.[events.length - 1]?.status;
  const isCallInFlight =
    lastStatus === 'dialing' ||
    lastStatus === 'on_call' ||
    lastStatus === 'negotiating';

  const outcomeView = useMemo(
    () => deriveOutcome(events, offer?.pricePerNight ?? 0),
    [events, offer?.pricePerNight],
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
      data-flipped={isCallInFlight ? 'true' : 'false'}
      className={cn(
        'gpu rounded-2xl overflow-hidden aspect-[3/4]',
        'border bg-card-bg border-card-border',
        className,
      )}
      style={{ perspective: 1000 }}
    >
      <motion.div
        className="relative h-full w-full"
        animate={{ rotateY: isCallInFlight ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <CardFront
            offer={offer}
            outcome={outcomeView.outcome}
            {...(outcomeView.savings !== undefined
              ? { savings: outcomeView.savings }
              : {})}
          />
        </div>
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <CardCallFace offerId={offerId} />
        </div>
      </motion.div>
    </motion.article>
  );
}
