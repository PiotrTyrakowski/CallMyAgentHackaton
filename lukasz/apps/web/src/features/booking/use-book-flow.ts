import { confirmationCode as toConfirmationCode } from '@callmyagent/lib/ids';
import confetti from 'canvas-confetti';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useBookMutation } from '@/mutations/use-book-mutation';
import { useFlow } from '@/stores/flow/flow-store-provider';
import { useHistoryStore } from '@/stores/history/use-history-store';

/**
 * Wires the booking phase to the API mutation + cross-cutting side effects:
 * confirmation reducer, history append, success confetti, error toast. The
 * caller (BookingPane) just invokes `book()` from the click handler and
 * renders against `isPending` / `error`.
 *
 * On success we (1) flip the store to `booked` so the pane re-renders with
 * the confirmation badge, (2) push a RunEntry into the history store so the
 * sidebar reflects it, and (3) fire a one-shot confetti burst. On error we
 * surface a sonner toast and leave the phase at `booking` so the user can
 * tap Easy Book again — the mutation itself is `retry: 0` (booking is not
 * idempotent, see `use-book-mutation.ts`).
 */
export function useBookFlow(): {
  book: () => void;
  isPending: boolean;
  error: Error | null;
} {
  const winnerId = useFlow((s) =>
    s.phase.name === 'booking' || s.phase.name === 'booked'
      ? s.phase.winnerId
      : null,
  );
  const currentQuery = useFlow((s) => s.currentQuery);
  const confirmBooked = useFlow((s) => s.confirmBooked);
  const addRun = useHistoryStore((s) => s.addRun);
  const mutation = useBookMutation();

  const book = useCallback(() => {
    if (!winnerId) return;
    mutation.mutate(
      { offerId: winnerId },
      {
        onSuccess: (data) => {
          const code = toConfirmationCode(data.confirmationCode);
          confirmBooked(winnerId, code);
          addRun({
            runId:
              typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `run-${Date.now().toString(36)}-${Math.random()
                    .toString(36)
                    .slice(2, 10)}`,
            // `currentQuery` is set by `submitQuery` and threaded through the
            // whole session; falling back to an empty string keeps the row
            // shape valid for the (effectively impossible) case where the
            // user lands in booking without a query in the store.
            query: currentQuery ?? '',
            winnerId,
            confirmationCode: data.confirmationCode,
            finishedAt: data.bookedAt,
          });
          // One-shot confetti — fires AFTER the store flip so the booked
          // confirmation badge animates in alongside the burst.
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        },
        onError: () => {
          // Keep the phase at `booking` so the Easy Book button stays
          // mounted and the user can retry by tapping again.
          toast.error('Booking failed. Try again?');
        },
      },
    );
  }, [winnerId, currentQuery, confirmBooked, addRun, mutation]);

  return {
    book,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
