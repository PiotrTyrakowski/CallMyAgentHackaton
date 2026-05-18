import type { OfferId } from '@callmyagent/lib/ids';
import { useCallStream } from './use-call-stream';

interface CallSubscriberProps {
  offerId: OfferId;
}

/**
 * Headless component whose only job is to mount `useCallStream(offerId)` for
 * the duration of the calling phase. Rendering nothing keeps the orchestrator
 * a single React node (vs a custom registry); unmounting on phase change
 * closes the EventSource cleanly via the hook's cleanup.
 */
export function CallSubscriber({ offerId }: CallSubscriberProps) {
  useCallStream(offerId);
  return null;
}
