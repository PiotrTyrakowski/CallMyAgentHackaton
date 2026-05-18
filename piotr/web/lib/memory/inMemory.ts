// Process-local fallback adapter. Used when SUPERMEMORY_API_KEY isn't set:
// the app still boots, preferences still accumulate within a single server
// lifetime, but nothing persists across restarts and no knowledge is shared
// across users.
//
// This is also the right thing to swap in for unit tests.

import type {
  CallContext,
  GeoFact,
  GeoLevel,
  MemoryAdapter,
  ParsedHints,
  Signal,
  UserContext,
  UseCase,
} from "./types";
import type { Offer } from "../types";
import {
  buildGeoFactFromCall,
  buildGeoFactFromReview,
  parentChain,
  placeFromOffer,
} from "./geo";
import { probesForUseCase } from "./useCases";

interface UserStore {
  signals: Signal[];
}

const userStores = new Map<string, UserStore>();
const geoFacts: GeoFact[] = [];
const geoFactById = new Map<string, GeoFact>();

function store(userId: string): UserStore {
  let s = userStores.get(userId);
  if (!s) {
    s = { signals: [] };
    userStores.set(userId, s);
  }
  return s;
}

function upsertGeoFact(fact: GeoFact) {
  const existing = geoFactById.get(fact.customId);
  if (existing) {
    Object.assign(existing, fact);
    return;
  }
  geoFactById.set(fact.customId, fact);
  geoFacts.push(fact);
}

// Quick aggregator — given a user's signals, what does it look like they want
// for this specific use case? Returns short hint strings the scorer/call
// prompt can consume directly.
function summarizeForUseCase(signals: Signal[], useCase: UseCase): string[] {
  const acceptedForCase: Offer[] = [];
  const rejectedForCase: Offer[] = [];
  let lastQueryUseCase: UseCase | undefined;

  for (const s of signals) {
    if (s.kind === "query_submitted") {
      lastQueryUseCase = s.useCase;
      continue;
    }
    // Only attribute swipes to the most recently observed use case.
    if (lastQueryUseCase !== useCase) continue;
    if (s.kind === "offer_accepted" || s.kind === "offer_booked") {
      acceptedForCase.push(s.offer);
    } else if (s.kind === "offer_rejected") {
      rejectedForCase.push(s.offer);
    }
  }

  const hints: string[] = [];
  if (acceptedForCase.length) {
    const avgPrice =
      acceptedForCase.reduce((a, o) => a + o.originalPrice, 0) /
      acceptedForCase.length;
    hints.push(
      `For ${useCase}, tends to accept offers around $${Math.round(avgPrice)}/night.`,
    );

    const neighborhoods = acceptedForCase.map((o) => o.neighborhood);
    const top = mode(neighborhoods);
    if (top) hints.push(`Accepts in ${top} most often.`);

    const allAmenities = acceptedForCase.flatMap((o) => o.amenities);
    const topAmenity = mode(allAmenities);
    if (topAmenity) hints.push(`Cares about: ${topAmenity}.`);
  }
  if (rejectedForCase.length) {
    const avgRejPrice =
      rejectedForCase.reduce((a, o) => a + o.originalPrice, 0) /
      rejectedForCase.length;
    hints.push(
      `Rejects offers around $${Math.round(avgRejPrice)}/night when shopping ${useCase}.`,
    );
    const rejNeighborhoods = rejectedForCase.map((o) => o.neighborhood);
    const topRej = mode(rejNeighborhoods);
    if (topRej) hints.push(`Avoids ${topRej}.`);
  }
  return hints;
}

function mode<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined;
  const counts = new Map<T, number>();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | undefined;
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return best;
}

export class InMemoryAdapter implements MemoryAdapter {
  async recordSignal(userId: string, _sessionId: string, signal: Signal) {
    store(userId).signals.push(signal);
  }

  async getUserContext(
    userId: string,
    sessionId: string,
    useCase: UseCase,
    parsedHints: ParsedHints,
  ): Promise<UserContext> {
    const sigs = store(userId).signals;
    const useCaseHints = summarizeForUseCase(sigs, useCase);
    // Static = everything not tied to the recent query.
    const acceptedCount = sigs.filter(
      (s) => s.kind === "offer_accepted" || s.kind === "offer_booked",
    ).length;
    const rejectedCount = sigs.filter((s) => s.kind === "offer_rejected").length;
    const staticPreferences =
      acceptedCount + rejectedCount > 0
        ? [
            `User has accepted ${acceptedCount} and rejected ${rejectedCount} offers historically.`,
          ]
        : [];
    const dynamicPreferences = sigs
      .slice(-5)
      .map((s) => describeSignal(s))
      .filter(Boolean) as string[];

    return {
      userId,
      sessionId,
      useCase,
      parsedHints,
      staticPreferences,
      dynamicPreferences,
      useCaseHints,
    };
  }

  async getCallContext(
    userId: string,
    offer: Offer,
    useCase: UseCase,
  ): Promise<CallContext> {
    const sigs = store(userId).signals;
    const userPreferences = summarizeForUseCase(sigs, useCase);
    const place = placeFromOffer(offer);
    const chain = parentChain(place);
    const facts = geoFacts.filter((f) => {
      if (f.name === offer.neighborhood && f.level === "neighborhood") return true;
      if (f.parentChain.includes(offer.neighborhood)) return true;
      // Pull facts from siblings in the same district for context.
      if (chain.some((c) => f.parentChain.includes(c))) return true;
      return false;
    });
    return {
      userId,
      useCase,
      userPreferences,
      probes: probesForUseCase(useCase, {}),
      geoFacts: facts.slice(0, 5),
    };
  }

  async ingestCallTranscript(args: {
    userId: string;
    sessionId: string;
    offer: Offer;
    transcript: string;
    answered: boolean;
    finalPrice: number;
    negotiatedDiscount: number;
  }) {
    const fact = buildGeoFactFromCall(args);
    upsertGeoFact(fact);
    const reviewFact = buildGeoFactFromReview({ offer: args.offer });
    if (reviewFact) upsertGeoFact(reviewFact);
  }

  async listGeoFacts(level: GeoLevel, name: string) {
    return geoFacts.filter((f) => {
      if (f.level === level && f.name === name) return true;
      if (f.parentChain.includes(name)) return true;
      return false;
    });
  }
}

function describeSignal(s: Signal): string | null {
  switch (s.kind) {
    case "query_submitted":
      return `Searched: "${s.query}" (${s.useCase}).`;
    case "offer_accepted":
      return `Accepted ${s.offer.title} in ${s.offer.neighborhood} at $${s.finalPrice ?? s.offer.originalPrice}/night.`;
    case "offer_rejected":
      return `Rejected ${s.offer.title} in ${s.offer.neighborhood}.`;
    case "offer_booked":
      return `Booked ${s.offer.title} for $${s.finalPrice ?? s.offer.originalPrice}/night.`;
    case "offer_surfaced":
      return null;
    case "call_outcome":
      return s.answered
        ? `Call to ${s.offer.title} negotiated to $${s.finalPrice}.`
        : `Call to ${s.offer.title}: no answer.`;
  }
}
