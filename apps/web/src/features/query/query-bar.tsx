import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Sticky header input. Source of truth for the query is the URL (`/q?text=`);
 * the local `value` state is only the in-flight buffer between keystrokes
 * and Enter. On submit we navigate, which re-runs the loader and the route's
 * effect dispatches `submitQuery` into the flow store.
 *
 * shadcn primitives aren't wired yet — plain Tailwind for now; this gets
 * upgraded when the design system lands.
 */
export function QueryBar() {
  const navigate = useNavigate();
  // Pre-fill from the current URL so reloads / back-navigation don't blank
  // the input. Reading from router state (not a local effect) avoids the
  // bidirectional sync trap called out in spec §9.
  const currentText = useRouterState({
    select: (s) => {
      const match = s.matches.find((m) => m.routeId === '/q');
      if (!match) return '';
      const search = match.search as { text?: string } | undefined;
      return search?.text ?? '';
    },
  });
  const [value, setValue] = useState(currentText);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (trimmed.length === 0) return;
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
