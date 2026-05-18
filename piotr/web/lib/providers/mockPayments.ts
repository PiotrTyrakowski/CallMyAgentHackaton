import type {
  BookingRequest,
  BookingResult,
  PaymentsProvider,
} from "./PaymentsProvider";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockPaymentsProvider: PaymentsProvider = {
  async checkout(req: BookingRequest): Promise<BookingResult> {
    await sleep(1500 + Math.random() * 600);
    return {
      txId: `mock_${req.offerId}_${Math.random().toString(36).slice(2, 10)}`,
      status: "succeeded",
      via: "mock",
      cardLast4: "0000",
    };
  },
};
