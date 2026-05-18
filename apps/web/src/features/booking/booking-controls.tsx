import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

interface BookingControlsProps {
  onBook: () => void;
  onBack: () => void;
  isPending: boolean;
}

/**
 * Easy Book + "Back to results" pair shown while the store is in `booking`
 * (i.e. the user has picked a winner but hasn't confirmed). The Easy Book
 * button takes the visual weight (gold-tinted, primary CTA). While the
 * mutation is in flight both buttons disable and the primary shows a
 * spinner. The mutation has `retry: 0` and we leave the phase at `booking`
 * on error, so tapping again triggers a fresh `mutate`.
 */
export function BookingControls({
  onBook,
  onBack,
  isPending,
}: BookingControlsProps) {
  return (
    <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={onBack}
        disabled={isPending}
        className={cn(
          'rounded-full border border-card-border bg-card-bg',
          'px-4 py-2.5 text-sm font-medium text-text',
          'transition-colors hover:bg-canvas-bg active:opacity-80',
          'focus:outline-none focus:ring-2 focus:ring-text/10',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        Back to results
      </button>
      <button
        type="button"
        onClick={onBook}
        disabled={isPending}
        data-action="easy-book"
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full',
          'bg-tier-gold px-6 py-3 text-base font-semibold text-card-bg',
          'shadow-[0_0_24px_var(--color-tier-gold)]',
          'transition-transform hover:scale-[1.02] active:scale-[0.98]',
          'focus:outline-none focus:ring-4 focus:ring-tier-gold/40',
          'disabled:cursor-not-allowed disabled:opacity-70',
        )}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        )}
        {isPending ? 'Booking…' : 'Easy Book'}
      </button>
    </div>
  );
}
