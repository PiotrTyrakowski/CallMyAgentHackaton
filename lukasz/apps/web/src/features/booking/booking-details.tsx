import type { Offer } from '@callmyagent/lib/types';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';

interface BookingDetailsProps {
  offer: Offer;
  /** Final per-night price the agent negotiated, when below `pricePerNight`. */
  negotiatedPrice?: number;
}

/**
 * Visual body of the booking pane: hero image, title, address, stay dates,
 * total price (with negotiated savings line), full amenity list, host info.
 * Pure — owns no state. Lives next to BookingPane so the morph wrapper can
 * size itself to the rendered content.
 */
export function BookingDetails({
  offer,
  negotiatedPrice,
}: BookingDetailsProps) {
  const heroImage = offer.images[0];
  const effectivePerNight = negotiatedPrice ?? offer.pricePerNight;
  const effectiveTotal = negotiatedPrice
    ? Math.round(negotiatedPrice * offer.nights)
    : offer.totalPrice;
  const savings =
    negotiatedPrice !== undefined
      ? Math.max(0, Math.round(offer.pricePerNight - negotiatedPrice))
      : 0;
  const hostResponsiveness = offer.hostName ? 'Verified host' : undefined;

  return (
    <div className="flex flex-col">
      <div className="relative aspect-[16/9] overflow-hidden bg-canvas-bg">
        {heroImage ? (
          <motion.img
            layout="position"
            src={heroImage}
            alt={offer.name}
            width={1280}
            height={720}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover"
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
              'absolute left-4 top-4 rounded-full px-3 py-1.5',
              'bg-tier-green/95 text-card-bg shadow-md backdrop-blur',
              'font-mono text-sm font-semibold tabular-nums',
            )}
          >
            -${savings}/night
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-5 px-6 pb-6 pt-5 sm:px-8 sm:pt-7">
        <header className="space-y-2">
          <h2
            id="booking-pane-title"
            className="font-display text-3xl leading-tight tracking-tight sm:text-4xl"
          >
            {offer.name}
          </h2>
          <p className="text-sm text-text-mute">
            {offer.address.street}, {offer.address.city},{' '}
            {offer.address.region}
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-widest text-text-mute">
              Check-in
            </dt>
            <dd className="mt-0.5 tabular-nums">{offer.checkIn}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-widest text-text-mute">
              Check-out
            </dt>
            <dd className="mt-0.5 tabular-nums">{offer.checkOut}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-widest text-text-mute">
              Nights
            </dt>
            <dd className="mt-0.5 tabular-nums">{offer.nights}</dd>
          </div>
        </dl>

        <div className="rounded-xl border border-card-border bg-canvas-bg/60 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-text-mute">Total</span>
            <span className="font-display text-2xl tabular-nums">
              {offer.currency} {effectiveTotal}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3 text-xs text-text-mute">
            <span>per night</span>
            <span className="font-mono tabular-nums">
              {offer.currency} {effectivePerNight}
            </span>
          </div>
          {savings > 0 && negotiatedPrice !== undefined ? (
            <p className="mt-2 font-mono text-xs text-tier-green tabular-nums">
              Agent negotiated from {offer.currency} {offer.pricePerNight}/night
              to {offer.currency} {negotiatedPrice}/night.
            </p>
          ) : null}
        </div>

        {offer.amenities.length > 0 ? (
          <div className="space-y-2">
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-text-mute">
              Amenities
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {offer.amenities.map((chip) => (
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
          </div>
        ) : null}

        {offer.hostName ? (
          <div className="flex items-center justify-between gap-3 border-t border-card-border pt-4 text-sm">
            <span className="font-medium text-text">{offer.hostName}</span>
            {hostResponsiveness ? (
              <span
                className={cn(
                  'rounded-full bg-tier-green/15 px-2.5 py-1',
                  'font-mono text-[11px] uppercase tracking-wider text-tier-green',
                )}
              >
                {hostResponsiveness}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
