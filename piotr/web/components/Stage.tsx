"use client";

import { AnimatePresence, motion } from "motion/react";
import { OfferCard } from "./OfferCard";
import type { FlowEngine } from "@/lib/flow/machine";

const TIER_PHASES = new Set([
  "tiering",
  "eliminating_red",
  "eliminating_norm",
  "battle_royale",
  "winner",
  "booking",
  "booked",
]);

const hash = (s: string) =>
  s.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);

const exitRotate = (id: string) => ((hash(id) % 60) - 30);

export function Stage({ engine }: { engine: FlowEngine }) {
  const showTier = TIER_PHASES.has(engine.phase);
  const visibleOffers = engine.offers.filter(
    (o) => engine.runtime[o.id]?.alive,
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 py-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
        <AnimatePresence>
          {visibleOffers.map((offer) => {
            const rt = engine.runtime[offer.id];
            if (!rt) return null;
            const rot = exitRotate(offer.id);
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, scale: 0.85, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  y: 700,
                  rotate: rot,
                  scale: 0.9,
                  transition: { duration: 0.75, ease: "easeIn" },
                }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <OfferCard offer={offer} runtime={rt} showTier={showTier} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
