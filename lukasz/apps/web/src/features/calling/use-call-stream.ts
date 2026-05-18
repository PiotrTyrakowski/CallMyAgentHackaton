import type { OfferId } from '@callmyagent/lib/ids';
import type { CallEvent } from '@callmyagent/lib/types';
import { useCallback } from 'react';
import type { z } from 'zod';
import { callEventSchema } from '@/api/schemas';
import { useEventSource } from '@/hooks/use-event-source';
import { useFlow } from '@/stores/flow/flow-store-provider';

type CallEventInput = z.infer<typeof callEventSchema>;

/**
 * Zod's `.optional()` yields `T | undefined`, but the lib's `CallEvent` uses
 * `T?` shape (no explicit `undefined` under `exactOptionalPropertyTypes`).
 * Strip absent optionals so the cast is sound.
 */
function toCallEvent(raw: CallEventInput): CallEvent {
  if (raw.status === 'done') {
    const { negotiatedPrice, hostResponsiveness } = raw;
    return {
      status: 'done',
      ...(negotiatedPrice !== undefined ? { negotiatedPrice } : {}),
      ...(hostResponsiveness !== undefined ? { hostResponsiveness } : {}),
    };
  }
  return raw;
}

/**
 * Per-offer SSE subscription. Mount one of these (via a hidden `<CallSubscriber>`)
 * for each card we want to dial — the hook handles connection lifecycle and
 * pipes each validated event into the flow store via `recordCallEvent`.
 *
 * Unmounting closes the EventSource (via `useEventSource`'s cleanup), which
 * is how the orchestrator stops dialing when a phase transitions away.
 */
export function useCallStream(offerId: OfferId): void {
  const recordCallEvent = useFlow((s) => s.recordCallEvent);

  const onMessage = useCallback(
    (ev: CallEventInput) => {
      recordCallEvent(offerId, toCallEvent(ev));
    },
    [offerId, recordCallEvent],
  );

  useEventSource(`/api/calls/${offerId}/events`, {
    onMessage,
    schema: callEventSchema,
  });
}
