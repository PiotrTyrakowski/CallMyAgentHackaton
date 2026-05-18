import { z } from 'zod';

// ---------- Branded IDs ----------
// We keep the wire format as a plain string and let callers cast via the
// `offerId()` constructor from `@callmyagent/lib/ids` when they need the brand.
const offerIdString = z.string().min(1);

// ---------- Offer (nested shapes) ----------
const offerAddressSchema = z
  .object({
    street: z.string(),
    city: z.string(),
    region: z.string(),
    country: z.string(),
    postalCode: z.string(),
  })
  .strict();

const offerCoordsSchema = z
  .object({
    lat: z.number(),
    lng: z.number(),
  })
  .strict();

const offerOccupancySchema = z
  .object({
    maxGuests: z.number().int().nonnegative(),
    beds: z.number().int().nonnegative(),
    bedrooms: z.number().int().nonnegative(),
  })
  .strict();

const nearbyPointSchema = z
  .object({
    name: z.string(),
    distanceKm: z.number().nonnegative(),
  })
  .strict();

export const offerSchema = z
  .object({
    id: offerIdString,
    source: z.enum(['booking', 'agoda', 'apify', 'mock']),
    name: z.string(),
    type: z.enum(['hotel', 'apartment', 'villa', 'bnb']),
    url: z.string(),
    description: z.string(),
    address: offerAddressSchema,
    coords: offerCoordsSchema,
    images: z.array(z.string()),
    pricePerNight: z.number().nonnegative(),
    totalPrice: z.number().nonnegative(),
    currency: z.string(),
    checkIn: z.string(),
    checkOut: z.string(),
    nights: z.number().int().positive(),
    occupancy: offerOccupancySchema,
    amenities: z.array(z.string()),
    starRating: z.number().min(0).max(5),
    guestRating: z.number().min(0).max(10),
    reviewCount: z.number().int().nonnegative(),
    cancellation: z.enum(['free', 'partial', 'non-refundable']),
    nearby: z.array(nearbyPointSchema),
    hostName: z.string().optional(),
    hostPhone: z.string().optional(),
  })
  .strict();

// ---------- Search ----------
export const searchResponseSchema = z
  .object({
    offers: z.array(offerSchema),
    totalCount: z.number().int().nonnegative(),
  })
  .strict();

// ---------- Call events (SSE payloads) ----------
// Discriminated union by `status`. Each variant is `.strict()` so a malformed
// payload (e.g. missing `utterance` on `negotiating`) fails parsing cleanly.
export const callEventSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('dialing') }).strict(),
  z.object({ status: z.literal('on_call') }).strict(),
  z
    .object({ status: z.literal('negotiating'), utterance: z.string() })
    .strict(),
  z
    .object({
      status: z.literal('done'),
      negotiatedPrice: z.number().optional(),
      hostResponsiveness: z.enum(['fast', 'slow', 'unknown']).optional(),
    })
    .strict(),
  z.object({ status: z.literal('failed'), reason: z.string() }).strict(),
]);

// ---------- Scoring ----------
export const scoringRequestSchema = z
  .object({
    offerIds: z.array(offerIdString),
    // Per offer, the events we observed during the call wave. Can be empty
    // (offer that timed out) or partial (still on call when we forced scoring).
    calls: z.record(offerIdString, z.array(callEventSchema)),
  })
  .strict();

const scoredOfferSchema = z
  .object({
    offerId: offerIdString,
    score: z.number().min(0).max(100),
    tier: z.enum(['red', 'neutral', 'green', 'gold']),
    reasoning: z.string().optional(),
  })
  .strict();

export const scoringResponseSchema = z
  .object({
    scored: z.array(scoredOfferSchema),
  })
  .strict();

// ---------- Booking ----------
export const bookRequestSchema = z.object({ offerId: offerIdString }).strict();

export const bookResponseSchema = z
  .object({
    confirmationCode: z.string().min(1),
    bookedAt: z.iso.datetime(),
  })
  .strict();

// ---------- Error envelope ----------
export const errorEnvelopeSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  })
  .strict();

// ---------- Inferred types (for handler / caller convenience) ----------
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type ScoringRequest = z.infer<typeof scoringRequestSchema>;
export type ScoringResponse = z.infer<typeof scoringResponseSchema>;
export type BookRequest = z.infer<typeof bookRequestSchema>;
export type BookResponse = z.infer<typeof bookResponseSchema>;
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
