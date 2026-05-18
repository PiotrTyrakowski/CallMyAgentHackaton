// Geographic hierarchy + fact extraction.
//
// The goal: every call transcript + every review snippet leaves a trace
// attached to a place. Over time, the corpus per neighborhood compounds and
// queries like "is Tenderloin safe at night" return real signal pulled from
// actual user conversations — not a guess from a model that was trained on
// outdated wikipedia.
//
// Hierarchy:
//   listing → neighborhood → district → city → region → state
//
// Each fact carries its full parentChain so we can answer at any level:
//   "facts about Pacific Heights"           → exact match on geo_name
//   "facts about anything inside Central SF" → filter parent_chain ∋ "Central SF"
//   "facts about anything inside SF"         → filter parent_chain ∋ "San Francisco"

import type { Offer } from "../types";
import type { GeoFact } from "./types";

// SF neighborhood → district map. Covers the catalog neighborhoods + the
// common queries users send. Anything not in the map falls back to a
// "Central SF" guess so the hierarchy is at least 3-deep rather than broken.
const SF_DISTRICTS: Record<string, string> = {
  // Central
  Tenderloin: "Central SF",
  "Civic Center": "Central SF",
  "Union Square": "Central SF",
  "Financial District": "Central SF",
  SoMa: "Central SF",
  "Mid-Market": "Central SF",
  Chinatown: "Central SF",
  // Northern
  "Pacific Heights": "Northern SF",
  Marina: "Northern SF",
  "Cow Hollow": "Northern SF",
  "Russian Hill": "Northern SF",
  "Nob Hill": "Northern SF",
  "North Beach": "Northern SF",
  Presidio: "Northern SF",
  // Western
  "Outer Sunset": "Western SF",
  "Inner Sunset": "Western SF",
  Sunset: "Western SF",
  "Outer Richmond": "Western SF",
  "Inner Richmond": "Western SF",
  Richmond: "Western SF",
  "Lake Merced": "Western SF",
  // Southern
  Mission: "Southern SF",
  "Mission District": "Southern SF",
  Castro: "Southern SF",
  "Bernal Heights": "Southern SF",
  "Glen Park": "Southern SF",
  "Noe Valley": "Southern SF",
  "Potrero Hill": "Southern SF",
  "Hayes Valley": "Southern SF",
  // Bayshore
  Bayview: "Bayshore",
  "Hunters Point": "Bayshore",
  Excelsior: "Bayshore",
  "Visitacion Valley": "Bayshore",
  // East
  "Mission Bay": "Eastern SF",
  Dogpatch: "Eastern SF",
};

export interface PlaceCoordinates {
  listingId?: string;
  neighborhood: string;
  city: string;
}

// Build the full ancestor chain for a place. The first element is the
// immediate parent, last is the broadest container we know.
export function parentChain(coord: PlaceCoordinates): string[] {
  const chain: string[] = [];
  const district = SF_DISTRICTS[coord.neighborhood] ?? "Central SF";
  chain.push(coord.neighborhood);
  chain.push(district);
  chain.push(coord.city);
  if (coord.city === "San Francisco") {
    chain.push("Bay Area");
    chain.push("California");
  }
  return chain;
}

export function placeFromOffer(offer: Offer): PlaceCoordinates {
  return {
    listingId: offer.id,
    neighborhood: offer.neighborhood,
    city: "San Francisco",
  };
}

// Pull geo signals out of free text. Cheap heuristic — Supermemory's fact
// extractor does a richer second pass on the same content, but this gives us
// an instant sentiment label for the first-touch scoring path.
const NEG_TOKENS = [
  "sketchy",
  "unsafe",
  "rough",
  "loud",
  "noisy",
  "dirty",
  "filthy",
  "homeless",
  "smells",
  "graffiti",
  "broken",
  "rats",
  "needles",
];
const POS_TOKENS = [
  "walkable",
  "safe",
  "quiet",
  "charming",
  "clean",
  "leafy",
  "lively",
  "vibrant",
  "scenic",
  "view",
  "sunny",
  "trendy",
];

export function sentimentOf(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  let pos = 0;
  let neg = 0;
  for (const t of POS_TOKENS) if (lower.includes(t)) pos++;
  for (const t of NEG_TOKENS) if (lower.includes(t)) neg++;
  if (neg > pos) return "negative";
  if (pos > neg) return "positive";
  return "neutral";
}

// Build a fact document attached to a place. We always store at LISTING level
// for the most precise attribution; rollups to neighborhood/district happen on
// the read side by filtering on parent_chain.
export function buildGeoFactFromCall(args: {
  offer: Offer;
  transcript: string;
  answered: boolean;
  finalPrice: number;
  negotiatedDiscount: number;
}): GeoFact {
  const place = placeFromOffer(args.offer);
  const chain = parentChain(place);

  const summary = args.answered
    ? `Call with host of "${args.offer.title}" in ${args.offer.neighborhood}: ` +
      `started at $${args.offer.originalPrice}/night, ` +
      `negotiated to $${args.finalPrice}/night (saved $${args.negotiatedDiscount}). ` +
      `Host responsiveness: answered the cold call. ` +
      `${args.transcript}`
    : `Call attempt to host of "${args.offer.title}" in ${args.offer.neighborhood}: ` +
      `no answer — host did not pick up. ` +
      `Original price $${args.offer.originalPrice}/night held.`;

  return {
    level: "listing",
    name: args.offer.id,
    parentChain: chain,
    text: summary,
    sentiment: sentimentOf(args.transcript + " " + (args.offer.recentReview?.text ?? "")),
    source: "call_transcript",
    customId: `geo_call_${args.offer.id}`,
  };
}

export function buildGeoFactFromReview(args: {
  offer: Offer;
}): GeoFact | null {
  const review = args.offer.recentReview;
  if (!review) return null;
  const place = placeFromOffer(args.offer);
  return {
    level: "listing",
    name: args.offer.id,
    parentChain: parentChain(place),
    text: `Guest review of "${args.offer.title}" in ${args.offer.neighborhood}: "${review.text}" — ${review.author}, ${review.rating}/5.`,
    sentiment: sentimentOf(review.text),
    source: "review",
    customId: `geo_review_${args.offer.id}`,
  };
}
