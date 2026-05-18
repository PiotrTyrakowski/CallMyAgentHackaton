import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiBook } from '@/api/client';
import { flowKeys } from '@/queries/keys';
import type { OfferId } from '@callmyagent/lib/ids';
import type { BookResponse } from '@/api/schemas';

interface BookVars {
  offerId: OfferId;
}

interface BookContext {
  previous: unknown;
}

/**
 * Booking mutation.
 *
 * Per spec §7: `retry: 0` (booking is NOT idempotent — a quiet retry could
 * double-charge the user). Optimistic snapshot on mutate, rollback on error,
 * and on settle we invalidate `flowKeys.all` plus `['history']` so the
 * history sidebar reflects the new (or reverted) booking immediately.
 */
export function useBookMutation() {
  const qc = useQueryClient();

  return useMutation<BookResponse, Error, BookVars, BookContext>({
    mutationFn: ({ offerId }) => apiBook(offerId),
    retry: 0,
    onMutate: async () => {
      // Pause any in-flight refetches so an in-flight resolve doesn't
      // overwrite our optimistic snapshot before onError can roll it back.
      await qc.cancelQueries({ queryKey: flowKeys.all });
      const previous = qc.getQueryData(flowKeys.all);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(flowKeys.all, ctx.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: flowKeys.all });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
}
