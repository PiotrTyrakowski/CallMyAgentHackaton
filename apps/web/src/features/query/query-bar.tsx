import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { useFlow } from '@/stores/flow/flow-store-provider';

/**
 * Sticky header input. Source of truth for the query is the URL (`/q?text=`);
 * the local `value` state is only the in-flight buffer between keystrokes
 * and Enter. Submit behaviour branches on the current flow phase:
 *
 *   - idle / booked     → navigate to `/q?text=...` (loader → SpawnDriver
 *                         takes care of `submitQuery`)
 *   - any mid-flow      → dispatch `requestNewQuery(text)`; the store
 *                         transitions to `cancelling` and the
 *                         `CancelMidFlowOverlay` decides whether to navigate.
 *
 * Reading from router state (not a local effect) avoids the bidirectional
 * sync trap called out in spec §9.
 */
export function QueryBar() {
  const navigate = useNavigate();
  const requestNewQuery = useFlow((s) => s.requestNewQuery);
  const phaseName = useFlow((s) => s.phase.name);
  const currentText = useRouterState({
    select: (s) => {
      const match = s.matches.find((m) => m.routeId === '/q');
      if (!match) return '';
      const search = match.search as { text?: string } | undefined;
      return search?.text ?? '';
    },
  });
  const [value, setValue] = useState(currentText);

  // Submitting from idle / booked navigates straight to `/q` (the loader +
  // SpawnDriver pick up the new query). From any active phase — spawning,
  // calling, royale, pvp, booking, or the existing `cancelling` overlay —
  // we route through `requestNewQuery` so the store decides whether to swap
  // immediately (idle / booked) or stash a pending query for the overlay.
  const requiresOverlay =
    phaseName !== 'idle' && phaseName !== 'booked';

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (trimmed.length === 0) return;
        if (requiresOverlay) {
          requestNewQuery(trimmed);
          return;
        }
        void navigate({ to: '/q', search: { text: trimmed } });
      }}
      className="flex items-center gap-2"
    >
      <input
        type="search"
        name="query"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Where do you want to stay?"
        aria-label="Search for a place to stay"
        className={cn(
          'flex-1 rounded-full border border-card-border bg-card-bg',
          'px-4 py-2 text-sm shadow-sm outline-none',
          'placeholder:text-text-mute',
          'focus:border-text/30 focus:ring-2 focus:ring-text/10',
        )}
      />
      <button
        type="submit"
        className={cn(
          'rounded-full bg-text px-4 py-2 text-sm font-medium text-card-bg',
          'transition-opacity hover:opacity-90 active:opacity-80',
          'disabled:opacity-40',
        )}
        disabled={value.trim().length === 0}
      >
        Search
      </button>
    </form>
  );
}
