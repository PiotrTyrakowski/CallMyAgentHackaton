import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RunEntry } from './types';

const STORAGE_KEY = 'cma-history';
const MAX_RUNS = 50;

export interface HistoryState {
  runs: RunEntry[];
  addRun(entry: RunEntry): void;
  clear(): void;
}

export const createHistoryStore = () =>
  create<HistoryState>()(
    persist(
      (set) => ({
        runs: [],
        addRun: (entry) =>
          set((state) => ({
            runs: [entry, ...state.runs].slice(0, MAX_RUNS),
          })),
        clear: () => set({ runs: [] }),
      }),
      {
        name: STORAGE_KEY,
        version: 1,
        partialize: (state) => ({ runs: state.runs }),
        migrate: (persisted, _fromVersion) =>
          persisted as { runs: RunEntry[] },
        onRehydrateStorage: () => (_state, error) => {
          if (error) {
            // TODO: swap to `log.warn` once apps/web/src/lib/log.ts lands.
            console.warn(
              '[CMA] history rehydration failed; clearing localStorage',
              { err: error },
            );
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {
              // ignore — storage unavailable (SSR, privacy mode)
            }
          }
        },
      },
    ),
  );

export type HistoryStore = ReturnType<typeof createHistoryStore>;
