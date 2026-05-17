"use client";

import { motion } from "framer-motion";
import type { Card } from "../types";
import { PhoneIcon } from "./PhoneIcon";

type Props = {
  card: Card;
  compact?: boolean;
  hideBadgeUntilFinished?: boolean;
};

export function ListingCard({ card, compact, hideBadgeUntilFinished }: Props) {
  const ringing = card.call_started && !card.call_finished;
  const discount = card.discount_pct ?? 0;
  const showDiscount = !hideBadgeUntilFinished || card.call_finished;
  const rejected = card.passed === false;
  const lastLine = card.transcript[card.transcript.length - 1];

  return (
    <motion.div
      layout
      initial={{ scale: 0.2, rotate: -18, opacity: 0 }}
      animate={{
        scale: rejected ? 0.85 : 1,
        rotate: 0,
        opacity: 1,
        filter: rejected ? "saturate(0.4) hue-rotate(-20deg)" : "none",
      }}
      exit={{ x: 800, opacity: 0, rotate: 25 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`relative overflow-hidden rounded-xl border ${
        rejected
          ? "border-red-500/60 bg-red-950/30"
          : card.call_finished
            ? "border-emerald-700/40 bg-zinc-900/80"
            : "border-zinc-800 bg-zinc-900/60"
      } ${compact ? "" : "aspect-[4/5]"} shadow-lg`}
    >
      <div className="absolute inset-0">
        <img
          src={card.photo_url}
          alt={card.title}
          className="w-full h-full object-cover opacity-70"
          loading="lazy"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col h-full p-3 gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400">{card.source}</span>
          <PhoneIcon ringing={ringing} />
        </div>

        <div className="mt-auto">
          <div className="text-sm font-semibold leading-tight line-clamp-2">{card.title}</div>
          <div className="text-xs text-zinc-400 mt-0.5">{card.dates} · sleeps {card.capacity}</div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold">${Math.round(card.final_price)}</span>
            <span className="text-[11px] text-zinc-500">/night</span>
            {showDiscount && discount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto bg-glow text-ink text-[10px] font-bold px-2 py-0.5 rounded shadow-[0_0_12px_rgba(124,255,178,0.7)]"
              >
                −{Math.round(discount * 100)}% NEGOTIATED
              </motion.span>
            )}
          </div>

          {ringing && lastLine && (
            <motion.div
              key={lastLine.text}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-1 text-[10px] leading-snug line-clamp-2 ${
                lastLine.role === "agent" ? "text-glow" : "text-zinc-300"
              }`}
            >
              {lastLine.role === "agent" ? "AGT" : "OWN"}: {lastLine.text}
            </motion.div>
          )}
          {rejected && card.reject_reason && (
            <div className="mt-1 text-[10px] text-red-300/90 leading-snug">✗ {card.reject_reason}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
