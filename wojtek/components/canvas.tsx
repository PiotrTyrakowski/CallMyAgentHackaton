"use client";
import { AnimatePresence, motion } from "framer-motion";
import { OfferCard } from "./offer-card";
import type { Offer } from "@/lib/types";

export function Canvas({
  offers,
  showTier = false,
}: {
  offers: Offer[];
  showTier?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-4">
      <AnimatePresence>
        {offers
          .filter((o) => !o.eliminated)
          .map((o) => (
            <motion.div
              key={o.id}
              layout
              initial={{ opacity: 0, scale: 0.6, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{
                opacity: 0,
                scale: 0.4,
                y: 200,
                rotate: 30,
                transition: { duration: 0.6 },
              }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <OfferCard offer={o} showTier={showTier} />
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}
