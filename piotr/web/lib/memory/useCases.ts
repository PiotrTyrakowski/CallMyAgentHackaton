// Use-case inference + targeted preference hints.
//
// We classify each query into one of the UseCase buckets so the rest of the
// system can ask "what does THIS user want for THIS kind of trip" — which is
// the actual question, not "what does this user want in general."
//
// Classification is rule-based for speed. An LLM pass would do better on
// ambiguous queries but the regex covers the common phrasings with zero
// latency, zero token spend, and zero dependency on the network being up.

import type { ParsedHints, UseCase } from "./types";

interface Rule {
  useCase: UseCase;
  patterns: RegExp[];
}

// Order matters — earlier rules win on tie. Most specific first.
const RULES: Rule[] = [
  {
    useCase: "luxury",
    patterns: [
      /\b(luxury|whole\s*house|villa|penthouse|suite|exclusive|private\s+(home|villa|pool))\b/i,
      /\b(5\s*star|five\s*star|five-star)\b/i,
      /\bowner('s)?\s+suite\b/i,
    ],
  },
  {
    useCase: "cheap_stay",
    patterns: [
      /\b(cheap|cheapest|budget|hostel|tani)\b/i,
      /\bunder\s*\$?\s*\d{2,3}\b/i,
      /<\s*\$?\s*\d{2,3}\b/i,
      /\bbudzet\s*\d{2,4}\b/i, // PL "budzet 400"
    ],
  },
  {
    useCase: "business",
    patterns: [
      /\b(business|workspace|coworking|conference|wifi|fast\s+(internet|wifi))\b/i,
      /\b(monitor|standing\s+desk|ergonomic)\b/i,
    ],
  },
  {
    useCase: "family",
    patterns: [
      /\b(family|kids|child(ren)?|crib|baby|stroller|playroom)\b/i,
      /\b(2\s*bed(room)?s?\+|3\s*bed(room)?s?\+)\b/i,
    ],
  },
  {
    useCase: "romantic",
    patterns: [
      /\b(romantic|couple|honeymoon|anniversary|getaway|cozy)\b/i,
      /\b(hot\s*tub|jacuzzi|fireplace|wine)\b/i,
    ],
  },
  {
    useCase: "group",
    patterns: [
      /\b(group|friends|bachelor|bachelorette|party|squad)\b/i,
      /\b(\d+\s*guests?)\b/i,
    ],
  },
  {
    useCase: "digital_nomad",
    patterns: [
      /\b(long\s*stay|monthly|nomad|remote\s*work|workation)\b/i,
      /\b(\d+\s*(months?|weeks?))\b/i,
    ],
  },
];

export function classifyUseCase(query: string): UseCase {
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(query))) return rule.useCase;
  }
  return "default";
}

// Pull what we can from a free-text query: budget, nights, beds, vibes.
// Kept dumb on purpose — Supermemory's fact extractor handles the rest.
export function parseQueryHints(query: string): ParsedHints {
  const hints: ParsedHints = {};

  // Budget: "$400", "budget 400", "budzet 400", "under $350"
  const budgetMatch =
    query.match(/(?:budget|budzet|under|<|\$)\s*\$?\s*(\d{2,4})/i) ??
    query.match(/\$\s*(\d{2,4})/);
  if (budgetMatch) {
    const n = parseInt(budgetMatch[1]!, 10);
    if (n >= 30 && n <= 5000) hints.budgetMaxPerNight = n;
  }

  // Nights / dates: "Nov 16-18", "16-18", "3 nights"
  const nightsMatch = query.match(/(\d+)\s*night/i);
  if (nightsMatch) hints.nights = parseInt(nightsMatch[1]!, 10);
  const dateRangeMatch = query.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);
  if (dateRangeMatch && !hints.nights) {
    const span = Math.abs(
      parseInt(dateRangeMatch[2]!, 10) - parseInt(dateRangeMatch[1]!, 10),
    );
    if (span > 0 && span < 30) hints.nights = span;
  }

  // Beds: "2BR", "3 bed"
  const bedsMatch = query.match(/(\d+)\s*(?:br\b|bed(room)?s?)/i);
  if (bedsMatch) hints.bedsMin = parseInt(bedsMatch[1]!, 10);

  // Neighborhoods — pulled out of the city catalog later.
  // City: SF is the only city we have offers for, hardcode it.
  if (/\b(sf|san\s*francisco)\b/i.test(query)) hints.city = "San Francisco";

  // Vibes / amenities the user wrote in plain English.
  const VIBES = [
    "quiet",
    "loud",
    "walkable",
    "skyline",
    "bay\\s*view",
    "garden",
    "pet\\s*friendly",
    "self\\s*check-?in",
    "doorman",
    "gym",
    "pool",
    "workspace",
    "wifi",
    "parking",
  ];
  const vibes: string[] = [];
  for (const v of VIBES) {
    if (new RegExp(`\\b${v}\\b`, "i").test(query)) {
      vibes.push(v.replace(/\\s\*/g, " ").replace(/\\b/g, "").replace(/-/g, "-"));
    }
  }
  if (vibes.length) hints.vibesWanted = vibes;

  return hints;
}

// Probes the agent should ask the host about. These are derived from the
// use case + parsed hints — things the listing description rarely covers but
// the user actually cares about for THIS kind of trip.
export function probesForUseCase(useCase: UseCase, hints: ParsedHints): string[] {
  const common: Record<UseCase, string[]> = {
    cheap_stay: [
      "any hidden cleaning/service fees on top of the nightly rate",
      "whether the neighborhood feels safe walking back after dark",
      "is the WiFi actually included or charged extra",
    ],
    luxury: [
      "is the entire property private (no shared spaces, no other guests)",
      "is there a dedicated host/concierge contact for the stay",
      "what's the maximum check-in flexibility (early arrival, late departure)",
    ],
    business: [
      "actual measured WiFi speed (Mbps up/down) and stability",
      "dedicated quiet workspace with proper desk + monitor space",
      "ambient noise level on weekday mornings",
    ],
    family: [
      "any stairs, balcony gaps, or child-unsafe features",
      "crib / pack-n-play / high chair availability",
      "nearest grocery + park walking distance",
    ],
    romantic: [
      "noise from neighboring units, especially at night",
      "private outdoor space (balcony, patio, garden)",
      "block-level vibe — is the immediate street romantic or commercial",
    ],
    group: [
      "exact sleeping arrangements (real beds vs sofa beds)",
      "host's tolerance for evening gatherings",
      "parking availability for multiple cars",
    ],
    digital_nomad: [
      "monthly discount and utilities included",
      "WiFi speed AND a backup connection option",
      "ergonomic seating for full workdays",
    ],
    default: [
      "what time does the neighborhood get quiet at night",
      "any planned construction or street noise during the stay",
      "host responsiveness window (timezone, typical reply time)",
    ],
  };

  const out = [...common[useCase]];
  if (hints.budgetMaxPerNight) {
    out.push(
      `confirm final all-in nightly stays at or below $${hints.budgetMaxPerNight}`,
    );
  }
  return out;
}
