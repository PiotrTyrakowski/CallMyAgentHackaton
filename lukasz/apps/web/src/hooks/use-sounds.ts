import { useCallback } from 'react';
import { type SoundName, sounds } from '@/sound/sounds';
import { useMuteStore } from '@/sound/mute-store';

/**
 * Thin facade over the Howler atlas + mute store. Components call
 * `play('greenChime')` without needing to know about Howler internals.
 * Muting is global via `Howler.mute`, so `play` itself doesn't need a guard.
 */
export function useSounds() {
  const muted = useMuteStore((s) => s.muted);
  const toggle = useMuteStore((s) => s.toggle);

  const play = useCallback((name: SoundName) => {
    sounds[name].play();
  }, []);

  const stop = useCallback((name: SoundName) => {
    sounds[name].stop();
  }, []);

  return { play, stop, muted, toggle } as const;
}
