"use client";
import { motion, AnimatePresence } from "framer-motion";
import { OfferCard } from "./offer-card";
import type { Offer } from "@/lib/types";

export function PvpArena({
  left,
  right,
  onPick,
  round,
  totalRounds,
}: {
  left: Offer;
  right: Offer;
  onPick: (winnerId: string) => void;
  round: number;
  totalRounds: number;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-xs tracking-widest text-zinc-500">
        {round} / {totalRounds}
      </div>
      <div className="flex items-center gap-6">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={left.id}
            initial={{ x: -120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0, rotate: -14 }}
          >
            <OfferCard offer={left} showTier onClick={() => onPick(left.id)} />
          </motion.div>
        </AnimatePresence>
        <span className="text-xs text-zinc-600">vs</span>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={right.id}
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0, rotate: 14 }}
          >
            <OfferCard offer={right} showTier onClick={() => onPick(right.id)} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
