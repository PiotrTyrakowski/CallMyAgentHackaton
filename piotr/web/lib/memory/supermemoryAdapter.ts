// Real Supermemory adapter.
//
// Container tag scheme (single tag + metadata for scope — see anti-pattern §12.2
// of PRODUCTION_SUPERMEMORY_GUIDE.md):
//
//   user_{userId}     — every doc for one user (queries, swipes, bookings)
//   geo_world         — shared neighborhood/district/city knowledge across all users
//
// Document kinds (in metadata.kind):
//   signal_query, signal_swipe, signal_booking, signal_call_outcome, geo_fact
//
// Read path:
//   - getUserContext  → profile() returns dynamic+static distilled facts +
//                       a targeted search for the use case
//   - getCallContext  → profile() for prefs + search.documents on geo_world
//                       filtered to the offer's parent_chain
//
// Write path is fire-and-forget — Supermemory ingests in 1-2s for plain text;
// we never read-your-own-write within a session, so eventual consistency is fine.

import Supermemory from "supermemory";
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

const GEO_TAG = "geo_world";

function userTag(userId: string): string {
  // Container tags allow [A-Za-z0-9_.-], max 100 chars.
  return `user_${userId}`.slice(0, 100);
}

export class SupermemoryAdapter implements MemoryAdapter {
  private client: Supermemory;

  constructor(apiKey: string) {
    this.client = new Supermemory({ apiKey });
  }

  async recordSignal(userId: string, sessionId: string, signal: Signal) {
    const { content, metadata, customId, entityContext } = renderSignal(
      userId,
      sessionId,
      signal,
    );
    try {
      await this.client.documents.add({
        content,
        containerTag: userTag(userId),
        customId,
        metadata,
        entityContext,
      });
    } catch (err) {
      // Don't crash the flow over a memory write — degrade gracefully.
      console.warn("[supermemory] recordSignal failed:", err);
    }
  }

  async getUserContext(
    userId: string,
    sessionId: string,
    useCase: UseCase,
    parsedHints: ParsedHints,
  ): Promise<UserContext> {
    try {
      // profile() returns Supermemory's distilled per-user view, optionally
      // joined with a search result set if `q` is provided.
      const res = await this.client.profile({
        containerTag: userTag(userId),
        q: `What does this user want when shopping for a ${useCase} stay?`,
        threshold: 0.4,
      });
      const searchResults =
        (res.searchResults?.results as Array<{
          chunks?: Array<{ content?: string }>;
        }> | undefined) ?? [];
      const useCaseHits = searchResults
        .flatMap(
          (r) => r.chunks?.map((c) => c.content ?? "").filter(Boolean) ?? [],
        )
        .slice(0, 5);

      return {
        userId,
        sessionId,
        useCase,
        parsedHints,
        staticPreferences: (res.profile?.static ?? []).slice(0, 8),
        dynamicPreferences: (res.profile?.dynamic ?? []).slice(0, 8),
        useCaseHints: useCaseHits,
      };
    } catch (err) {
      console.warn("[supermemory] getUserContext failed:", err);
      return {
        userId,
        sessionId,
        useCase,
        parsedHints,
        staticPreferences: [],
        dynamicPreferences: [],
        useCaseHints: [],
      };
    }
  }

