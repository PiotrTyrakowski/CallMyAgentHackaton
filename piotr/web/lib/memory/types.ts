// Memory port for CallMyAgent.
//
// Three things we want to remember:
//   1. What the user prefers (per use case: cheap_stay, luxury, business, etc.)
//   2. What we learn from each agent call (geo facts about neighborhoods)
//   3. The session itself (query → offers seen → swipes → final pick)
//
// Two backends sit behind this port:
//   - SupermemoryAdapter: hosted memory layer; the primary backend
//   - InMemoryAdapter: process-local fallback used when no API key is configured
//                       (tests, local development, isolated CI runs)

import type { Offer } from "../types";

export type UseCase =
  | "cheap_stay"
  | "luxury"
  | "business"
  | "family"
  | "romantic"
  | "group"
  | "digital_nomad"
  | "default";

export type SignalKind =
  | "query_submitted"
  | "offer_surfaced"
  | "offer_rejected"
  | "offer_accepted"
  | "offer_booked"
  | "call_outcome";

export interface QuerySignal {
  kind: "query_submitted";
  query: string;
  useCase: UseCase;
  parsedHints: ParsedHints;
}

export interface OfferSignal {
  kind: "offer_surfaced" | "offer_rejected" | "offer_accepted" | "offer_booked";
  offer: Offer;
  finalPrice?: number;
  negotiatedDiscount?: number;
}

export interface CallOutcomeSignal {
  kind: "call_outcome";
  offer: Offer;
  answered: boolean;
  finalPrice: number;
  negotiatedDiscount: number;
  transcriptExcerpt: string;
}

export type Signal = QuerySignal | OfferSignal | CallOutcomeSignal;

export interface ParsedHints {
  city?: string;
  neighborhoods?: string[];
  budgetMaxPerNight?: number;
  nights?: number;
  bedsMin?: number;
  amenitiesWanted?: string[];
  vibesWanted?: string[];
}

// What we hand back to the flow machine / call provider before a session.
export interface UserContext {
  userId: string;
  sessionId: string;
  useCase: UseCase;
  parsedHints: ParsedHints;
  // Static facts Supermemory built from prior sessions.
  staticPreferences: string[];
  // Recent memories — what the user did lately.
  dynamicPreferences: string[];
  // Targeted hints for the current use case ("for cheap_stay, user…").
  useCaseHints: string[];
}

// What the call provider gets to inject into its system prompt.
export interface CallContext {
  userId: string;
  useCase: UseCase;
  userPreferences: string[];
  // "Listing doesn't mention X — ask the host about it."
  probes: string[];
  // What we already know about this neighborhood from prior calls.
  geoFacts: GeoFact[];
}

// One geographic fact at any hierarchy level.
export interface GeoFact {
  level: GeoLevel;
  name: string;
  // listing → neighborhood → district → city → region → state
  parentChain: string[];
  text: string;
  sentiment: "positive" | "negative" | "neutral";
  source: "call_transcript" | "review" | "user_signal";
  // Stable upsert ID.
  customId: string;
}

export type GeoLevel =
  | "listing"
  | "neighborhood"
  | "district"
  | "city"
  | "region"
  | "state";

// Port. Both adapters implement this.
export interface MemoryAdapter {
  recordSignal(userId: string, sessionId: string, signal: Signal): Promise<void>;

  getUserContext(
    userId: string,
    sessionId: string,
    useCase: UseCase,
    parsedHints: ParsedHints,
  ): Promise<UserContext>;

  getCallContext(
    userId: string,
    offer: Offer,
    useCase: UseCase,
  ): Promise<CallContext>;

  ingestCallTranscript(args: {
    userId: string;
    sessionId: string;
    offer: Offer;
    transcript: string;
    answered: boolean;
    finalPrice: number;
    negotiatedDiscount: number;
  }): Promise<void>;

  // For debug/admin UIs.
  listGeoFacts(level: GeoLevel, name: string): Promise<GeoFact[]>;
}
