import type { Offer } from "./types";

// Curated Unsplash photo IDs — homes / bedrooms / SF cityscape.
// We rotate them deterministically across offers so the demo is stable.
const PHOTO_POOL = [
  "photo-1566073771259-6a8506099945", // luxury hotel suite
  "photo-1611892440504-42a792e24d32", // bedroom
  "photo-1582719478250-c89cae4dc85b", // hotel room
  "photo-1517840901100-8179e982acb7", // hotel interior
  "photo-1551882547-ff40c63fe5fa", // hotel exterior
  "photo-1568084680786-a84f91d1153c", // bed
  "photo-1591088398332-8a7791972843", // hotel room
  "photo-1631049307264-da0ec9d70304", // bedroom
  "photo-1540518614846-7eded433c457", // hotel
  "photo-1578683010236-d716f9a3f461", // SF building
  "photo-1502602898657-3e91760cbb34", // SF Painted Ladies
  "photo-1501594907352-04cda38ebc29", // Golden Gate
  "photo-1521747116042-5a810fda9664", // bed bright
  "photo-1502672260266-1c1ef2d93688", // cozy room
  "photo-1556909114-f6e7ad7d3136", // sofa interior
  "photo-1556020685-ae41abfc9365", // home interior
  "photo-1554995207-c18c203602cb", // living room
  "photo-1583845112203-29329902332e", // kitchen
  "photo-1560448204-e02f11c3d0e2", // SF home
  "photo-1505691938895-1758d7feb511", // kitchen
];

function photosFor(id: string, count = 5): string[] {
  const seed = Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: count }, (_, i) => {
    const pid = PHOTO_POOL[(seed * 7 + i * 13) % PHOTO_POOL.length];
    return `https://images.unsplash.com/${pid}?w=600&q=80&auto=format&fit=crop`;
  });
}

type Base = Omit<
  Offer,
  "callStatus" | "transcript" | "tier" | "photos"
>;

