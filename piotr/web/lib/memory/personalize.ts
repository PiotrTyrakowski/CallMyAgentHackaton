// Client-safe helpers for surfacing memory-derived signals in the UI.
// Pure functions only — no SDK imports, no server-only code paths.

import type { Offer } from "../types";
import type { UseCase, UserContext } from "./types";

const USE_CASE_LABELS: Record<UseCase, string> = {
  cheap_stay: "Budget stay",
  luxury: "Luxury",
  business: "Business trip",
  family: "Family",
  romantic: "Romantic getaway",
  group: "Group trip",
  digital_nomad: "Remote work",
  default: "Search",
};

export function useCaseLabel(useCase: UseCase): string {
  return USE_CASE_LABELS[useCase];
}

// One-line summary of the parsed hints — what the use-case badge shows.
export function summarizeHints(ctx: UserContext): string[] {
  const parts: string[] = [];
  const h = ctx.parsedHints;
  if (h.nights) parts.push(`${h.nights} night${h.nights > 1 ? "s" : ""}`);
  if (h.bedsMin) parts.push(`${h.bedsMin}+ bed${h.bedsMin > 1 ? "s" : ""}`);
  if (h.budgetMaxPerNight) parts.push(`≤$${h.budgetMaxPerNight}/night`);
  if (h.city) parts.push(h.city);
  return parts;
}

// Pick the 1-2 distilled preference strings most relevant to a specific offer.
// Loose substring match so freeform Supermemory profile entries still surface.
export function tailoredHintsFor(
  offer: Offer,
  ctx: UserContext | null,
): string[] {
  if (!ctx) return [];
  const pool = [
    ...ctx.useCaseHints,
    ...ctx.dynamicPreferences,
    ...ctx.staticPreferences,
  ];
  if (!pool.length) {
    // No memory yet — synthesise a single budget-fit line so the section
    // isn't empty on the very first session.
    const out: string[] = [];
    if (
      ctx.parsedHints.budgetMaxPerNight &&
      offer.originalPrice <= ctx.parsedHints.budgetMaxPerNight
    ) {
      out.push(
        `Within your ≤$${ctx.parsedHints.budgetMaxPerNight}/night ceiling for this ${useCaseLabel(ctx.useCase).toLowerCase()}.`,
      );
    }
    return out;
  }

  const neighborhood = offer.neighborhood.toLowerCase();
  const amenityTokens = offer.amenities.map((a) => a.toLowerCase());
  const hits = new Set<string>();

  for (const raw of pool) {
    const lower = raw.toLowerCase();
    if (lower.includes(neighborhood)) {
      hits.add(raw);
      continue;
    }
    if (amenityTokens.some((a) => a && lower.includes(a))) {
      hits.add(raw);
    }
  }

  if (
    ctx.parsedHints.budgetMaxPerNight &&
    offer.originalPrice <= ctx.parsedHints.budgetMaxPerNight
  ) {
    hits.add(
      `Within your ≤$${ctx.parsedHints.budgetMaxPerNight}/night ceiling.`,
    );
  }

  return Array.from(hits).slice(0, 2);
}
