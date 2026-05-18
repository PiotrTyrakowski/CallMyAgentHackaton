import type { OfferId } from '@callmyagent/lib/ids';
import type { CallEvent, Offer } from '@callmyagent/lib/types';
import { useNavigate } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { useFlow } from '@/stores/flow/flow-store-provider';
import { BookingControls } from './booking-controls';
import { BookingDetails } from './booking-details';
import { EasyBookSuccess } from './easy-book-success';
import { useBookFlow } from './use-book-flow';

interface NegotiatedOutcome {
  negotiatedPrice?: number;
}

/**
 * Extracts the most-recent negotiated price the agent talked the host down
 * to during the calling phase (mirrors the helper in ArenaCard so the
 * booking pane can show the same "agent saved you $X" line). Returns
 * `undefined` when the call ended without a price reduction.
 */
function deriveNegotiatedPrice(events: CallEvent[] | undefined) {
  if (!events) return undefined;
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (
      ev?.status === 'done' &&
      (ev as NegotiatedOutcome).negotiatedPrice !== undefined
    ) {
      return (ev as NegotiatedOutcome).negotiatedPrice;
    }
  }
  return undefined;
}

/**
 * Phase 5 booking pane (spec §10, BookingView). Mounts when the store is in
 * either `booking` (Easy Book button visible) or `booked` (confirmation
 * badge visible). The outer wrapper carries the same `layoutId` as the
 * arena card so Motion's `<LayoutGroup>` morphs the picked PvP card forward
 * into this centred pane via FLIP — no mount/unmount flash.
 *
 * Sub-components: <BookingDetails> renders the offer payload (images, host,
 * amenities); <BookingControls> wraps the Easy Book + back buttons;
 * <EasyBookSuccess> takes over once `booked`.
 */
export function BookingPane() {
  const phase = useFlow((s) =>
    s.phase.name === 'booking' || s.phase.name === 'booked' ? s.phase : null,
  );
  const winnerId = phase?.winnerId ?? null;
  const offer: Offer | null = useFlow((s) =>
    winnerId ? (s.offers[winnerId] ?? null) : null,
  );
  const events = useFlow((s) =>
    winnerId ? s.calls[winnerId] : undefined,
  );
  const resetToIdle = useFlow((s) => s.resetToIdle);
  const navigate = useNavigate();
  const { book, isPending } = useBookFlow();

  const negotiatedPrice = useMemo(
    () => deriveNegotiatedPrice(events),
    [events],
  );

  if (!phase || !winnerId || !offer) return null;

  const onStartNew = () => {
    resetToIdle();
    void navigate({ to: '/' });
  };

  return (
    <div className="grid place-items-center min-h-full p-6 sm:p-10">
      <motion.section
        layoutId={`card-${winnerId as OfferId}`}
        layout
        initial={false}
        className={cn(
          'gpu w-full max-w-2xl rounded-3xl overflow-hidden',
          'border-2 border-tier-gold bg-card-bg',
          'shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)]',
        )}
        style={{ boxShadow: '0 0 56px var(--color-tier-gold)' }}
        aria-labelledby="booking-pane-title"
      >
        <BookingDetails
          offer={offer}
          {...(negotiatedPrice !== undefined ? { negotiatedPrice } : {})}
        />

        <div className="border-t border-card-border bg-canvas-bg/40 p-6">
          {phase.name === 'booking' ? (
            <BookingControls
              onBook={book}
              onBack={resetToIdle}
              isPending={isPending}
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <EasyBookSuccess
                confirmationCode={phase.confirmationCode as string}
              />
              <button
                type="button"
                onClick={onStartNew}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full',
                  'bg-text px-5 py-2.5 text-sm font-medium text-card-bg',
                  'transition-opacity hover:opacity-90 active:opacity-80',
                  'focus:outline-none focus:ring-2 focus:ring-text/10',
                )}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Start a new search
              </button>
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}
