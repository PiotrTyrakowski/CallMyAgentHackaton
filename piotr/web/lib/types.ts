export type Tier = "red" | "normal" | "green" | "gold";

export type Phase =
  | "idle"
  | "researching"
  | "cards_landed"
  | "calling"
  | "tiering"
  | "eliminating_red"
  | "eliminating_norm"
  | "battle_royale"
  | "winner"
  | "booking"
  | "booked";

export interface Offer {
  id: string;
  title: string;
  neighborhood: string;
  addressLine: string;
  photoUrl: string;
  source: "Airbnb" | "Booking.com" | "VRBO" | "Hostelworld";
  originalPrice: number;
  beds: number;
  baths: number;
  guests: number;
  rating: number;
  reviews: number;
  amenities: string[];
  tier: Tier;
  expectedDiscountPct: number;
}

export type OfferCallStatus =
  | "queued"
  | "ringing"
  | "negotiating"
  | "done"
  | "failed";

export interface OfferRuntimeState {
  callStatus: OfferCallStatus;
  currentPrice: number;
  negotiatedDiscount: number;
  alive: boolean;
}

export interface CallEvent {
  offerId: string;
  status: OfferCallStatus;
  currentPrice: number;
  negotiatedDiscount: number;
  message?: string;
}
