import { Volume2, VolumeX } from 'lucide-react';
import { useSounds } from '@/hooks/use-sounds';
import { cn } from '@/lib/cn';

/**
 * Header icon button for toggling global sound. Defaults muted (per spec §15)
 * so users must opt-in before any audio plays.
 */
export function MuteToggle() {
  const { muted, toggle } = useSounds();
  const Icon = muted ? VolumeX : Volume2;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      aria-pressed={!muted}
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full',
        'border border-card-border bg-card-bg text-text-mute',
        'transition-colors hover:text-text active:opacity-80',
        'focus:outline-none focus:ring-2 focus:ring-text/10',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
