import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import type { OfferTier, ScoredOffer } from '@callmyagent/lib/types';
import { offerId } from '@callmyagent/lib/ids';
import { scoringRequestSchema } from '@/api/schemas';
import { jitter, sleep } from '@/mocks/timing';

/**
 * POST /api/scoring
 *
 * Contract: body `{ offerIds, calls }` -> `{ scored: ScoredOffer[] }`.
 *
 * Tier distribution (`splitTiers` is not yet present in `@callmyagent/lib`,
 * so the rule is inlined here per spec):
 *   top 2  -> gold
 *   next 6 -> green
 *   next 16-> neutral
 *   rest   -> red
 *
 * Scores are weighted: offers whose calls produced utterances score
 * higher than those with no events (mirrors the real heuristic — host
 * responsiveness as a quality signal).
 */
export const scoringHandlers = [
  http.post('/api/scoring', async ({ request }) => {
    const raw = (await request.json()) as unknown;
    const parsed = scoringRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: 'BAD_REQUEST',
          message: 'Invalid scoring payload.',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 400 }
      );
    }

    // Simulate the LLM scoring round-trip.
    await sleep(jitter(400, 900));

    const { offerIds, calls } = parsed.data;

    // Score = base random 0–100 + bonus for utterances observed.
    // Cap at 100. The bonus is what makes Gold likely to land on cards
    // that actually negotiated something instead of timing out.
    const scored: ScoredOffer[] = offerIds
      .map((id) => {
        const events = calls[id] ?? [];
        const utteranceCount = events.filter((e) => e.status === 'negotiating').length;
        const base = Math.random() * 70;
        const bonus = utteranceCount * 8;
        const score = Math.min(100, Math.round(base + bonus));
        return { id, score };
      })
      // Sort descending so position determines tier.
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => {
        let tier: OfferTier;
        if (index < 2) tier = 'gold';
        else if (index < 8) tier = 'green';
        else if (index < 24) tier = 'neutral';
        else tier = 'red';

        const result: ScoredOffer = {
          offerId: offerId(entry.id),
          score: entry.score,
          tier,
        };
        return result;
      });

    return HttpResponse.json({ scored });
  }),
];
