import * as Dialog from '@radix-ui/react-dialog';
import { History, X } from 'lucide-react';
import { useFlow } from '@/stores/flow/flow-store-provider';
import { useHistoryStore } from '@/stores/history/use-history-store';
import type { RunEntry } from '@/stores/history/types';
import { cn } from '@/lib/cn';

/**
 * Slide-in left panel listing past runs (spec §18). Each row is a deep link to
 * the run-detail route (stub: `/runs/:runId`, not yet implemented). The
 * `open` state is owned by the caller — this component is a pure controlled
 * dialog so the toggle can live wherever it makes sense in the header.
 */
export function HistorySidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const runs = useHistoryStore((s) => s.runs);
  const clear = useHistoryStore((s) => s.clear);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-modal bg-text/30 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          )}
        />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed left-0 top-0 z-modal h-full w-full max-w-sm',
            'border-r border-card-border bg-canvas-bg shadow-xl',
            'flex flex-col',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
            'duration-200',
          )}
        >
          <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
            <Dialog.Title className="flex items-center gap-2 font-display text-xl">
              <History className="h-5 w-5" aria-hidden="true" />
              History
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close history"
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-full',
                'text-text-mute transition-colors hover:text-text',
                'focus:outline-none focus:ring-2 focus:ring-text/10',
              )}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          {runs.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <p className="text-sm text-text-mute">
                No bookings yet. Once you complete a search,
                <br />
                it will appear here.
              </p>
            </div>
          ) : (
            <>
              <ul className="flex-1 overflow-y-auto px-2 py-3">
                {runs.map((entry) => (
                  <li key={entry.runId}>
                    <HistoryRow
                      entry={entry}
                      onNavigate={() => onOpenChange(false)}
                    />
                  </li>
                ))}
              </ul>
              <div className="border-t border-card-border px-4 py-3">
                <button
                  type="button"
                  onClick={() => clear()}
                  className={cn(
                    'text-xs text-text-mute underline-offset-2',
                    'hover:text-text hover:underline',
                  )}
                >
                  Clear history
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function HistoryRow({
  entry,
  onNavigate,
}: {
  entry: RunEntry;
  onNavigate: () => void;
}) {
  // Look up the winner name in the in-memory offer cache; gracefully fall
  // back to the raw id when it isn't loaded (e.g. fresh tab).
  const winnerName = useFlow((s) => {
    const offer = s.offers[entry.winnerId as keyof typeof s.offers];
    return offer?.name ?? null;
  });
  // `/runs/:runId` isn't a registered route yet — plain anchor stub keeps the
  // typed router happy until that route lands.
  return (
    <a
      href={`/runs/${encodeURIComponent(entry.runId)}`}
      onClick={(e) => {
        e.preventDefault();
        onNavigate();
      }}
      className={cn(
        'block rounded-lg px-3 py-2 transition-colors',
        'hover:bg-card-bg focus:bg-card-bg focus:outline-none',
      )}
    >
      <div className="truncate text-sm font-medium text-text">
        {entry.query}
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-3 text-xs text-text-mute">
        <span className="truncate">{winnerName ?? entry.winnerId}</span>
        <span className="shrink-0 tabular-nums">
          {formatRelative(entry.finishedAt)}
        </span>
      </div>
    </a>
  );
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function formatRelative(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const delta = Date.now() - then;
  if (delta < MINUTE) return 'just now';
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)}m ago`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)}h ago`;
  const days = Math.floor(delta / DAY);
  if (days < 7) return `${days}d ago`;
  const d = new Date(then);
  return d.toLocaleDateString();
}
