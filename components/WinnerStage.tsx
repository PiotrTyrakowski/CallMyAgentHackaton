"use client";

import { motion } from "motion/react";
import { OfferTinderCard } from "./OfferTinderCard";
import type { FlowEngine } from "@/lib/flow/machine";

export function WinnerStage({ engine }: { engine: FlowEngine }) {
  const { champion, runtime, startBooking, phase } = engine;
  if (!champion) return null;
  const rt = runtime[champion.id];
  const bookingOpen = phase === "booking" || phase === "booked";

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold tracking-tight">Your pick is in.</h2>
        {rt.negotiatedDiscount > 0 && (
          <p className="text-sm text-emerald-700 mt-1.5 font-medium">
            You saved ${rt.negotiatedDiscount}/night through agent negotiation 🎉
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <OfferTinderCard offer={champion} runtime={rt} size="winner" />
      </motion.div>

      <motion.button
        type="button"
        onClick={startBooking}
        disabled={bookingOpen}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 220 }}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.96 }}
        className="rounded-full bg-black text-white px-9 py-4 text-lg font-semibold shadow-lg shadow-black/15 transition-shadow hover:shadow-xl disabled:opacity-40"
      >
        EASY BOOKING →
      </motion.button>
    </div>
  );
}
