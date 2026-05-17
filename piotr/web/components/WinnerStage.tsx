"use client";

import { motion } from "motion/react";
import { OfferCard } from "./OfferCard";
import { SparklesIcon } from "./icons";
import type { FlowEngine } from "@/lib/flow/machine";

export function WinnerStage({ engine }: { engine: FlowEngine }) {
  const { champion, runtime, startBooking, phase } = engine;
  if (!champion) return null;
  const rt = runtime[champion.id];
  const bookingOpen = phase === "booking" || phase === "booked";

  return (
    <div className="flex flex-col items-center gap-6 py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-[11px] uppercase tracking-[0.18em] font-bold">
          <SparklesIcon className="w-3.5 h-3.5" /> Winner
        </div>
        <h2 className="text-3xl font-bold mt-3 tracking-tight">
          Your pick is in.
        </h2>
      </motion.div>

      <motion.div
        initial={{ scale: 0.85, opacity: 0, rotate: -2 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <OfferCard offer={champion} runtime={rt} showTier size="winner" />
      </motion.div>

      {rt.negotiatedDiscount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800"
        >
          You saved ${rt.negotiatedDiscount}/night through agent negotiation 🎉
        </motion.div>
      )}

      <motion.button
        type="button"
        onClick={startBooking}
        disabled={bookingOpen}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.55, type: "spring", stiffness: 220 }}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.96 }}
        className="mt-2 rounded-full bg-black text-white px-9 py-4 text-lg font-semibold shadow-lg shadow-black/15 transition-shadow hover:shadow-xl disabled:opacity-40"
      >
        EASY BOOKING →
      </motion.button>
    </div>
  );
}
