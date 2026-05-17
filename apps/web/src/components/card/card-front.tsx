import type { Offer } from '@callmyagent/lib/types';
import { cn } from '@/lib/cn';

interface CardFrontProps {
  offer: Offer;
  className?: string;
}

/**
 * Pure visual face of an offer card (spec §10). The motion wrapper (layoutId,
 * variants) lives in `<OfferCard>` — this component just paints.
 *
 * Width/height attributes on the image reserve aspect-ratio space so the
 * masonry slot doesn't reflow when the bitmap decodes (CLS guard from spec
 * §20). `loading="lazy"` + `decoding="async"` keep first-paint cheap.
 */
export function CardFront({ offer, className }: CardFrontProps) {
  const heroImage = offer.images[0];
  // Only the first three amenity chips fit comfortably in the card width.
  // The rest are surfaced on the call face / detail view.
  const chips = offer.amenities.slice(0, 3);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="relative aspect-[3/2] overflow-hidden bg-canvas-bg">
        {heroImage ? (
          <img
            src={heroImage}
            alt={offer.name}
            width={600}
            height={400}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-xs text-text-mute">
            no image
          </div>
        )}
        <span
          className={cn(
            'absolute right-2 top-2 rounded-full bg-card-bg/95 px-2.5 py-1',
            'font-mono text-[11px] font-medium tabular-nums shadow-sm backdrop-blur',
          )}
        >
          {offer.currency} {offer.pricePerNight}
          <span className="text-text-mute"> /night</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3
          className="font-display text-lg leading-tight tracking-tight line-clamp-2"
          title={offer.name}
        >
          {offer.name}
        </h3>

        <div className="flex items-center gap-2 text-xs text-text-mute">
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
        </div>

        {chips.length > 0 ? (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {chips.map((chip) => (
              <li
                key={chip}
                className={cn(
                  'rounded-full border border-card-border bg-canvas-bg',
                  'px-2 py-0.5 font-mono text-[10px] text-text-mute',
                )}
              >
                {chip}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
