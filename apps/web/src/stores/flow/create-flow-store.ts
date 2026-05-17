import type { ConfirmationCode, OfferId } from '@callmyagent/lib/ids';
import type { CallEvent, Offer, OfferTier } from '@callmyagent/lib/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { FlowInit, FlowPhase, FlowState } from './types';

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

        async submitQuery(q) {
          set((draft) => {
            draft.phase = spawningPhase(q);
            draft.calls = {};
            // Keep `offers` cache across submissions — Offer payloads are
            // immutable per id, and dropping them would force a re-fetch of
            // already-known data on every back-button trip.
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

        enterPvP(deck) {
          set((draft) => {
            const first = deck[0];
            const second = deck[1];
            if (first === undefined || second === undefined) {
              // Degenerate deck (<2 cards) — short-circuit straight to booking
              // if we have at least one, else back to idle.
              if (first !== undefined) {
                draft.phase = { name: 'booking', winnerId: first };
              } else {
                draft.phase = idlePhase();
              }
              return;
            }
            draft.phase = {
              name: 'pvp',
              initialDeckSize: deck.length,
              remaining: deck.slice(2),
              winnerId: first,
              challengerId: second,
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
          set((draft) => {
            draft.phase = {
              name: 'cancelling',
              reason: 'newQuery',
              pendingQuery: q,
            };
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
