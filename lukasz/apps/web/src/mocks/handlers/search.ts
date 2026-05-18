import { http, HttpResponse } from 'msw';
import { mockOffers } from '@/mocks/data/offers';
import { sleep, jitter } from '@/mocks/timing';

/**
 * GET /api/search?q=<query>
 *
 * Contract (per spec §6):
 * - Normal: `{ offers: Offer[], totalCount: number }`
 * - If query contains `__empty__` -> empty result set (used to test the
 *   silly-empty UI without changing data).
 * - If `?force_error=search` -> 502 with the standard error envelope
 *   (used to test the error UI).
 *
 * The mock currently ignores the actual semantics of `q` and returns the
 * full inventory — text-relevance matching belongs in the real backend.
 * Empty `q` is filtered by the query's `enabled` guard, but we still
 * defensively return the empty shape if it slips through.
 */
export const searchHandlers = [
  http.get('/api/search', async ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') ?? '';
    const forceError = url.searchParams.get('force_error');

    // Simulate realistic backend latency so the spawn animation has time to breathe.
    await sleep(jitter(250, 700));

    if (forceError === 'search') {
      return HttpResponse.json(
        {
          code: 'SEARCH_FAILED',
          message: 'Simulated search backend failure (force_error=search).',
        },
        { status: 502 }
      );
    }

    if (q.includes('__empty__') || q.length === 0) {
      return HttpResponse.json({ offers: [], totalCount: 0 });
    }

    return HttpResponse.json({
      offers: mockOffers,
      totalCount: mockOffers.length,
    });
  }),
];
