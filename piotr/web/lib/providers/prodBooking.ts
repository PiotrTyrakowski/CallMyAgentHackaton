import type { BookingAuthorization, BookingProvider } from "./BookingProvider";
import { merchantLockFor } from "./merchantLock";

/**
 * Sponge-backed booking provider. Issues a per-transaction virtual card
 * locked to the listing's source merchant (Airbnb, Booking.com, VRBO,
 * Hostelworld), capped at the negotiated stay total, with a short TTL.
 *
 * The card auto-revokes on TTL expiry, and `reportUsage` returns held
 * collateral to the wallet on success / cancel / fail.
 *
 * Env:
 *   SPONGE_API_KEY       agent-scoped runtime key (sponge_live_…)
 *   SPONGE_API_URL       defaults to https://api.wallet.paysponge.com
 *   SPONGE_DASHBOARD_URL defaults to https://wallet.paysponge.com
 *   SPONGE_CHAIN         tempo (default) | base
 */

const API = process.env.SPONGE_API_URL ?? "https://api.wallet.paysponge.com";
const DASHBOARD =
  process.env.SPONGE_DASHBOARD_URL ?? "https://wallet.paysponge.com";
const DEFAULT_CHAIN =
  (process.env.SPONGE_CHAIN as "tempo" | "base" | undefined) ?? "tempo";

const TTL_MINUTES = 15;
const SHIPPING_ADDRESS = {
  line1: "1 Hacker Way",
  city: "Menlo Park",
  state: "CA",
  postal_code: "94025",
  country_code: "US",
};

interface SpongeVirtualCardResponse {
  card_number: string;
  cvc: string;
  exp_month: string;
  exp_year: string;
  payment_method_id: string;
  expires_at: string;
}

interface SpongeBalancesResponse {
  tempo?: { usdc?: string; usd?: string };
  base?: { usdc?: string; usd?: string };
  ethereum?: { usdc?: string; usd?: string };
  solana?: { usdc?: string; usd?: string };
}

async function sponge<T>(
  path: string,
  init?: RequestInit & { searchParams?: Record<string, string> },
): Promise<T> {
  const key = process.env.SPONGE_API_KEY;
  if (!key) throw new Error("SPONGE_API_KEY missing");

  const url = new URL(`${API}${path}`);
  if (init?.searchParams) {
    for (const [k, v] of Object.entries(init.searchParams)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    body: init?.body,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = (await res.text()).slice(0, 240);
    throw new Error(`sponge ${res.status} ${path}: ${text}`);
  }
  return (await res.json()) as T;
}

async function walletUsdBalance(
  chain: "tempo" | "base",
): Promise<number | undefined> {
  try {
    const balances = await sponge<SpongeBalancesResponse>("/api/balances", {
      searchParams: { chain: "all", onlyUsdc: "true" },
    });
    const usd = balances?.[chain]?.usd ?? balances?.[chain]?.usdc;
    return usd ? Number(usd) : undefined;
  } catch {
    return undefined;
  }
}

export const prodBookingProvider: BookingProvider = {
  async issueCard({ offer, pricePerNight, nights, userId, sessionId }) {
    const merchant = merchantLockFor(offer.source);
    const negotiatedTotalUsd = Number((pricePerNight * nights).toFixed(2));

    // Cap the authorized amount to the running wallet's available collateral.
    // Defaults to the hackathon allowance; production deployments raise it to
    // the negotiated total.
    const maxAuthUsd = Number(
      process.env.SPONGE_MAX_AUTHORIZATION_USD ?? "4.50",
    );
    const amountUsd = Number(
      Math.min(negotiatedTotalUsd, maxAuthUsd).toFixed(2),
    );

    const balanceBefore = await walletUsdBalance(DEFAULT_CHAIN);

    const card = await sponge<SpongeVirtualCardResponse>("/api/virtual-cards", {
      method: "POST",
      body: JSON.stringify({
        amount: amountUsd.toFixed(2),
        currency: "USD",
        merchant_name: merchant.name,
        merchant_url: merchant.url,
        merchant_country_code: merchant.countryCode,
        description: `CallMyAgent ${sessionId}: ${offer.title} (${nights}n @ $${pricePerNight})`,
        products: [
          {
            name: `${offer.title} (${nights} nights)`,
            price: amountUsd,
            quantity: 1,
          },
        ],
        shipping_address: SHIPPING_ADDRESS,
        ttl_minutes: TTL_MINUTES,
        metadata: {
          user_id: userId,
          session_id: sessionId,
          offer_id: offer.id,
          neighborhood: offer.neighborhood,
          listed_price: offer.originalPrice,
          negotiated_price: pricePerNight,
          negotiated_total: negotiatedTotalUsd,
        },
      }),
    });

    const balanceAfter = await walletUsdBalance(DEFAULT_CHAIN);

    return {
      id: card.payment_method_id,
      amountCents: Math.round(amountUsd * 100),
      pricePerNight,
      nights,
      currency: "USD",
      status: "issued",
      cardLast4: card.card_number.slice(-4),
      cardExp: `${card.exp_month}/${card.exp_year.slice(-2)}`,
      merchantName: merchant.name,
      merchantUrl: merchant.url,
      chain: DEFAULT_CHAIN,
      dashboardUrl: `${DASHBOARD}/cards/${card.payment_method_id}`,
      walletBalanceBeforeUsd: balanceBefore,
      walletBalanceAfterUsd: balanceAfter,
      createdAt: Date.now(),
    };
  },

  async reportUsage({ authorization, status }) {
    const merchant = merchantHostname(authorization.merchantUrl);
    await sponge("/api/card-usage", {
      method: "POST",
      body: JSON.stringify({
        payment_method_id: authorization.id,
        merchant_name: authorization.merchantName,
        merchant_domain: merchant,
        amount: (authorization.amountCents / 100).toFixed(2),
        currency: authorization.currency,
        status,
      }),
    });

    const balanceAfter =
      authorization.chain === "tempo" || authorization.chain === "base"
        ? await walletUsdBalance(authorization.chain)
        : undefined;

    return {
      ...authorization,
      status:
        status === "success"
          ? "succeeded"
          : status === "cancelled"
            ? "cancelled"
            : "failed",
      walletBalanceAfterUsd:
        balanceAfter ?? authorization.walletBalanceAfterUsd,
    };
  },
};

function merchantHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
