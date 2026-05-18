import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/cn';

/**
 * Cheerful fallback rendered when a search produces zero offers (spec §6).
 * Mascot is an inline SVG so it doesn't add a network request; the sample
 * query link gives the user a one-click recovery path back into the demo.
 */
export function SillyEmpty() {
  return (
    <div className="grid place-items-center p-12">
      <div className="text-center space-y-5 max-w-md">
        <MascotSvg />
        <div className="space-y-2">
          <h2 className="font-display text-3xl tracking-tight">
            No stays found there.
          </h2>
          <p className="text-text-mute">Try something else?</p>
        </div>
        <Link
          to="/q"
          search={{ text: 'cozy apartment in SF' }}
          className={cn(
            'inline-block rounded-full bg-text px-5 py-2',
            'text-sm font-medium text-card-bg',
            'transition-opacity hover:opacity-90 active:opacity-80',
          )}
        >
          Try a sample query
        </Link>
      </div>
    </div>
  );
}

function MascotSvg() {
  return (
    <svg
      role="img"
      aria-label="A sad cartoon stick figure"
      viewBox="0 0 120 140"
      className="mx-auto h-32 w-32 text-text-mute"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Sad cartoon stick figure</title>
      {/* Head */}
      <circle cx="60" cy="38" r="22" />
      {/* Eyes */}
      <circle cx="51" cy="34" r="2" fill="currentColor" stroke="none" />
      <circle cx="69" cy="34" r="2" fill="currentColor" stroke="none" />
      {/* Frown */}
      <path d="M50 50 Q60 42 70 50" />
      {/* Tear */}
      <path d="M50 38 Q49 44 51 46 Q53 44 52 38" fill="currentColor" stroke="none" opacity={0.7} />
      {/* Body */}
      <path d="M60 60 L60 100" />
      {/* Arms slumped */}
      <path d="M60 72 L42 92" />
      <path d="M60 72 L78 92" />
      {/* Legs */}
      <path d="M60 100 L46 128" />
      <path d="M60 100 L74 128" />
    </svg>
  );
}
