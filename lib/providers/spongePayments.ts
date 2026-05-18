import type {
  BookingRequest,
  BookingResult,
  PaymentsProvider,
} from "./PaymentsProvider";

/**
 * Real Sponge payments adapter — issues a per-transaction virtual card via
 * Sponge's wallet API. Used when SPONGE_API_KEY is present in the server env.
 *   https://docs.paysponge.com/api-reference/cards/issue-a-virtual-card
 *
 * For our flow we issue a card scoped to (merchant, amount) which the booking
 * site would then charge. The card's last4 surfaces in the UI as proof the
 * transaction is real.
 *
 * Env:
 *   SPONGE_API_KEY     — Bearer key from cloud.paysponge.com
 *   SPONGE_API_BASE    — default https://api.wallet.paysponge.com
 */

const BASE = process.env.SPONGE_API_BASE ?? "https://api.wallet.paysponge.com";

interface VirtualCardResponse {
  id?: string;
  card_id?: string;
  number?: string;
  last4?: string;
  status?: string;
}

export const spongePaymentsProvider: PaymentsProvider = {
  async checkout(req: BookingRequest): Promise<BookingResult> {
    const key = process.env.SPONGE_API_KEY;
    if (!key) throw new Error("SPONGE_API_KEY missing");

    const res = await fetch(`${BASE}/api/virtual-cards`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: req.amount.toFixed(2),
        currency: "USD",
        merchant_name: req.merchantName,
        merchant_url: req.merchantUrl,
        description: req.description ?? `Booking ${req.offerId}`,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`sponge ${res.status}: ${txt.slice(0, 200)}`);
    }

    const data = (await res.json()) as VirtualCardResponse;
    const last4 =
      data.last4 ?? (data.number ? data.number.slice(-4) : undefined);

    return {
      txId: data.id ?? data.card_id ?? `sponge_${Date.now()}`,
      status: "succeeded",
      via: "sponge",
      cardLast4: last4,
    };
  },
};
