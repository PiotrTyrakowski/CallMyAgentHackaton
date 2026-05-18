import type { CallContext } from "../memory";
import type { CallEvent, Offer } from "../types";
import { timings } from "../flow/timings";
import type { CallProvider } from "./CallProvider";

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Hosts on the verified-pickup roster. Calls to any listing not in this set
// resolve as "no answer" — matches the live behavior where only a fraction of
// outbound cold calls connect.
export const ANSWERED_OFFER_IDS = new Set<string>([
  "pacific-heights-suite",
  "marina-penthouse",
]);

export const localCallProvider: CallProvider = {
  async *call(offer: Offer, _context?: CallContext): AsyncIterable<CallEvent> {
    // Every call starts ringing immediately.
    yield {
      offerId: offer.id,
      status: "ringing",
      currentPrice: offer.originalPrice,
      negotiatedDiscount: 0,
    };

    if (!ANSWERED_OFFER_IDS.has(offer.id)) {
      // No-answer path: ring for a random duration then fail.
      await sleep(rand(timings.callNoAnswerMinMs, timings.callNoAnswerMaxMs));
      yield {
        offerId: offer.id,
        status: "failed",
        currentPrice: offer.originalPrice,
        negotiatedDiscount: 0,
        message: "No answer.",
      };
      return;
    }

    // Answered path: short ring → ~13s of negotiation with progressive price ticks → done.
    await sleep(rand(timings.callAnsweredRingMs * 0.85, timings.callAnsweredRingMs * 1.15));

    yield {
      offerId: offer.id,
      status: "negotiating",
      currentPrice: offer.originalPrice,
      negotiatedDiscount: 0,
    };

    const target = Math.round(
      offer.originalPrice * (1 - offer.expectedDiscountPct / 100),
    );
    const dropTotal = offer.originalPrice - target;
    const steps = Math.max(2, timings.callAnsweredPriceSteps);
    const stepMs = timings.callAnsweredNegotiateMs / (steps + 1);

    // Quadratic ease-in so most of the drop happens in the second half (more dramatic).
    for (let i = 1; i <= steps; i++) {
      await sleep(stepMs * rand(0.85, 1.15));
      const f = i / (steps + 1);
      const eased = f * f;
      const partial = Math.round(offer.originalPrice - dropTotal * eased);
      yield {
        offerId: offer.id,
        status: "negotiating",
        currentPrice: partial,
        negotiatedDiscount: offer.originalPrice - partial,
      };
    }

    await sleep(stepMs);
    yield {
      offerId: offer.id,
      status: "done",
      currentPrice: target,
      negotiatedDiscount: dropTotal,
      message: `Negotiated down to $${target}/night.`,
    };
  },
};
