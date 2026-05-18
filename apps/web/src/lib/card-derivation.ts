import type { OfferId } from '@callmyagent/lib/ids';
import type { CallEvent, OfferTier } from '@callmyagent/lib/types';

// One source of truth (spec §10): given the FlowState slice and an offer id,
// return the `cardVariants` key the card should animate to. Pure — no React,
// no store internals — so it stays trivial to unit test and to fork into
// stories.
//
// We intentionally model only the slice we touch (`FlowState` lives in the
// store; importing it here would create a circular dep web → store → lib).

export type CardVariantKey =
  | 'hidden'
  | 'idle'
  | 'dialing'
  | 'on_call'
  | 'negotiating'
  | 'red'
  | 'neutral'
  | 'green'
  | 'gold'
  | 'exit_dissolve';

export type FlowPhaseLike =
  | { name: 'idle' }
  | { name: 'spawning'; receivedIds: OfferId[] }
  | { name: 'calling'; offerIds: OfferId[]; completedIds: Set<OfferId> }
  | {
      name: 'royale';
      scored: Record<OfferId, { tier: OfferTier; score: number }>;
      revealed: Set<OfferId>;
      dissolveQueue: OfferId[];
      dissolvedIds: Set<OfferId>;
    }
  | {
      name: 'pvp';
      winnerId: OfferId;
      challengerId: OfferId;
      remaining: OfferId[];
    }
  | { name: 'booking'; winnerId: OfferId }
  | { name: 'booked'; winnerId: OfferId }
  | { name: 'cancelling' };

export interface FlowStateLike {
  phase: FlowPhaseLike;
  calls: Record<OfferId, CallEvent[] | undefined>;
}

// The "current call status" for a card — last event wins. `idle` if no events.
function currentCallStatus(events: CallEvent[] | undefined): CallEvent['status'] | 'idle' {
  if (!events || events.length === 0) return 'idle';
  return events[events.length - 1]?.status ?? 'idle';
}

export function derivedCardPhase(
  state: FlowStateLike,
  offerId: OfferId
): CardVariantKey {
  const { phase } = state;

  // No offer in flight at all → hide.
  if (phase.name === 'idle' || phase.name === 'cancelling') return 'hidden';

  // Spawning: cards exist in the receivedIds list but no call has begun.
  if (phase.name === 'spawning') {
    return phase.receivedIds.includes(offerId) ? 'idle' : 'hidden';
  }

  // Calling: drive variant directly off the latest event.
  if (phase.name === 'calling') {
    if (!phase.offerIds.includes(offerId)) return 'hidden';
    const status = currentCallStatus(state.calls[offerId]);
    switch (status) {
      case 'dialing':
        return 'dialing';
      case 'on_call':
        return 'on_call';
      case 'negotiating':
        return 'negotiating';
      case 'done':
      case 'failed':
      case 'idle':
        return 'idle';
    }
  }

  // Royale: dissolved cards animate via the AnimatePresence `exit` prop in
  // OfferCard (not the steady-state variant), so we don't return
  // `exit_dissolve` here. Unrevealed cards sit at `idle`; revealed cards take
  // their assigned tier color.
  if (phase.name === 'royale') {
    const entry = phase.scored[offerId];
    if (!entry) return 'hidden';
    if (!phase.revealed.has(offerId)) return 'idle';
    return entry.tier;
  }

  // PvP: only the two arena cards remain visible; everything else is hidden
  // behind the deck stack (the deck render handles its own visuals).
  if (phase.name === 'pvp') {
    if (offerId === phase.winnerId || offerId === phase.challengerId) {
      return 'gold';
    }
    return 'hidden';
  }

  // Booking / booked: only the winner card stays mounted, in its `gold` glow.
  if (phase.name === 'booking' || phase.name === 'booked') {
    return offerId === phase.winnerId ? 'gold' : 'hidden';
  }

  // Exhaustiveness guard — adding a new phase forces this to fail to compile.
  const _exhaustive: never = phase;
  void _exhaustive;
  return 'hidden';
}
