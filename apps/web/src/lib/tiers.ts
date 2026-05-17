import type { OfferTier, ScoredOffer } from '@callmyagent/lib/types';

// Royale tier split — deterministic so two cards with the same score always
// land in the same bucket. Caller passes the post-scoring array (any length);
// we return a re-sorted copy with `tier` overwritten by the bucket rule.
//
// Bucket sizes assume a 40-card wave (per spec §10 / vision doc): gold=2,
// green=6, neutral=16, red=16. Shorter inputs fill from the top down; longer
// inputs spill the overflow into `red`.

const TIER_BUCKETS = [
  { tier: 'gold' as const, size: 2 },
  { tier: 'green' as const, size: 6 },
  { tier: 'neutral' as const, size: 16 },
  { tier: 'red' as const, size: 16 },
] satisfies ReadonlyArray<{ tier: OfferTier; size: number }>;

export function splitTiers(scored: ScoredOffer[]): ScoredOffer[] {
  // Sort descending by score; stable sort on equal scores preserves input order.
  const sorted = [...scored].sort((a, b) => b.score - a.score);

  const out: ScoredOffer[] = new Array(sorted.length);
  let cursor = 0;

  for (const bucket of TIER_BUCKETS) {
    const end = Math.min(cursor + bucket.size, sorted.length);
    for (let i = cursor; i < end; i++) {
      const offer = sorted[i];
      if (!offer) continue;
      out[i] = { ...offer, tier: bucket.tier };
    }
    cursor = end;
    if (cursor >= sorted.length) break;
  }

  // Any tail beyond the bucket capacity also goes to `red` — fallback so the
  // function never silently drops items.
  for (let i = cursor; i < sorted.length; i++) {
    const offer = sorted[i];
    if (!offer) continue;
    out[i] = { ...offer, tier: 'red' };
  }

  return out;
}
