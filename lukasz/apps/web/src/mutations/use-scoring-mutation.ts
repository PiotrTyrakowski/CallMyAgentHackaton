import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiScoring } from '@/api/client';
import { flowKeys } from '@/queries/keys';
import type {
  ScoringRequest,
  ScoringResponse,
} from '@/api/schemas';

/**
 * Scoring mutation.
 *
 * Idempotent enough — scoring is deterministic given the same
 * (offerIds, calls) tuple, so re-running yields the same tier assignment.
 * No optimistic snapshot / rollback. We still invalidate `flowKeys.all` on
 * settle so any cached scoring entry under the same key gets refreshed if
 * the user re-runs with a different transcript.
 *
 * Per spec §7 default: `retry: 0` for mutations (user explicitly re-triggers).
 */
export function useScoringMutation() {
  const qc = useQueryClient();

  return useMutation<ScoringResponse, Error, ScoringRequest>({
    mutationFn: (payload) => apiScoring(payload),
    retry: 0,
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: flowKeys.scoring(vars.offerIds) });
    },
  });
}
