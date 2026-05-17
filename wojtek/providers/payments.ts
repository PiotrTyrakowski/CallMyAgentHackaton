import type { PaymentsProvider } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockPayments: PaymentsProvider = {
  async checkout(offerId: string, amount: number) {
    await sleep(1600);
    const txId = `x402_${offerId}_${Math.random().toString(36).slice(2, 10)}_${amount}`;
    return { txId };
  },
};
