import type { CallEvent, Offer } from "../types";
import { timings } from "../flow/timings";
import type { CallProvider } from "./CallProvider";

const jitter = (base: number, plusMinus = 0.25) => {
  const delta = base * plusMinus;
  return base + (Math.random() * 2 - 1) * delta;
};

export const mockCallProvider: CallProvider = {
  async *call(offer: Offer): AsyncIterable<CallEvent> {
    yield {
      offerId: offer.id,
      status: "ringing",
      currentPrice: offer.originalPrice,
      negotiatedDiscount: 0,
    };

    await new Promise<void>((r) =>
      setTimeout(r, jitter(timings.callRingMs, 0.15)),
    );

    yield {
      offerId: offer.id,
      status: "negotiating",
      currentPrice: offer.originalPrice,
      negotiatedDiscount: 0,
    };

    await new Promise<void>((r) =>
      setTimeout(r, jitter(timings.callNegotiateMs, 0.2)),
    );

    const discountPct = offer.expectedDiscountPct;
    const newPrice = Math.round(offer.originalPrice * (1 - discountPct / 100));
    const negotiatedDiscount = offer.originalPrice - newPrice;

    yield {
      offerId: offer.id,
      status: "done",
      currentPrice: newPrice,
      negotiatedDiscount,
      message:
        discountPct === 0
          ? "No discount."
          : `Negotiated down to $${newPrice}/night.`,
    };
  },
};
