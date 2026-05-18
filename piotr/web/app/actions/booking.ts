"use server";

// Booking server actions. The Sponge API key never leaves the server; only the
// derived BookingAuthorization (card last4, merchant lock, exp, dashboard URL)
// crosses back to the client.

import { bookingProvider } from "@/lib/providers";
import type { BookingAuthorization } from "@/lib/providers";
import { getMemory } from "@/lib/memory";
import type { Offer } from "@/lib/types";

export async function placeBookingHold(args: {
  userId: string;
  sessionId: string;
  offer: Offer;
  pricePerNight: number;
  nights: number;
}): Promise<BookingAuthorization> {
  const auth = await bookingProvider.issueCard({
    offer: args.offer,
    pricePerNight: args.pricePerNight,
    nights: args.nights,
    userId: args.userId,
    sessionId: args.sessionId,
  });

  await getMemory().recordSignal(args.userId, args.sessionId, {
    kind: "offer_booked",
    offer: args.offer,
    finalPrice: args.pricePerNight,
    negotiatedDiscount: args.offer.originalPrice - args.pricePerNight,
    paymentMethodId: auth.id,
    amountAuthorizedCents: auth.amountCents,
    merchantName: auth.merchantName,
    cardLast4: auth.cardLast4,
    chain: auth.chain,
  });

  return auth;
}

export async function releaseBookingHold(
  authorization: BookingAuthorization,
): Promise<BookingAuthorization> {
  return bookingProvider.reportUsage({
    authorization,
    status: "cancelled",
  });
}

export async function settleBookingHold(
  authorization: BookingAuthorization,
): Promise<BookingAuthorization> {
  return bookingProvider.reportUsage({
    authorization,
    status: "success",
  });
}
