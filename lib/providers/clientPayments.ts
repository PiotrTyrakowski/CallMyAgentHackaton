"use client";
import type {
  BookingRequest,
  BookingResult,
  PaymentsProvider,
} from "./PaymentsProvider";

export const clientPaymentsProvider: PaymentsProvider = {
  async checkout(req: BookingRequest): Promise<BookingResult> {
    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      throw new Error(`book ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    return (await res.json()) as BookingResult;
  },
};
