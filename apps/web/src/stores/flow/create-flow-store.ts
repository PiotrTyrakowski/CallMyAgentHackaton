import type { ConfirmationCode, OfferId } from '@callmyagent/lib/ids';
import type { CallEvent, Offer, OfferTier } from '@callmyagent/lib/types';
import { enableMapSet } from 'immer';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { FlowInit, FlowPhase, FlowState } from './types';

// FSM variants carry `Set<OfferId>` (completedIds, revealed, dissolvedIds);
// without the MapSet plugin immer throws on the first `.add` call. The
// import has zero runtime cost on subsequent module loads.
enableMapSet();

const SPAWN_TARGET = 40 as const;

const idlePhase = (): FlowPhase => ({ name: 'idle' });

const spawningPhase = (query: string): FlowPhase => ({
  name: 'spawning',
  query,
  receivedIds: [],
});

export const createFlowStore = (init: FlowInit) =>
  create<FlowState>()(
    devtools(
      immer((set, get) => ({
        phase: init.initialQuery
          ? spawningPhase(init.initialQuery)
          : idlePhase(),
        calls: {},
        offers: {},
        lastQueryWasEmpty: false,

        async submitQuery(q) {
          set((draft) => {
            draft.phase = spawningPhase(q);
            draft.calls = {};
            // A fresh query clears the empty-result fallback flag so the silly
            // mascot stops showing once spawning resumes.
            draft.lastQueryWasEmpty = false;
            // Keep `offers` cache across submissions — Offer payloads are
            // immutable per id, and dropping them would force a re-fetch of
            // already-known data on every back-button trip.
          });
        },

        markEmptyQuery() {
          set((draft) => {
            draft.lastQueryWasEmpty = true;
            draft.phase = idlePhase();
            draft.calls = {};
          });
        },

        appendOffer(id) {
          set((draft) => {
            if (draft.phase.name !== 'spawning') return;
            // Idempotent: if the same id streams in twice (e.g. orchestrator
            // re-runs across StrictMode double-mount), don't double-append.
            if (draft.phase.receivedIds.includes(id)) return;
            draft.phase.receivedIds.push(id);
            if (draft.phase.receivedIds.length === SPAWN_TARGET) {
              const offerIds = draft.phase.receivedIds.slice();
              draft.phase = {
                name: 'calling',
                offerIds,
                completedIds: new Set<OfferId>(),
              };
            }
          });
        },

        setOffer(id, offer) {
          set((draft) => {
            draft.offers[id] = offer;
          });
        },

        recordCallEvent(id, ev) {
          set((draft) => {
            const list = draft.calls[id] ?? [];
            list.push(ev);
            draft.calls[id] = list;
            if (
              (ev.status === 'done' || ev.status === 'failed') &&
              draft.phase.name === 'calling'
            ) {
              draft.phase.completedIds.add(id);
            }
          });
        },

        markCallFailed(id, reason) {
          get().recordCallEvent(id, { status: 'failed', reason });
        },

        startRoyale(scored) {
          set((draft) => {
            const dissolveQueue: OfferId[] = [];
            for (const [offerId, info] of Object.entries(scored) as [
              OfferId,
              { tier: OfferTier; score: number },
            ][]) {
              if (info.tier === 'red') dissolveQueue.push(offerId);
            }
            draft.phase = {
              name: 'royale',
              scored,
              revealed: new Set<OfferId>(),
              dissolveQueue,
              dissolvedIds: new Set<OfferId>(),
            };
          });
        },

        revealOne(id) {
          set((draft) => {
            if (draft.phase.name !== 'royale') return;
            draft.phase.revealed.add(id);
          });
        },

        queueDissolve(_id) {
          // No-op for now (spec §8): dissolve animation lives in the
          // component layer; the queue field is reserved for future
          // server-driven prioritisation.
        },

        markDissolved(id) {
          set((draft) => {
            if (draft.phase.name !== 'royale') return;
            draft.phase.dissolvedIds.add(id);
          });
        },

        enterPvP(goldA, goldB) {
          set((draft) => {
            // Phase 4 will rewrite this variant to `{ goldA, goldB }` per spec
            // §8 (line 434 of the design doc) and switch to a single-pick
            // `pickPvP` reducer. Until then we keep the legacy deck shape so
            // the existing `swipeChallenger`/`finalizeWinner` machinery still
            // typechecks; only the *signature* moves now so the royale
            // orchestrator stops thinking in decks.
            draft.phase = {
              name: 'pvp',
              initialDeckSize: 2,
              remaining: [],
              winnerId: goldA,
              challengerId: goldB,
              decisions: [],
            };
          });
        },

        swipeChallenger(direction) {
          set((draft) => {
            if (draft.phase.name !== 'pvp') return;
            const { winnerId, challengerId } = draft.phase;
            const nextWinnerId =
              direction === 'right' ? challengerId : winnerId;
            const loserId = direction === 'right' ? winnerId : challengerId;
            draft.phase.decisions.push({ winnerId: nextWinnerId, loserId });
            draft.phase.winnerId = nextWinnerId;

            const next = draft.phase.remaining.shift();
            if (next === undefined) {
              draft.phase = { name: 'booking', winnerId: nextWinnerId };
              return;
            }
            draft.phase.challengerId = next;
          });
        },

        finalizeWinner() {
          set((draft) => {
            if (draft.phase.name !== 'pvp') return;
            draft.phase = { name: 'booking', winnerId: draft.phase.winnerId };
          });
        },

        confirmBooked(id, code) {
          set((draft) => {
            draft.phase = {
              name: 'booked',
              winnerId: id,
              confirmationCode: code,
            };
          });
        },

        requestNewQuery(q) {
          const phase = get().phase;
          if (phase.name === 'idle' || phase.name === 'booked') {
            void get().submitQuery(q);
            return;
          }
          if (phase.name === 'cancelling') {
            // Already showing the overlay — just swap which query is pending.
            set((draft) => {
              if (draft.phase.name !== 'cancelling') return;
              draft.phase.pendingQuery = q;
            });
            return;
          }
          // Snapshot the live phase BEFORE we overwrite it, so "Continue
          // current" can roll back to the exact spawning/calling/royale/pvp/
          // booking state. We grab it from `get()` (not the immer draft) to
          // avoid storing live draft proxies.
          const previousPhase = phase;
          set((draft) => {
            draft.phase = {
              name: 'cancelling',
              reason: 'newQuery',
              pendingQuery: q,
              previousPhase,
            };
          });
        },

        clearPendingNewQuery() {
          set((draft) => {
            if (draft.phase.name !== 'cancelling') return;
            // Restore the snapshot taken in `requestNewQuery` so the
            // interrupted phase resumes without losing call/royale progress.
            draft.phase = draft.phase.previousPhase;
          });
        },

        cancelMidFlow() {
          set((draft) => {
            draft.phase = idlePhase();
            draft.calls = {};
          });
        },

        resetToIdle() {
          set((draft) => {
            draft.phase = idlePhase();
            draft.calls = {};
          });
        },
      })),
      { name: `flow:${init.initialQuery ?? 'idle'}` },
    ),
  );

export type FlowStore = ReturnType<typeof createFlowStore>;

// Re-export ergonomic aliases so callers don't have to import types separately.
export type { ConfirmationCode, OfferId, CallEvent, Offer };
