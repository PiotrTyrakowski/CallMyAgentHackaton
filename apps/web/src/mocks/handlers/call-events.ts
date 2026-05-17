import { http, HttpResponse } from 'msw';
import { jitter, randomInt, sleep } from '@/mocks/timing';

/**
 * GET /api/calls/:offerId/events (SSE)
 *
 * Streams the simulated lifecycle of a single agent call. Wire format is
 * standard SSE: `data: <json>\n\n` per event. Consumers parse via the
 * `useEventSource` hook (see spec §12) which `JSON.parse`s `data` and
 * validates against `callEventSchema`.
 *
 * Phase script (4 utterances + outcome):
 *   dialing -> on_call -> 4 negotiating events -> done OR failed (~5% failed)
 *
 * Negotiation payloads are randomized so each card tells a slightly
 * different story — keeps the wall-of-cards UI visually alive.
 */
export const callHandlers = [
  http.get('/api/calls/:offerId/events', ({ params }) => {
    // `params.offerId` arrives as `string` from MSW — cast at the boundary
    // (we don't need the brand inside the handler).
    const offerIdString = params['offerId'] as string;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        const emit = (data: unknown): void => {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // dialing
        emit({ status: 'dialing' });
        await sleep(jitter(250, 600));

        // on_call
        emit({ status: 'on_call' });
        await sleep(jitter(500, 1000));

        // 4 negotiating utterances over ~1–4 s each, last one names
        // the savings so the UI has a value to celebrate.
        const savings = randomInt(20, 60);
        const utterances = [
          'asking about wifi',
          'asking about late check-in',
          'negotiating price',
          `negotiated $${savings} off`,
        ];

        for (const utterance of utterances) {
          emit({ status: 'negotiating', utterance });
          await sleep(jitter(1000, 4000));
        }

        // ~5% of calls fail (no answer) so the UI failure path is exercised.
        if (Math.random() < 0.05) {
          emit({ status: 'failed', reason: 'no_answer' });
        } else {
          // Deterministic-ish negotiatedPrice — just shave the savings off
          // a generic baseline. The real backend will compute this from
          // the actual offer price; mock just needs to look plausible.
          const baseline = 280;
          emit({
            status: 'done',
            negotiatedPrice: baseline - savings,
            hostResponsiveness: Math.random() < 0.7 ? 'fast' : 'slow',
          });
        }

        // Reference offerIdString so it's visible in dev tools but not
        // wasted on noise — included in a final marker comment line
        // (SSE comments start with `:`).
        controller.enqueue(enc.encode(`: end of stream for ${offerIdString}\n\n`));
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }),
];
