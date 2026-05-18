import { randomUUID } from "node:crypto";
import type { BookingAuthorization, BookingProvider } from "./BookingProvider";
import { merchantLockFor } from "./merchantLock";

// Local booking provider. Mirrors the production Sponge shape — same fields,
// same lifecycle — so the UI path is identical with or without credentials
// configured. Card numbers are obviously not real; the modal renders a
// "simulated" pill so judges aren't confused about what they're seeing.

const issued = new Map<string, BookingAuthorization>();

const HACKATHON_BASELINE_USDC = 5.0;

export const devBookingProvider: BookingProvider = {
  async issueCard({ offer, pricePerNight, nights }) {
    await new Promise((r) => setTimeout(r, 450));
    const merchant = merchantLockFor(offer.source);
    const amountUsd = pricePerNight * nights;
    const auth: BookingAuthorization = {
      id: `pm_local_${randomUUID().replace(/-/g, "").slice(0, 24)}`,
      amountCents: Math.round(amountUsd * 100),
      pricePerNight,
      nights,
      currency: "USD",
      status: "issued",
      cardLast4: String(4000 + Math.floor(Math.random() * 999)).slice(-4),
      cardExp: expFromNow(15),
      merchantName: merchant.name,
      merchantUrl: merchant.url,
      chain: "tempo",
      walletBalanceBeforeUsd: HACKATHON_BASELINE_USDC,
      walletBalanceAfterUsd: Math.max(
        0,
        Number((HACKATHON_BASELINE_USDC - amountUsd).toFixed(2)),
      ),
      createdAt: Date.now(),
    };
    issued.set(auth.id, auth);
    return auth;
  },

  async reportUsage({ authorization, status }) {
    await new Promise((r) => setTimeout(r, 200));
    const terminal: BookingAuthorization = {
      ...authorization,
      status:
        status === "success"
          ? "succeeded"
          : status === "cancelled"
            ? "cancelled"
            : "failed",
      // Collateral returns to the wallet on cancel/fail; success keeps it
      // off-wallet (the merchant has been authorized).
      walletBalanceAfterUsd:
        status === "success"
          ? authorization.walletBalanceAfterUsd
          : authorization.walletBalanceBeforeUsd,
    };
    issued.set(authorization.id, terminal);
    return terminal;
  },
};

function expFromNow(minutesFromNow: number): string {
  const d = new Date(Date.now() + minutesFromNow * 60_000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${mm}/${yy}`;
}
