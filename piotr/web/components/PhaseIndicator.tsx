"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Phase } from "@/lib/types";

const CALLING_PROBE_PREFIX = "Asking the host about:";

const labels: Record<Phase, { label: string; sub: string } | null> = {
  idle: null,
  researching: {
    label: "Scanning rentals",
    sub: "Crawling listings across the web…",
  },
  cards_landed: { label: "15 offers found", sub: "Dialing them all in parallel…" },
  calling: {
    label: "Agents on the line",
    sub: "All 15 calls in parallel — 2 picked up and got squeezed.",
  },
  tiering: {
    label: "Sorting by quality",
    sub: "Reviewing price, rating, and call outcomes…",
  },
  eliminating_red: { label: "Cutting the worst", sub: "Goodbye 👋" },
  eliminating_norm: {
    label: "Cutting the mediocre",
    sub: "Only the strong matches survive.",
  },
  agent_pick: null,
  winner: { label: "Winner picked", sub: "Lock it in." },
  booking: { label: "Booking", sub: "Final confirmation with the owner…" },
  booked: { label: "All set 🎉", sub: "You're booked." },
};

const SOURCES = ["airbnb.com", "booking.com", "vrbo.com", "hostelworld.com"];

export function PhaseIndicator({
  phase,
  probes,
}: {
  phase: Phase;
  // Things the calling agents are probing for, derived from the user's
  // memory profile + use case. Rendered as the calling-phase sub-line so the
  // user can see *why* the agent is asking what it's asking.
  probes?: string[];
}) {
  const cur = labels[phase];

  if (!cur) return null;

  const callingProbes =
    phase === "calling" && probes && probes.length > 0
      ? probes.slice(0, 3)
      : null;

  return (
    <div className="min-h-16 flex flex-col items-center justify-center pt-2 pb-1">
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
          {callingProbes && (
            <motion.div
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="text-[11px] text-violet-600 mt-1.5 max-w-2xl mx-auto"
            >
              <span className="text-gray-400">{CALLING_PROBE_PREFIX} </span>
              <span className="font-medium">{callingProbes.join(" · ")}</span>
            </motion.div>
          )}
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
