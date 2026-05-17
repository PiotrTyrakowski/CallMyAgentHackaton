"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Star, MapPin } from "lucide-react";
import type { Offer } from "@/lib/types";
import { effectivePrice } from "@/lib/tier-logic";
import { TierBadge } from "./tier-badge";
import { DiscountPulse } from "./discount-pulse";
import { CallOverlay } from "./call-overlay";
import { PhotoCarousel } from "./photo-carousel";
import { OfferDetail } from "./offer-detail";

const tierBorder: Record<Offer["tier"], string> = {
  trash: "border-red-500/70 shadow-red-500/40",
  normal: "border-zinc-700",
  good: "border-emerald-400/80 shadow-emerald-500/30",
  gold: "border-amber-400 shadow-amber-400/50",
};

const tierBg: Record<Offer["tier"], string> = {
  trash: "from-red-950/40 to-zinc-950",
  normal: "from-zinc-900 to-zinc-950",
  good: "from-emerald-950/40 to-zinc-950",
  gold: "from-amber-900/40 to-zinc-950",
};

export function OfferCard({
  offer,
  showTier = false,
  onClick,
  compact = false,
}: {
  offer: Offer;
  showTier?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  const [openDetail, setOpenDetail] = useState(false);
  const finalPrice = effectivePrice(offer);
  const discounted = offer.negotiatedDiscount && offer.negotiatedDiscount > 0;

  const handleClick = onClick ?? (() => setOpenDetail(true));
  const photoHeight = compact ? 140 : 180;
  const cardWidth = compact ? 240 : 280;

  return (
    <>
      <motion.div
        layout
        onClick={handleClick}
        className={`relative cursor-pointer overflow-hidden rounded-2xl border bg-gradient-to-br ${tierBg[offer.tier]} ${tierBorder[offer.tier]} ${offer.tier === "gold" ? "shadow-[0_0_30px_-5px]" : ""} transition-transform hover:scale-[1.02]`}
        style={{ width: cardWidth }}
      >
        {discounted && <DiscountPulse percent={offer.negotiatedDiscount!} />}

        <div className="relative">
          <PhotoCarousel photos={offer.photos} height={photoHeight} />
          {offer.tier === "gold" && (
            <motion.div
              animate={{ opacity: [0.15, 0.4, 0.15] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-amber-400/0 via-amber-400/40 to-amber-400/0"
            />
          )}
          <CallOverlay
            status={offer.callStatus}
            transcript={offer.transcript}
          />
        </div>

        <div className="p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-zinc-100">
              {offer.title}
            </h3>
            {showTier && <TierBadge tier={offer.tier} />}
          </div>
          <div className="mb-2 flex items-center gap-2 text-[11px] text-zinc-400">
            <MapPin className="size-3" />
            {offer.neighborhood}
            <span className="ml-auto flex items-center gap-1">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {offer.rating}
              <span className="text-zinc-500">({offer.reviews})</span>
            </span>
          </div>
          <div className="mb-2 flex flex-wrap gap-1">
            {offer.amenities.slice(0, 3).map((a) => (
              <span
                key={a}
                className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300"
              >
                {a}
              </span>
            ))}
          </div>
          <div className="flex items-baseline gap-2">
            {discounted ? (
              <>
                <span className="text-xl font-bold text-emerald-300">
                  ${finalPrice}
                </span>
                <span className="text-xs text-zinc-500 line-through">
                  ${offer.price}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold text-zinc-100">
                ${offer.price}
              </span>
            )}
            <span className="text-[10px] text-zinc-500">/night</span>
          </div>
        </div>
      </motion.div>

      {openDetail && (
        <OfferDetail offer={offer} onClose={() => setOpenDetail(false)} />
      )}
    </>
  );
}