const baseOffers: Base[] = [
  {
    id: "o1",
    title: "Pacific Heights Townhouse",
    neighborhood: "Pacific Heights",
    price: 380,
    originalPrice: 420,
    rating: 4.9,
    reviews: 312,
    emoji: "🏛️",
    amenities: ["3BR", "Bay view", "Parking", "Kitchen"],
    lat: 37.7925,
    lng: -122.4382,
    ownerPhone: "+1 (415) 555-0142",
  },
  {
    id: "o2",
    title: "Mission Loft w/ Roof Deck",
    neighborhood: "Mission",
    price: 295,
    rating: 4.7,
    reviews: 188,
    emoji: "🌃",
    amenities: ["2BR", "Roof deck", "Wifi", "Workspace"],
    lat: 37.7599,
    lng: -122.4148,
    ownerPhone: "+1 (415) 555-0177",
  },
  {
    id: "o3",
    title: "Castro Victorian Charm",
    neighborhood: "Castro",
    price: 340,
    originalPrice: 390,
    rating: 4.8,
    reviews: 256,
    emoji: "🏠",
    amenities: ["2BR", "Garden", "Fireplace"],
    lat: 37.7609,
    lng: -122.4350,
    ownerPhone: "+1 (415) 555-0190",
  },
  {
    id: "o4",
    title: "Tenderloin Studio (cheap!)",
    neighborhood: "Tenderloin",
    price: 110,
    rating: 3.6,
    reviews: 44,
    emoji: "🏚️",
    amenities: ["Studio", "Wifi"],
    lat: 37.7847,
    lng: -122.4145,
    ownerPhone: "+1 (415) 555-0211",
  },
  {
    id: "o5",
    title: "SoMa High-Rise Suite",
    neighborhood: "SoMa",
    price: 410,
    rating: 4.5,
    reviews: 521,
    emoji: "🏢",
    amenities: ["1BR", "Gym", "Pool", "Concierge"],
    lat: 37.7785,
    lng: -122.3948,
    ownerPhone: "+1 (415) 555-0233",
  },
  {
    id: "o6",
    title: "Nob Hill Boutique Hotel",
    neighborhood: "Nob Hill",
    price: 365,
    originalPrice: 410,
    rating: 4.9,
    reviews: 1024,
    emoji: "🛎️",
    amenities: ["Hotel", "Breakfast", "Bar"],
    lat: 37.7930,
    lng: -122.4161,
    ownerPhone: "+1 (415) 555-0288",
  },
  {
    id: "o7",
    title: "Outer Sunset Beach House",
    neighborhood: "Outer Sunset",
    price: 260,
    rating: 4.3,
    reviews: 92,
    emoji: "🌊",
    amenities: ["3BR", "Beach 2min", "BBQ"],
    lat: 37.7548,
    lng: -122.4933,
    ownerPhone: "+1 (415) 555-0301",
  },
  {
    id: "o8",
    title: "Marina District Penthouse",
    neighborhood: "Marina",
    price: 395,
    originalPrice: 450,
    rating: 4.85,
    reviews: 412,
    emoji: "🌉",
    amenities: ["3BR", "Bridge view", "Hot tub"],
    lat: 37.8021,
    lng: -122.4368,
    ownerPhone: "+1 (415) 555-0322",
  },
  {
    id: "o9",
    title: "Hayes Valley Designer Flat",
    neighborhood: "Hayes Valley",
    price: 320,
    rating: 4.6,
    reviews: 178,
    emoji: "🎨",
    amenities: ["1BR", "Designer", "Walkable"],
    lat: 37.7766,
    lng: -122.4244,
    ownerPhone: "+1 (415) 555-0354",
  },
  {
    id: "o10",
    title: "Sketchy Motel 6 (Bayview)",
    neighborhood: "Bayview",
    price: 89,
    rating: 2.8,
    reviews: 23,
    emoji: "🚧",
    amenities: ["Bed"],
    lat: 37.7298,
    lng: -122.3870,
    ownerPhone: "+1 (415) 555-0399",
  },
  {
    id: "o11",
    title: "Russian Hill Garden Cottage",
    neighborhood: "Russian Hill",
    price: 355,
    rating: 4.75,
    reviews: 201,
    emoji: "🌿",
    amenities: ["1BR", "Private garden", "Quiet"],
    lat: 37.8013,
    lng: -122.4185,
    ownerPhone: "+1 (415) 555-0418",
  },
  {
    id: "o12",
    title: "North Beach Italian Walk-up",
    neighborhood: "North Beach",
    price: 285,
    originalPrice: 330,
    rating: 4.6,
    reviews: 314,
    emoji: "🍝",
    amenities: ["2BR", "Walk to cafes", "Wifi"],
    lat: 37.8060,
    lng: -122.4103,
    ownerPhone: "+1 (415) 555-0444",
  },
  {
    id: "o13",
    title: "Embarcadero Waterfront Condo",
    neighborhood: "Embarcadero",
    price: 425,
    rating: 4.8,
    reviews: 567,
    emoji: "⚓",
    amenities: ["2BR", "Water view", "Gym"],
    lat: 37.7955,
    lng: -122.3937,
    ownerPhone: "+1 (415) 555-0471",
  },
  {
    id: "o14",
    title: "Twin Peaks Skyline View",
    neighborhood: "Twin Peaks",
    price: 310,
    rating: 4.55,
    reviews: 134,
    emoji: "⛰️",
    amenities: ["2BR", "City view", "Hot tub"],
    lat: 37.7544,
    lng: -122.4477,
    ownerPhone: "+1 (415) 555-0502",
  },
  {
    id: "o15",
    title: "Haight-Ashbury Hippie Den",
    neighborhood: "Haight-Ashbury",
    price: 195,
    rating: 4.1,
    reviews: 88,
    emoji: "✌️",
    amenities: ["1BR", "Vintage", "Walkable"],
    lat: 37.7692,
    lng: -122.4481,
    ownerPhone: "+1 (415) 555-0533",
  },
  {
    id: "o16",
    title: "Presidio Forest Retreat",
    neighborhood: "Presidio",
    price: 370,
    originalPrice: 405,
    rating: 4.85,
    reviews: 277,
    emoji: "🌲",
    amenities: ["2BR", "Forest", "Quiet", "Parking"],
    lat: 37.7989,
    lng: -122.4662,
    ownerPhone: "+1 (415) 555-0561",
  },
];

export function makeOffers(): Offer[] {
  return baseOffers.map((o) => ({
    ...o,
    photos: photosFor(o.id),
    callStatus: "idle",
    transcript: [],
    tier: "normal",
  }));
}
