import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { bookRequestSchema } from '@/api/schemas';
import { jitter, sleep } from '@/mocks/timing';

/**
 * POST /api/book
 *
 * Contract: body `{ offerId }` -> `{ confirmationCode, bookedAt }`.
 * ~10% chance of a 500 with `{ code: 'BOOKING_FAILED', message }` so the
 * inline retry UI in the booking phase has something to push against.
 *
 * Booking is non-idempotent (charges a card in reality), so even the mock
 * insists on the same gating as prod: validate input, fail loudly, do not
 * silently retry.
 */
export const bookHandlers = [
  http.post('/api/book', async ({ request }) => {
    const raw = (await request.json()) as unknown;
    const parsed = bookRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: 'BAD_REQUEST',
          message: 'Invalid book payload.',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 400 }
      );
    }

    // Realistic booking latency — payment auth + reservation write.
    await sleep(jitter(600, 1400));

    if (Math.random() < 0.1) {
      return HttpResponse.json(
        {
          code: 'BOOKING_FAILED',
          message:
            'Host could not confirm availability. Please try a different offer.',
        },
        { status: 500 }
      );
    }

    // Confirmation code: short alphanumeric, recognizable shape (CMA-XXXXXX).
    const code = `CMA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    return HttpResponse.json({
      confirmationCode: code,
      bookedAt: new Date().toISOString(),
    });
  }),
];
