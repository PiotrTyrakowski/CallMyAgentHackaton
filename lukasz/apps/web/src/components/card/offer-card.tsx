import type { OfferId } from '@callmyagent/lib/ids';
import type { CallEvent, OfferTier } from '@callmyagent/lib/types';
import { motion, type TargetAndTransition } from 'motion/react';
import { useMemo } from 'react';
import { derivedCardPhase } from '@/lib/card-derivation';
import { cn } from '@/lib/cn';
import { cardVariants } from '@/motion/card-variants';
import { useFlow } from '@/stores/flow/flow-store-provider';
import { CardCallFace } from './card-call-face';
import { CardFront, type CallOutcome } from './card-front';
import { CardTierBadge } from './card-tier-badge';

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
/**
 * Cards leave the canvas exclusively via the royale dissolve. Inlining the
 * exit target (rather than reading the variant) keeps Motion's AnimatePresence
 * from getting confused by mid-flight variant flips and avoids the
 * `Variant | undefined` indexed-access widening that `Variants` would impose.
 */
const EXIT_DISSOLVE: TargetAndTransition = {
  opacity: 0,
  scale: 0.7,
  filter: 'blur(8px) saturate(0) hue-rotate(60deg)',
  transition: { duration: 0.6, ease: 'easeIn' },
};

const REVEALED_TIERS: ReadonlySet<string> = new Set([
  'red',
  'neutral',
  'green',
  'gold',
]);

function isTier(key: string): key is OfferTier {
  return REVEALED_TIERS.has(key);
}

export function OfferCard({ offerId, className }: OfferCardProps) {
  const offer = useFlow((s) => s.offers[offerId]);
  const phase = useFlow((s) => s.phase);
  const events = useFlow((s) => s.calls[offerId]);

  // Royale-only: once a card lands in `dissolvedIds`, return null so
  // AnimatePresence runs the `exit` prop animation (the visible dissolve)
  // and the masonry slot substitutes an `<EmptySlot>` in our place.
  const isDissolved =
    phase.name === 'royale' && phase.dissolvedIds.has(offerId);

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

  // Tier overlay (animated score badge) shows up once the royale orchestrator
  // has revealed this card. We pull `score` straight off the scored map; the
  // badge handles the 0 → score tick itself via useMotionValue.
  const royaleEntry =
    phase.name === 'royale' && phase.revealed.has(offerId)
      ? phase.scored[offerId]
      : undefined;

  // Don't paint a card we don't yet have data for. The placeholder slot in
  // the canvas keeps the grid cell occupied, so nothing reflows.
  if (!offer) return null;
  if (isDissolved) return null;

  return (
    <motion.article
      layoutId={`card-${offerId}`}
      layout
      variants={cardVariants}
      initial="hidden"
      animate={variantKey}
      exit={EXIT_DISSOLVE}
      data-card-id={offerId}
      data-tier={isTier(variantKey) ? variantKey : 'none'}
      data-flipped={isCallInFlight ? 'true' : 'false'}
      className={cn(
        'gpu relative rounded-2xl overflow-hidden aspect-[3/4]',
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
      {royaleEntry ? (
        <CardTierBadge score={royaleEntry.score} tier={royaleEntry.tier} />
      ) : null}
    </motion.article>
  );
}
