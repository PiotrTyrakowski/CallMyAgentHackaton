export type Tier = "trash" | "normal" | "good" | "gold";

export type CallStatus =
  | "idle"
  | "ringing"
  | "negotiating"
  | "done"
  | "failed";

export type Phase =
  | "idle"
  | "searching"
  | "spawning"
  | "calling"
  | "battle"
  | "tinder-deck"
  | "pvp"
  | "winner"
  | "booking"
  | "done";

export interface TranscriptChunk {
  speaker: "agent" | "owner";
  text: string;
  ts: number;
}

export interface Offer {
  id: string;
  title: string;
  neighborhood: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  emoji: string;
  amenities: string[];
  photos: string[];
  lat: number;
  lng: number;
  callStatus: CallStatus;
  transcript: TranscriptChunk[];
  tier: Tier;
  negotiatedDiscount?: number;
  ownerPhone: string;
  eliminated?: boolean;
}

export interface ParsedQuery {
  city: string;
  dates: string;
  budget: number;
  raw: string;
}
