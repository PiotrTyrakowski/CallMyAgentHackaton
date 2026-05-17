import type { PaymentsProvider } from "./types";

/**
 * REAL payments adapter — not yet implemented.
 *
 * AgentPhone ecosystem ships with mpp + x402 support. Two integration paths:
 *   - x402: HTTP 402 Payment Required flow, sign a payload, post to relay
 *   - mpp: Merchant Payment Protocol — server-to-server, idempotent checkout
 *
 * Env: X402_API_KEY, X402_RELAY_URL, MPP_MERCHANT_ID, MPP_SECRET
 *
 * Booking flow in the brief calls for an *additional* AgentPhone call to the
 * owner AFTER payment confirmation (so the negotiated discount holds rather
 * than getting lost via Booking.com fees). Do that in app/api/book/route.ts
 * after this provider returns a txId.
 */
export const realPayments: PaymentsProvider = {
  async checkout(_offerId, _amount) {
    throw new Error(
      "realPayments not implemented — set PROVIDERS_PAYMENTS=mock or wire it up in providers/payments.real.ts",
    );
  },
};
