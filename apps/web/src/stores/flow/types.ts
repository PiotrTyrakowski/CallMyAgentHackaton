import type { ConfirmationCode, OfferId } from '@callmyagent/lib/ids';
import type { CallEvent, Offer, OfferTier } from '@callmyagent/lib/types';

/**
 * The flow phase IS the state shape (spec §8). Impossible combinations are
 * unrepresentable — every reducer/selector that branches on `phase.name`
 * should end with `const _: never = phase` to compile-fail on missing cases.
 */
export type FlowPhase =
  | { name: 'idle' }
  | { name: 'spawning'; query: string; receivedIds: OfferId[] }
  | { name: 'calling'; offerIds: OfferId[]; completedIds: Set<OfferId> }
  | {
      name: 'royale';
      scored: Record<OfferId, { tier: OfferTier; score: number }>;
      revealed: Set<OfferId>;
      /**
       * Red offer ids enqueued for dissolve in render-order. Producers append;
       * the dissolve-cascade orchestrator pops the head every ~80 ms.
       */
      dissolveQueue: OfferId[];
      /**
       * Offer ids whose dissolve animation has finished. OfferCard returns
       * `null` for these so AnimatePresence runs the exit; MasonryCanvas
       * substitutes an `<EmptySlot />` placeholder in the original slot so
       * the grid never reflows (spec §13, D4 — survivors stay in place).
       */
      dissolvedIds: Set<OfferId>;
    }
  | {
      name: 'pvp';
      initialDeckSize: number;
      remaining: OfferId[];
      winnerId: OfferId;
      challengerId: OfferId;
      decisions: { winnerId: OfferId; loserId: OfferId }[];
    }
  | { name: 'booking'; winnerId: OfferId }
  | { name: 'booked'; winnerId: OfferId; confirmationCode: ConfirmationCode }
  | {
      name: 'cancelling';
      reason: 'newQuery';
      pendingQuery: string;
      /**
       * Snapshot of the phase the user interrupted, so the cancel overlay can
       * roll back to it when they pick "Continue current".
       */
      previousPhase: Exclude<FlowPhase, { name: 'cancelling' }>;
    };

export interface FlowState {
  phase: FlowPhase;
  calls: Record<OfferId, CallEvent[]>;
  /**
   * Per-offer cache of the full Offer payload, keyed by id. Populated by the
   * spawn orchestrator as cards arrive so that downstream views (OfferCard,
   * BookingPane, etc.) can render rich data without re-fetching. Independent
   * of `phase`/`calls` so it persists across phase transitions.
   */
  offers: Record<OfferId, Offer>;
  /**
   * Set when a spawn finishes with zero offers — drives the silly empty
   * fallback (spec §6). Cleared when the user submits a fresh query.
   */
  lastQueryWasEmpty: boolean;

  // commands
  submitQuery(q: string): Promise<void>;
  appendOffer(id: OfferId): void;
  setOffer(id: OfferId, offer: Offer): void;
  /** Spawn finished with zero results; bounce phase back to idle. */
  markEmptyQuery(): void;
  recordCallEvent(id: OfferId, ev: CallEvent): void;
  markCallFailed(id: OfferId, reason: string): void;
  startRoyale(
    scored: Record<OfferId, { tier: OfferTier; score: number }>,
  ): void;
  revealOne(id: OfferId): void;
  queueDissolve(id: OfferId): void;
  /**
   * Mark a card as fully dissolved. After this, OfferCard returns null and
   * MasonryCanvas substitutes an EmptySlot in the same grid cell.
   */
  markDissolved(id: OfferId): void;
  /**
   * Enter PvP with the two gold offers (spec §8, lines 434/450 of the design
   * doc). The Phase 4 agent will swap the `pvp` variant shape; for now we keep
   * the legacy `{ winnerId, challengerId, remaining, decisions }` payload but
   * accept the new `(goldA, goldB)` argument shape so the royale → PvP edge
   * stops thinking in terms of decks.
   */
  enterPvP(goldA: OfferId, goldB: OfferId): void;
  swipeChallenger(direction: 'left' | 'right'): void;
  finalizeWinner(): void;
  confirmBooked(id: OfferId, code: ConfirmationCode): void;
  requestNewQuery(q: string): void;
  /** Dismiss the cancel overlay and restore the interrupted phase. */
  clearPendingNewQuery(): void;
  cancelMidFlow(): void;
  resetToIdle(): void;
}

export interface FlowInit {
  initialQuery?: string;
}
