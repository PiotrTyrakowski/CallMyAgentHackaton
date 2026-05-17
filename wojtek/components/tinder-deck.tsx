"use client";
import { motion } from "framer-motion";
import { OfferCard } from "./offer-card";
import type { Offer } from "@/lib/types";

export function TinderDeck({
  offers,
  onContinue: _onContinue,
}: {
  offers: Offer[];
  onContinue: () => void;
}) {
  return (
    <div className="relative" style={{ height: 380, width: 280 }}>
      {offers.slice(0, 5).map((o, i) => (
        <motion.div
          key={o.id}
          initial={{ y: -200, opacity: 0, scale: 0.9 }}
          animate={{
            y: i * 8,
            x: (i - 1) * 6,
            rotate: (i - 1) * 4,
            opacity: 1,
            scale: 1 - i * 0.015,
          }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 22,
            delay: i * 0.08,
          }}
          className="absolute inset-0"
          style={{ zIndex: 20 - i }}
        >
          <OfferCard offer={o} showTier />
        </motion.div>
      ))}
    </div>
  );
}
