"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Offer, OfferRuntimeState, Tier } from "@/lib/types";
import { PhoneIcon, StarIcon } from "./icons";
import { PriceCounter } from "./PriceCounter";

interface Props {
  offer: Offer;
  runtime: OfferRuntimeState;
  showTier: boolean;
  size?: "normal" | "battle" | "winner";
  onClick?: () => void;
  layoutId?: string;
}

const tierClasses: Record<Tier, string> = {
  red: "bg-red-50 border-red-300",
  normal: "bg-white border-gray-200",
  green: "bg-emerald-50 border-emerald-400",
  gold: "bg-gradient-to-br from-amber-100 to-yellow-200 border-amber-400 gold-shimmer",
};

const sizeClasses: Record<NonNullable<Props["size"]>, string> = {
  normal: "w-full",
  battle: "w-[340px] sm:w-[380px]",
  winner: "w-[420px] sm:w-[480px]",
};

export function OfferCard({
  offer,
  runtime,
  showTier,
  size = "normal",
  onClick,
  layoutId,
}: Props) {
  const tier: Tier = showTier ? offer.tier : "normal";
  const isRinging =
    runtime.callStatus === "ringing" || runtime.callStatus === "negotiating";
  const hasDiscount = runtime.negotiatedDiscount > 0;
  const callDone = runtime.callStatus === "done";

  return (
    <motion.div
      layout
      layoutId={layoutId}
      onClick={onClick}
      whileHover={onClick ? { y: -6, scale: 1.015 } : undefined}
      transition={{ layout: { duration: 0.6, ease: "easeOut" } }}
      className={`relative overflow-hidden rounded-2xl border-2 shadow-sm transition-colors duration-700 ${tierClasses[tier]} ${sizeClasses[size]} ${
        onClick ? "cursor-pointer hover:shadow-xl" : ""
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={offer.photoUrl}
          alt={offer.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />

        <div className="absolute top-2 left-2 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[11px] font-medium text-gray-700 shadow-sm">
          {offer.source}
        </div>

        <AnimatePresence>
          {isRinging && (
            <motion.div
              key="ring"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute top-2 right-2 rounded-full bg-blue-500 text-white p-2 shadow-md ring-shake"
              aria-label="Calling"
            >
              <PhoneIcon className="w-3.5 h-3.5" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {hasDiscount && !isRinging && (
            <motion.div
              key="discount"
              initial={{ scale: 0, x: 12, opacity: 0 }}
              animate={{ scale: 1, x: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="absolute top-2 right-2 rounded-full bg-emerald-500 text-white px-2.5 py-0.5 text-[12px] font-bold shadow-md"
            >
              −${runtime.negotiatedDiscount}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-3 flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold leading-tight truncate text-[14px] text-gray-900">
            {offer.title}
          </h3>
          <div className="flex items-center gap-0.5 text-[12px] shrink-0 text-gray-700">
            <StarIcon className="w-3 h-3 text-amber-500" />
            {offer.rating.toFixed(1)}
          </div>
        </div>
        <div className="text-[12px] text-gray-500 truncate">
          {offer.neighborhood} ·{" "}
          {offer.beds === 0 ? "Studio" : `${offer.beds} bed${offer.beds > 1 ? "s" : ""}`}{" "}
          · {offer.guests} guests
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          {hasDiscount && (
            <span className="line-through text-[12px] text-gray-400">
              ${offer.originalPrice}
            </span>
          )}
          <PriceCounter
            target={runtime.currentPrice}
            className={`text-[18px] font-bold ${
              hasDiscount ? "text-emerald-700" : "text-gray-900"
            }`}
          />
          <span className="text-[11px] text-gray-500">/night</span>
        </div>
      </div>

      {callDone && hasDiscount && (
        <motion.div
          key={`pulse-${runtime.currentPrice}`}
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-emerald-400"
        />
      )}
    </motion.div>
  );
}
