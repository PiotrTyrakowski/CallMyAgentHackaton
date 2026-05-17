"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MapPin, X, Phone } from "lucide-react";
import type { Offer } from "@/lib/types";
import { effectivePrice } from "@/lib/tier-logic";
import { PhotoCarousel } from "./photo-carousel";
import { MiniMap } from "./mini-map";
import { TierBadge } from "./tier-badge";

export function OfferDetail({
  offer,
  onClose,
}: {
  offer: Offer;
  onClose: () => void;
}) {
  const finalPrice = effectivePrice(offer);
  const discounted = offer.negotiatedDiscount && offer.negotiatedDiscount > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.92, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-20 rounded-full bg-black/60 p-1.5 text-white backdrop-blur hover:bg-black/80"
          >
            <X className="size-4" />
          </button>

          <PhotoCarousel photos={offer.photos} height={320} />

          <div className="space-y-5 p-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-2xl font-bold text-zinc-100">
                  {offer.title}
                </h2>
                <TierBadge tier={offer.tier} />
              </div>
              <div className="mt-1 flex items-center gap-3 text-sm text-zinc-400">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {offer.neighborhood}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  {offer.rating} · {offer.reviews} reviews
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-baseline gap-3">
                {discounted ? (
                  <>
                    <span className="text-3xl font-black text-emerald-300">
                      ${finalPrice}
                    </span>
                    <span className="text-base text-zinc-500 line-through">
                      ${offer.price}
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
                      -{offer.negotiatedDiscount}% negotiated
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-black text-zinc-100">
                    ${offer.price}
                  </span>
                )}
                <span className="text-xs text-zinc-500">/night</span>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                Amenities
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {offer.amenities.map((a) => (
                  <span
                    key={a}
                    className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                Location
              </h3>
              <MiniMap
                lat={offer.lat}
                lng={offer.lng}
                label={offer.neighborhood}
                height={180}
              />
            </div>

            {offer.transcript.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <Phone className="size-3" />
                  Negotiation transcript · {offer.ownerPhone}
                </h3>
                <div className="space-y-1 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs">
                  {offer.transcript.map((c, i) => (
                    <div
                      key={i}
                      className={
                        c.speaker === "agent"
                          ? "text-emerald-300"
                          : "text-zinc-200"
                      }
                    >
                      <span className="font-bold opacity-60">
                        {c.speaker === "agent" ? "agent" : "owner"}:
                      </span>{" "}
                      {c.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
