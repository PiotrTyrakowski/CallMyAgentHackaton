import type { ConfirmationCode, OfferId } from '@callmyagent/lib/ids';
import type { CallEvent, OfferTier } from '@callmyagent/lib/types';

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
      dissolveQueue: OfferId[];
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
  | { name: 'cancelling'; reason: 'newQuery'; pendingQuery: string };

export interface FlowState {
  phase: FlowPhase;
  calls: Record<OfferId, CallEvent[]>;

  // commands
  submitQuery(q: string): Promise<void>;
  appendOffer(id: OfferId): void;
  recordCallEvent(id: OfferId, ev: CallEvent): void;
  markCallFailed(id: OfferId, reason: string): void;
  startRoyale(
    scored: Record<OfferId, { tier: OfferTier; score: number }>,
  ): void;
  revealOne(id: OfferId): void;
  queueDissolve(id: OfferId): void;
  enterPvP(deck: OfferId[]): void;
  swipeChallenger(direction: 'left' | 'right'): void;
  finalizeWinner(): void;
  confirmBooked(id: OfferId, code: ConfirmationCode): void;
  requestNewQuery(q: string): void;
  cancelMidFlow(): void;
  resetToIdle(): void;
}

export interface FlowInit {
  initialQuery?: string;
}
