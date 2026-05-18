import { History } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { HistorySidebar } from './history-sidebar';

/**
 * Header icon button that opens the slide-in `HistorySidebar`. Open/closed
 * state stays component-local — it's ephemeral interaction state, not
 * something other modules need to read.
 */
export function HistoryToggle() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open history"
        title="History"
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-full',
          'border border-card-border bg-card-bg text-text-mute',
          'transition-colors hover:text-text active:opacity-80',
          'focus:outline-none focus:ring-2 focus:ring-text/10',
        )}
      >
        <History className="h-4 w-4" aria-hidden="true" />
      </button>
      <HistorySidebar open={open} onOpenChange={setOpen} />
    </>
  );
}
