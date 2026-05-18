import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from '@tanstack/react-router';
import { useFlow } from '@/stores/flow/flow-store-provider';
import { cn } from '@/lib/cn';

/**
 * Confirmation modal that intercepts a mid-flow query change (spec §16). When
 * the user submits a fresh query while a call/royale/PvP is in progress, the
 * flow store transitions to a `cancelling` phase holding the pending query;
 * this overlay reads that phase and offers two paths:
 *
 *   - "Continue current" → restore the prior phase via `clearPendingNewQuery`
 *   - "Start over"       → drop everything via `cancelMidFlow`, submit the new
 *                          query, and navigate to `/q?text=<encoded>`
 *
 * The modal is fully controlled by store state — closing via ESC or
 * backdrop click maps to "Continue current" so we never strand the user in
 * the cancelling phase without an active query running.
 */
export function CancelMidFlowOverlay() {
  const pendingQuery = useFlow((s) =>
    s.phase.name === 'cancelling' ? s.phase.pendingQuery : null,
  );
  const clearPendingNewQuery = useFlow((s) => s.clearPendingNewQuery);
  const cancelMidFlow = useFlow((s) => s.cancelMidFlow);
  const submitQuery = useFlow((s) => s.submitQuery);
  const navigate = useNavigate();

  const open = pendingQuery !== null;

  const onContinueCurrent = () => {
    clearPendingNewQuery();
  };

  const onStartOver = () => {
    if (pendingQuery === null) return;
    const text = pendingQuery;
    cancelMidFlow();
    // Fire-and-forget: navigate first so the `/q` route mounts and the
    // existing SpawnDriver picks up the submit; calling submitQuery here too
    // keeps the store in `spawning` even if navigation is intercepted.
    void submitQuery(text);
    void navigate({ to: '/q', search: { text } });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onContinueCurrent();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-modal bg-text/40 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-modal w-[min(440px,90vw)]',
            '-translate-x-1/2 -translate-y-1/2 rounded-2xl',
            'border border-card-border bg-card-bg p-6 shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
            'duration-150',
          )}
        >
          <Dialog.Title className="font-display text-2xl">
            Cancel current search?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-text-mute">
            You&rsquo;ll lose progress on the current query.
          </Dialog.Description>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onContinueCurrent}
              className={cn(
                'rounded-full border border-card-border bg-card-bg',
                'px-4 py-2 text-sm font-medium text-text',
                'transition-colors hover:bg-canvas-bg active:opacity-80',
                'focus:outline-none focus:ring-2 focus:ring-text/10',
              )}
            >
              Continue current
            </button>
            <button
              type="button"
              onClick={onStartOver}
              className={cn(
                'rounded-full bg-text px-4 py-2 text-sm font-medium text-card-bg',
                'transition-opacity hover:opacity-90 active:opacity-80',
                'focus:outline-none focus:ring-2 focus:ring-text/10',
              )}
            >
              Start over with &ldquo;
              <span className="font-normal italic">
                {truncate(pendingQuery ?? '', 32)}
              </span>
              &rdquo;
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}
