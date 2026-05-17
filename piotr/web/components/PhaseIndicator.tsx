"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Phase } from "@/lib/types";

const labels: Record<Phase, { label: string; sub: string } | null> = {
  idle: null,
  researching: {
    label: "Scanning rentals",
    sub: "Crawling listings across the web…",
  },
  cards_landed: { label: "15 offers found", sub: "Lining up calls…" },
  calling: {
    label: "Agents on the line",
    sub: "Negotiating discounts in real time…",
  },
  tiering: {
    label: "Sorting by quality",
    sub: "Reviewing price, rating, and savings…",
  },
  eliminating_red: { label: "Cutting the worst", sub: "Goodbye 👋" },
  eliminating_norm: {
    label: "Cutting the mediocre",
    sub: "Only the best survive.",
  },
  battle_royale: {
    label: "Battle Royale",
    sub: "Pick the one you like more.",
  },
  winner: { label: "Winner picked", sub: "Lock it in." },
  booking: { label: "Booking", sub: "Final confirmation with the owner…" },
  booked: { label: "All set 🎉", sub: "You're booked." },
};

const SOURCES = ["airbnb.com", "booking.com", "vrbo.com", "hostelworld.com"];

export function PhaseIndicator({ phase }: { phase: Phase }) {
  const cur = labels[phase];

  return (
    <div className="h-16 flex flex-col items-center justify-center pt-2">
      <AnimatePresence mode="wait">
        {cur && (
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="text-center"
          >
            <div className="text-[14px] font-semibold text-gray-900">
              {cur.label}
            </div>
            <div className="text-[12px] text-gray-500 mt-0.5 flex items-center justify-center gap-2">
              <span>{cur.sub}</span>
              {phase === "researching" && <SourceTicker />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SourceTicker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % SOURCES.length), 700);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <AnimatePresence mode="wait">
        <motion.span
          key={SOURCES[i]}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="font-mono text-emerald-700"
        >
          {SOURCES[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
