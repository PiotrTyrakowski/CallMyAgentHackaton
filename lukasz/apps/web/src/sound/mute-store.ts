import { Howler } from 'howler';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Persisted mute toggle (spec §15). Default is muted-on so the demo never
 * blasts audio on first paint. Toggling syncs Howler's global mute flag so
 * existing playing sounds (e.g. the looping `ring`) silence instantly without
 * each call site re-checking.
 */
export interface MuteState {
  muted: boolean;
  toggle: () => void;
}

export const useMuteStore = create<MuteState>()(
  persist(
    (set, get) => ({
      muted: true,
      toggle: () => {
        const next = !get().muted;
        Howler.mute(next);
        set({ muted: next });
      },
    }),
    {
      name: 'cma-mute',
      version: 1,
      onRehydrateStorage: () => (state) => {
        // Apply rehydrated mute state to Howler so it matches the stored
        // preference before any sound plays.
        if (state) Howler.mute(state.muted);
      },
    },
  ),
);

// Apply default mute on module boot so calls that race the rehydrate still
// land on the correct value.
Howler.mute(useMuteStore.getState().muted);
