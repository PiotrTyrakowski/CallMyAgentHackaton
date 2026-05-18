import type { OfferId } from './ids.js';

export type OfferTier = 'red' | 'neutral' | 'green' | 'gold';

export type CallStatus =
  | 'idle'
  | 'dialing'
  | 'on_call'
  | 'negotiating'
  | 'done'
  | 'failed';

export type CallEvent =
  | { status: 'dialing' }
  | { status: 'on_call' }
  | { status: 'negotiating'; utterance: string }
  | {
      status: 'done';
      negotiatedPrice?: number;
      hostResponsiveness?: 'fast' | 'slow' | 'unknown';
    }
  | { status: 'failed'; reason: string };

export interface OfferAddress {
  street: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
}

export interface OfferCoords {
  lat: number;
  lng: number;
}

export interface OfferOccupancy {
  maxGuests: number;
  beds: number;
  bedrooms: number;
}

export interface NearbyPoint {
  name: string;
  distanceKm: number;
}

export interface Offer {
  id: OfferId;
  source: 'booking' | 'agoda' | 'apify' | 'mock';
  name: string;
  type: 'hotel' | 'apartment' | 'villa' | 'bnb';
  url: string;
  description: string;
  address: OfferAddress;
  coords: OfferCoords;
  images: string[];
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  occupancy: OfferOccupancy;
  amenities: string[];
  starRating: number;
  guestRating: number;
  reviewCount: number;
  cancellation: 'free' | 'partial' | 'non-refundable';
  nearby: NearbyPoint[];
  hostName?: string;
  hostPhone?: string;
}

export interface ScoredOffer {
  offerId: OfferId;
  score: number;
  tier: OfferTier;
  reasoning?: string;
}
