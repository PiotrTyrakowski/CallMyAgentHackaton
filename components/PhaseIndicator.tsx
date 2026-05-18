"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Phase } from "@/lib/types";

interface PhaseCopy {
  label: string;
  sub: string;
}

// Phase-specific copy. The cards_landed and calling lines are templated with
// the actual offer/answered counts so the indicator never drifts from reality
// (live scrapes don't always return 15 offers, and not every call connects).
const labelsFor = (
  phase: Phase,
  offerCount: number,
  answeredCount: number,
): PhaseCopy | null => {
  switch (phase) {
    case "idle":
      return null;
    case "researching":
      return {
        label: "Scanning rentals",
        sub: "Crawling listings across the web…",
      };
    case "cards_landed":
      return {
        label: `${offerCount} ${offerCount === 1 ? "offer" : "offers"} found`,
        sub: "Dialing them all in parallel…",
      };
    case "calling":
      return {
        label: "Agents on the line",
        sub:
          `All ${offerCount} calls in parallel — ` +
          (answeredCount > 0
            ? `${answeredCount} ${answeredCount === 1 ? "picked" : "picked"} up and ${answeredCount === 1 ? "is getting" : "are getting"} squeezed.`
            : "still ringing."),
      };
    case "tiering":
      return {
        label: "Sorting by quality",
        sub: "Reviewing price, rating, and call outcomes…",
      };
    case "eliminating_red":
      return { label: "Cutting the worst", sub: "Goodbye 👋" };
    case "eliminating_norm":
      return {
        label: "Cutting the mediocre",
        sub: "Only the strong matches survive.",
      };
    case "agent_pick":
      return null;
    case "winner":
      return { label: "Winner picked", sub: "Lock it in." };
    case "booking":
      return { label: "Booking", sub: "Final confirmation with the owner…" };
    case "booked":
      return { label: "All set 🎉", sub: "You're booked." };
  }
};

const SOURCES = ["airbnb.com", "booking.com", "vrbo.com", "hostelworld.com"];

export function PhaseIndicator({
  phase,
  offerCount,
  answeredCount,
}: {
  phase: Phase;
  offerCount: number;
  answeredCount: number;
}) {
  const cur = labelsFor(phase, offerCount, answeredCount);
  if (!cur) return null;

  return (
    <div className="h-16 flex flex-col items-center justify-center pt-2">
      <AnimatePresence mode="wait">
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
