import { createHistoryStore, type HistoryStore } from './create-history-store';

/**
 * Singleton history store. Unlike the per-request flow store (which needs a
 * fresh instance per route mount to keep tests/SSR isolated), history is a
 * user-scoped, localStorage-backed record that has exactly one source of
 * truth in the running tab.
 */
export const useHistoryStore: HistoryStore = createHistoryStore();
