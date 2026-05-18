export interface BookingRequest {
  offerId: string;
  amount: number;
  merchantName: string;
  merchantUrl: string;
  description?: string;
}

export interface BookingResult {
  txId: string;
  status: "succeeded" | "failed";
  /** Provider tag, for the UI to say "paid via Sponge" vs "mock". */
  via: "sponge" | "mock";
  cardLast4?: string;
}

export interface PaymentsProvider {
  checkout(req: BookingRequest): Promise<BookingResult>;
}
