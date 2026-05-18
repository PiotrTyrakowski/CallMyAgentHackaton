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
 * Three-outcome distribution (locked design — non-uniform demo richness):
 * - ~15% no_answer        : dialing → (long pause) → failed (reason: no_answer)
 * - ~25% answered_no_negotiate : dialing → on_call → 1–2 utterances → done
 *                                (NO negotiatedPrice, hostResponsiveness: slow)
 * - ~60% negotiated       : dialing → on_call → 2–4 utterances incl. a price
 *                            one → done with negotiatedPrice
 *                            and hostResponsiveness: fast
 *
 * Per-utterance pacing varies in 700–1500ms so the bubble stream feels human
 * rather than metronomic.
 */

// Pool of informational (non-price) utterances. Each call samples without
// replacement so a single card never repeats itself.
const INFO_UTTERANCES = [
  'asking about wifi',
  'asking about late check-in',
  'asking about parking',
  'asking about pets policy',
  'asking about breakfast',
  'asking about cleaning fee',
] as const;

function pickN<T>(pool: readonly T[], n: number): T[] {
  const copy = [...pool];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    const [picked] = copy.splice(idx, 1);
    if (picked !== undefined) out.push(picked);
  }
  return out;
}

export const callHandlers = [
  http.get('/api/calls/:offerId/events', ({ params }) => {
    const offerIdString = params['offerId'] as string;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        const emit = (data: unknown): void => {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        const roll = Math.random();

        // ---------- Outcome A: ~15% no_answer ----------
        if (roll < 0.15) {
          emit({ status: 'dialing' });
          // Phone rings out — wait 4–6s before giving up so the UI has time
          // to communicate the shake-and-pray feeling.
          await sleep(jitter(4000, 6000));
          emit({ status: 'failed', reason: 'no_answer' });
        }
        // ---------- Outcome B: ~25% answered_no_negotiate ----------
        else if (roll < 0.4) {
          emit({ status: 'dialing' });
          await sleep(jitter(300, 600));
          emit({ status: 'on_call' });
          await sleep(jitter(500, 900));

          const utterances = pickN(INFO_UTTERANCES, randomInt(1, 2));
          for (const utterance of utterances) {
            emit({ status: 'negotiating', utterance });
            await sleep(jitter(700, 1500));
          }

          emit({ status: 'done', hostResponsiveness: 'slow' });
        }
        // ---------- Outcome C: ~60% negotiated ----------
        else {
          emit({ status: 'dialing' });
          await sleep(jitter(300, 600));
          emit({ status: 'on_call' });
          await sleep(jitter(500, 900));

          // 2–4 utterances total; the last is always the negotiation one.
          const total = randomInt(2, 4);
          const infoCount = total - 1;
          const utterances = [
            ...pickN(INFO_UTTERANCES, infoCount),
            'negotiating price',
          ];
          for (const utterance of utterances) {
            emit({ status: 'negotiating', utterance });
            await sleep(jitter(700, 1500));
          }

          // Mock negotiatedPrice off a generic baseline. The real backend
          // will compute this from the offer's actual rate.
          const savings = randomInt(20, 60);
          const baseline = 280;
          emit({
            status: 'done',
            negotiatedPrice: baseline - savings,
            hostResponsiveness: 'fast',
          });
        }

        // SSE end marker for dev-tools visibility (lines starting with `:`
        // are SSE comments and ignored by clients).
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