  async getCallContext(
    userId: string,
    offer: Offer,
    useCase: UseCase,
  ): Promise<CallContext> {
    const place = placeFromOffer(offer);
    const chain = parentChain(place);

    // 1) Pull user preferences (profile = distilled facts).
    let userPreferences: string[] = [];
    try {
      const prof = await this.client.profile({
        containerTag: userTag(userId),
        q: `Preferences for ${useCase} stays`,
      });
      userPreferences = [
        ...(prof.profile?.static ?? []),
        ...(prof.profile?.dynamic ?? []),
      ].slice(0, 8);
    } catch (err) {
      console.warn("[supermemory] getCallContext profile failed:", err);
    }

    // 2) Pull geo facts up the hierarchy from this offer.
    let geoFacts: GeoFact[] = [];
    try {
      const res = await this.client.search.documents({
        q: `safety noise vibe walkability in ${offer.neighborhood}`,
        containerTags: [GEO_TAG],
        limit: 6,
        rerank: true,
        filters: {
          OR: chain.map((name) => ({
            key: "parent_chain",
            value: name,
            filterType: "array_contains" as const,
          })),
        },
      });
      geoFacts = res.results
        .map((r) => resultToGeoFact(r))
        .filter((f): f is GeoFact => f !== null);
    } catch (err) {
      console.warn("[supermemory] getCallContext geo search failed:", err);
    }

    return {
      userId,
      useCase,
      userPreferences,
      probes: probesForUseCase(useCase, {}),
      geoFacts,
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
    // 1) Store the call outcome as a user signal so the user's profile learns
    //    "agent answered/didn't" and "negotiated discount achieved" per place.
    await this.recordSignal(args.userId, args.sessionId, {
      kind: "call_outcome",
      offer: args.offer,
      answered: args.answered,
      finalPrice: args.finalPrice,
      negotiatedDiscount: args.negotiatedDiscount,
      transcriptExcerpt: args.transcript.slice(0, 800),
    });

    // 2) Extract + store geo facts to the shared world tag. The transcript
    //    informs the listing-level fact; we also fold in the listing's most
    //    recent review for double-source attribution.
    const callFact = buildGeoFactFromCall(args);
    await this.writeGeoFact(callFact);
    const reviewFact = buildGeoFactFromReview({ offer: args.offer });
    if (reviewFact) await this.writeGeoFact(reviewFact);
  }

  async listGeoFacts(level: GeoLevel, name: string) {
    try {
      const res = await this.client.search.documents({
        q: `facts about ${name}`,
        containerTags: [GEO_TAG],
        limit: 20,
        filters: {
          OR: [
            {
              AND: [
                { key: "level", value: level },
                { key: "name", value: name },
              ],
            },
            {
              key: "parent_chain",
              value: name,
              filterType: "array_contains" as const,
            },
          ],
        },
      });
      return res.results
        .map((r) => resultToGeoFact(r))
        .filter((f): f is GeoFact => f !== null);
    } catch (err) {
      console.warn("[supermemory] listGeoFacts failed:", err);
      return [];
    }
  }

  private async writeGeoFact(fact: GeoFact) {
    try {
      await this.client.documents.add({
        content: fact.text,
        containerTag: GEO_TAG,
        customId: fact.customId,
        metadata: {
          kind: "geo_fact",
          level: fact.level,
          name: fact.name,
          parent_chain: fact.parentChain,
          sentiment: fact.sentiment,
          source: fact.source,
        },
        entityContext:
          "This is a geographic fact about a real place in San Francisco. " +
          "Extract neighborhood characteristics (safety, noise, vibe, walkability, " +
          "host responsiveness, price flexibility) so future bookings in or near " +
          "this place can be scored more accurately.",
      });
    } catch (err) {
      console.warn("[supermemory] writeGeoFact failed:", err);
    }
  }
}

// Search results don't expose customId at the top level — it lives in metadata.
// documentId is the SM-internal id we can fall back to.
interface SmResult {
  documentId?: string;
  chunks?: Array<{ content?: string }>;
  metadata?: { [key: string]: unknown } | null;
}

function resultToGeoFact(r: SmResult): GeoFact | null {
  const m = (r.metadata ?? {}) as Record<string, unknown>;
  const level = m.level as GeoLevel | undefined;
  const name = (m.name as string | undefined) ?? "";
  if (!level || !name) return null;
  return {
    level,
    name,
    parentChain: (m.parent_chain as string[] | undefined) ?? [],
    text: r.chunks?.[0]?.content ?? "",
    sentiment:
      (m.sentiment as GeoFact["sentiment"] | undefined) ?? "neutral",
    source: (m.source as GeoFact["source"] | undefined) ?? "call_transcript",
    customId:
      (m.customId as string | undefined) ?? r.documentId ?? "",
  };
}

// Render a signal into the wire shape Supermemory expects: a freeform `content`
// the extractor reads, plus structured `metadata` we can filter against later.
function renderSignal(
  userId: string,
  sessionId: string,
  signal: Signal,
): {
  content: string;
  metadata: Record<string, string | number | boolean | string[]>;
  customId: string;
  entityContext?: string;
} {
  const base = {
    user_id: userId,
    session_id: sessionId,
    kind: signal.kind,
  };

  if (signal.kind === "query_submitted") {
    return {
      content:
        `User ${userId} submitted search query: "${signal.query}".\n` +
        `Classified as use case: ${signal.useCase}.\n` +
        `Parsed hints: ${JSON.stringify(signal.parsedHints)}.\n` +
        `This is a fresh shopping intent — the user is starting a new search session.`,
      metadata: {
        ...base,
        use_case: signal.useCase,
        query_text: signal.query.slice(0, 200),
        ...(signal.parsedHints.city ? { city: signal.parsedHints.city } : {}),
        ...(signal.parsedHints.budgetMaxPerNight
          ? { budget_max_per_night: signal.parsedHints.budgetMaxPerNight }
          : {}),
      },
      customId: `q_${sessionId}`,
      entityContext:
        "This is a search query event — distill the user's intent (price " +
        "sensitivity, style of stay, neighborhood preference) so future " +
        "queries can be matched to a use case quickly.",
    };
  }

  if (signal.kind === "call_outcome") {
    const o = signal.offer;
    return {
      content:
        `Call outcome for offer "${o.title}" in ${o.neighborhood}: ` +
        (signal.answered
          ? `host answered, negotiated from $${o.originalPrice} to $${signal.finalPrice} (saved $${signal.negotiatedDiscount}/night).`
          : `no answer — host did not pick up.`) +
        `\nTranscript excerpt: ${signal.transcriptExcerpt}`,
      metadata: {
        ...base,
        offer_id: o.id,
        neighborhood: o.neighborhood,
        answered: signal.answered,
        original_price: o.originalPrice,
        final_price: signal.finalPrice,
        negotiated_discount: signal.negotiatedDiscount,
      },
      customId: `call_${sessionId}_${o.id}`,
      entityContext:
        "This is a host-call outcome. Extract host responsiveness, " +
        "negotiation flexibility, and any neighborhood-level signal " +
        "(noise, safety, vibe) the host mentioned.",
    };
  }

  // Swipe / surface / booking
  const o = signal.offer;
  const verb =
    signal.kind === "offer_accepted"
      ? "ACCEPTED"
      : signal.kind === "offer_rejected"
        ? "REJECTED"
        : signal.kind === "offer_booked"
          ? "BOOKED"
          : "saw";
  const price =
    signal.finalPrice ?? signal.offer.originalPrice;
  return {
    content:
      `User ${userId} ${verb} offer "${o.title}" in ${o.neighborhood}, ` +
      `priced at $${price}/night (listed $${o.originalPrice}). ` +
      `Beds: ${o.beds}, baths: ${o.baths}, guests: ${o.guests}. ` +
      `Rating ${o.rating} from ${o.reviews} guests. ` +
      `Amenities: ${o.amenities.join(", ") || "(none listed)"}. ` +
      `Source: ${o.source}.` +
      (signal.kind === "offer_rejected"
        ? ` This rejection signals the user did NOT want this combination of price, neighborhood, and amenities for the current shopping intent.`
        : "") +
      (signal.kind === "offer_accepted" || signal.kind === "offer_booked"
        ? ` This is a strong positive signal — the user chose this place over alternatives, so its features map to what they want for this use case.`
        : ""),
    metadata: {
      ...base,
      offer_id: o.id,
      neighborhood: o.neighborhood,
      price_per_night: price,
      original_price: o.originalPrice,
      tier: o.tier,
      beds: o.beds,
      rating: o.rating,
      amenities: o.amenities,
      source: o.source,
    },
    customId: `${signal.kind}_${sessionId}_${o.id}`,
    entityContext:
      "This is a swipe / booking signal. Compare against other accepts and " +
      "rejects in the same session to distill preferences (price band, " +
      "neighborhood, amenity must-haves) for this use case.",
  };
}
