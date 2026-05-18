import { useEffect, useRef } from 'react';
import { useSounds } from '@/hooks/use-sounds';
import { useFlow } from '@/stores/flow/flow-store-provider';
import { sounds } from './sounds';

/**
 * Invisible bridge between flow phases and the Howler atlas (spec §15).
 *
 * Mount once at the root. Subscribes only to `phase.name` so unrelated state
 * churn doesn't re-fire transition effects. A ref-cached previous-phase value
 * lets us detect edges (`spawning → calling` etc.) without relying on a
 * dedicated state slice.
 *
 * Sound files don't exist yet, so each `play()` is a silent no-op until assets
 * land under `public/sounds/`. That keeps this safe to enable today.
 */
export function SoundOrchestrator() {
  const phaseName = useFlow((s) => s.phase.name);
  const royaleRevealedSize = useFlow((s) =>
    s.phase.name === 'royale' ? s.phase.revealed.size : 0,
  );
  const royaleScored = useFlow((s) =>
    s.phase.name === 'royale' ? s.phase.scored : null,
  );
  const royaleRevealed = useFlow((s) =>
    s.phase.name === 'royale' ? s.phase.revealed : null,
  );
  const { play } = useSounds();

  const prevPhaseRef = useRef(phaseName);
  const prevRevealedSizeRef = useRef(royaleRevealedSize);
  const seenRevealsRef = useRef<Set<string>>(new Set());

  // Phase transition edges.
  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (prev === phaseName) return;

    // Entering `calling` from `spawning` starts the looping ring; leaving
    // `calling` stops it. Spec §15: ring loops while calls fan out.
    if (prev === 'spawning' && phaseName === 'calling') {
      play('ring');
    }
    if (prev === 'calling' && phaseName !== 'calling') {
      sounds.ring.stop();
    }
    if (phaseName === 'booked') {
      sounds.ring.stop();
      play('success');
    }
    if (phaseName === 'idle' && prev !== 'idle') {
      // Defensive: any stray ring loop should die when we go idle.
      sounds.ring.stop();
    }

    prevPhaseRef.current = phaseName;
  }, [phaseName, play]);

  // Royale tier reveals: each newly-revealed offer triggers a chime based on
  // its tier (green vs gold). Reds dissolve silently to keep the audio low-key.
  useEffect(() => {
    if (
      phaseName !== 'royale' ||
      royaleScored === null ||
      royaleRevealed === null
    ) {
      seenRevealsRef.current.clear();
      prevRevealedSizeRef.current = 0;
      return;
    }
    if (royaleRevealedSize <= prevRevealedSizeRef.current) {
      prevRevealedSizeRef.current = royaleRevealedSize;
      return;
    }
    for (const id of royaleRevealed) {
      if (seenRevealsRef.current.has(id)) continue;
      seenRevealsRef.current.add(id);
      const tier = royaleScored[id]?.tier;
      if (tier === 'gold') play('goldFanfare');
      else if (tier === 'green') play('greenChime');
    }
    prevRevealedSizeRef.current = royaleRevealedSize;
  }, [
    phaseName,
    royaleRevealedSize,
    royaleRevealed,
    royaleScored,
    play,
  ]);

  return null;
}
