import type { Offer } from "../types";

// Merchant lock metadata for each booking source. The virtual card the
// payments provider issues will be rejected at the network level on any
// other merchant — so the source must match the URL the checkout will
// actually visit.
export const MERCHANT_LOCK: Record<
  Offer["source"],
  { name: string; url: string; countryCode: string }
> = {
  Airbnb: {
    name: "Airbnb",
    url: "https://www.airbnb.com",
    countryCode: "US",
  },
  "Booking.com": {
    name: "Booking.com",
    url: "https://www.booking.com",
    countryCode: "NL",
  },
  VRBO: {
    name: "VRBO",
    url: "https://www.vrbo.com",
    countryCode: "US",
  },
  Hostelworld: {
    name: "Hostelworld",
    url: "https://www.hostelworld.com",
    countryCode: "IE",
  },
};

export function merchantLockFor(source: Offer["source"]) {
  return MERCHANT_LOCK[source];
}
