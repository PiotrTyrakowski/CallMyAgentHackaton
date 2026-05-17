import type { Offer, Tier } from "./types";

export function effectivePrice(o: Offer): number {
  if (o.negotiatedDiscount && o.negotiatedDiscount > 0) {
    return Math.round(o.price * (1 - o.negotiatedDiscount / 100));
  }
  return o.price;
}

function scoreOffer(o: Offer, budget: number): number {
  const finalPrice = effectivePrice(o);
  const priceScore =
    finalPrice <= budget
      ? Math.max(0, (budget - finalPrice) / budget)
      : Math.max(-0.4, -((finalPrice - budget) / budget));
  const ratingScore = Math.max(0, Math.min(1, (o.rating - 3.5) / 1.4));
  const discountScore = o.negotiatedDiscount && o.negotiatedDiscount > 0 ? 1 : 0;
  return priceScore * 0.5 + ratingScore * 0.3 + discountScore * 0.2;
}

export function assignTiers(offers: Offer[], budget: number): Offer[] {
  const scored = offers.map((o) => ({ o, s: scoreOffer(o, budget) }));
  scored.sort((a, b) => b.s - a.s);

  const goldIds = new Set(scored.slice(0, 2).map(({ o }) => o.id));

  return offers.map((o) => {
    const s = scored.find((x) => x.o.id === o.id)!.s;
    let tier: Tier;
    if (goldIds.has(o.id)) tier = "gold";
    else if (s < 0.25) tier = "trash";
    else if (s < 0.5) tier = "normal";
    else tier = "good";
    return { ...o, tier };
  });
}

export function survivors(offers: Offer[]): Offer[] {
  return offers.filter((o) => o.tier === "good" || o.tier === "gold");
}

export function parseBudget(query: string): number {
  const m = query.match(/budget\s*(\d+)|(\d+)\s*\$|\$\s*(\d+)/i);
  if (m) return parseInt(m[1] || m[2] || m[3], 10);
  const nums = query.match(/\b(\d{2,4})\b/g);
  if (nums) {
    const big = nums.map(Number).filter((n) => n >= 100 && n <= 5000);
    if (big.length) return big[big.length - 1];
  }
  return 400;
}
