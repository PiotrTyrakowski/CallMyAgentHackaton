import { useEffect, useRef } from 'react';
import type { ZodType } from 'zod';
import { log } from '@/lib/log';

interface UseEventSourceOpts<T> {
  onMessage: (data: T) => void;
  schema: ZodType<T>;
  disabled?: boolean;
}

/**
 * Subscribe to a Server-Sent Events stream and dispatch each event to
 * `onMessage` after validating it against `schema` (spec §12).
 *
 * Design notes:
 * - `onMessage` and `schema` go through a ref so callers can pass inline
 *   arrow functions without tearing down the stream on every render.
 * - The effect only re-fires when `url` or `disabled` change.
 * - Hard 15s timeout: if the server never emits a terminal frame the stream
 *   closes itself rather than leaking the connection.
 * - Cleanup closes the EventSource so the connection drops on unmount.
 */
export function useEventSource<T>(
  url: string | null,
  opts: UseEventSourceOpts<T>,
): void {
  const handlersRef = useRef(opts);
  useEffect(() => {
    handlersRef.current = opts;
  });

  const disabled = opts.disabled ?? false;

  useEffect(() => {
    if (!url || disabled) return;
    const es = new EventSource(url);
    const timeout = setTimeout(() => {
      log.warn('SSE timeout', { url });
      es.close();
    }, 15_000);

    const handleMessage = (e: MessageEvent<string>): void => {
      try {
        const parsed = handlersRef.current.schema.parse(JSON.parse(e.data));
        handlersRef.current.onMessage(parsed);
      } catch (err) {
        log.error('Bad SSE payload', { url, err });
      }
    };

    const handleError = (): void => {
      // The connection naturally closes after our `controller.close()` on the
      // server side — EventSource surfaces that as an `error` with readyState
      // CLOSED. Clear the watchdog so we don't shout into the void.
      if (es.readyState === EventSource.CLOSED) clearTimeout(timeout);
    };

    es.addEventListener('message', handleMessage);
    es.addEventListener('error', handleError);

    return () => {
      clearTimeout(timeout);
      es.close();
    };
  }, [url, disabled]);
}
