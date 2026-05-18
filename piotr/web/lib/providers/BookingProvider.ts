import type { Offer } from "../types";

// A booking authorization produced by the payments provider. Matches the
// shape of a Sponge per-transaction virtual card — merchant-locked, time-bound,
// amount-bound. Collateral returns to the wallet once `reportUsage` is called
// with a terminal status.
export interface BookingAuthorization {
  id: string;
  amountCents: number;
  pricePerNight: number;
  nights: number;
  currency: string;
  status: "issued" | "succeeded" | "cancelled" | "failed" | "simulated";
  cardLast4?: string;
  cardExp?: string;
  merchantName: string;
  merchantUrl: string;
  chain?: "tempo" | "base" | "ethereum" | "solana";
  txExplorerUrl?: string;
  dashboardUrl?: string;
  walletBalanceBeforeUsd?: number;
  walletBalanceAfterUsd?: number;
  createdAt: number;
}

export interface BookingProvider {
  issueCard(args: {
    offer: Offer;
    pricePerNight: number;
    nights: number;
    userId: string;
    sessionId: string;
  }): Promise<BookingAuthorization>;

  // Terminal report — releases held collateral back to the agent wallet.
  // `success` indicates the merchant charge went through; `cancelled` and
  // `failed` both release collateral but record the negative outcome.
  reportUsage(args: {
    authorization: BookingAuthorization;
    status: "success" | "cancelled" | "failed";
  }): Promise<BookingAuthorization>;
}
