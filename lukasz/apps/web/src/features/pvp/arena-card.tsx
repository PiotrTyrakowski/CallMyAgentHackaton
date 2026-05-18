import type { OfferId } from '@callmyagent/lib/ids';
import { motion, type TargetAndTransition } from 'motion/react';
import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { cardVariants } from '@/motion/card-variants';
import { useFlow } from '@/stores/flow/flow-store-provider';

interface ArenaCardProps {
  offerId: OfferId;
  onPick: () => void;
}

interface NegotiatedOutcome {
  /** Final per-night price the agent talked the host down to, if any. */
  negotiatedPrice?: number;
}

/**
 * The picked card morphs forward into the BookingPane via its shared
 * `layoutId`; the unpicked card collapses in place. Inlining the exit target
 * avoids dragging in `cardVariants.exit_dissolve` (which is the *royale*
 * red-card death animation — colorful, blurry, theatrical). The PvP loser
 * just bows out — no hue rotation, no saturation drain.
 */
const EXIT_DEFEAT: TargetAndTransition = {
  opacity: 0,
  scale: 0.85,
  transition: { duration: 0.35, ease: [0.4, 0, 1, 1] },
};

/**
 * Picks the most flattering hero image and the agent's last negotiated price
 * (if any) for the arena card display. Pure — keeps the component body small.
 */
function useArenaCardData(offerId: OfferId) {
  const offer = useFlow((s) => s.offers[offerId]);
  const events = useFlow((s) => s.calls[offerId]);

  return useMemo(() => {
    if (!offer) return null;
    const heroImage = offer.images[0];
    let negotiatedPrice: number | undefined;
    if (events) {
      // Walk backward — the most recent `done` event carries the final
      // negotiated price. We don't care about intermediate utterances here.
      for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i];
        if (
          ev?.status === 'done' &&
          (ev as NegotiatedOutcome).negotiatedPrice !== undefined
        ) {
          negotiatedPrice = (ev as NegotiatedOutcome).negotiatedPrice;
          break;
        }
      }
    }
    const savings =
      negotiatedPrice !== undefined
        ? Math.max(0, Math.round(offer.pricePerNight - negotiatedPrice))
        : 0;
    return { offer, heroImage, negotiatedPrice, savings };
  }, [offer, events]);
}

/**
 * Large clickable variant of the offer card used in the PvP arena (spec §10).
 * Reuses the canvas card's `layoutId="card-${offerId}"` so Motion's
 * `<LayoutGroup>` morphs it from its masonry slot into the arena slot, then
 * forward into the BookingPane once picked.
 *
 * The whole card is a `<motion.button>` — primary input is *click* (the spec
 * mandate is "just pick between two best at end. thats all"); the wrapper
 * gives keyboard focus + Enter/Space activation for free.
 */
export function ArenaCard({ offerId, onPick }: ArenaCardProps) {
  const data = useArenaCardData(offerId);

  if (!data) return null;
  const { offer, heroImage, negotiatedPrice, savings } = data;
  const displayPrice = negotiatedPrice ?? offer.pricePerNight;

  return (
    <motion.button
      type="button"
      layoutId={`card-${offerId}`}
      layout
      variants={cardVariants}
      initial="hidden"
      animate="gold"
      exit={EXIT_DEFEAT}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={onPick}
      data-card-id={offerId}
      data-arena="true"
      aria-label={`Pick ${offer.name}`}
      className={cn(
        'gpu group relative w-[520px] max-w-[42vw] rounded-2xl overflow-hidden',
        'border-2 border-tier-gold bg-card-bg text-left',
        'shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)]',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-tier-gold/40',
        'cursor-pointer',
      )}
      style={{ boxShadow: '0 0 48px var(--color-tier-gold)' }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-canvas-bg">
        {heroImage ? (
          <img
            src={heroImage}
            alt={offer.name}
            width={1040}
            height={780}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-sm text-text-mute">
            no image
          </div>
        )}
        {savings > 0 ? (
          <span
            data-outcome="negotiated"
            className={cn(
              'absolute left-3 top-3 rounded-full px-3 py-1.5',
              'bg-tier-green/95 text-card-bg shadow-md backdrop-blur',
              'font-mono text-sm font-semibold tabular-nums',
            )}
          >
            -${savings}/night
          </span>
        ) : null}
        <span
          className={cn(
            'absolute right-3 top-3 rounded-full px-3 py-1.5',
            'bg-card-bg/95 font-mono text-sm font-semibold tabular-nums shadow-md backdrop-blur',
          )}
        >
          {offer.currency} {displayPrice}
          <span className="text-text-mute"> /night</span>
        </span>
      </div>

      <div className="flex flex-col gap-3 p-6">
        <h3
          className="font-display text-3xl leading-tight tracking-tight line-clamp-2"
          title={offer.name}
        >
          {offer.name}
        </h3>

        <div className="flex items-center gap-3 text-sm text-text-mute">
          <span className="tabular-nums">
            {'★'.repeat(Math.round(offer.starRating))}
            <span className="text-text-mute/60">
              {'★'.repeat(5 - Math.round(offer.starRating))}
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {offer.guestRating.toFixed(1)}
            <span className="text-text-mute/70"> ({offer.reviewCount})</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>{offer.address.city}</span>
        </div>

        {savings > 0 && negotiatedPrice !== undefined ? (
          <p className="font-mono text-xs text-tier-green tabular-nums">
            Was {offer.currency} {offer.pricePerNight}/night — agent
            negotiated to {offer.currency} {negotiatedPrice}.
          </p>
        ) : null}

        {offer.amenities.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5 pt-1">
            {offer.amenities.slice(0, 5).map((chip) => (
              <li
                key={chip}
                className={cn(
                  'rounded-full border border-card-border bg-canvas-bg',
                  'px-2.5 py-1 font-mono text-[11px] text-text-mute',
                )}
              >
                {chip}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </motion.button>
  );
}
