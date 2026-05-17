"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { RunUiState } from "../types";
import { ListingCard } from "./ListingCard";

export function Booking({
  state,
  onBook,
  onReset,
}: {
  state: RunUiState;
  onBook: () => void;
  onReset: () => void;
}) {
  const winner = state.winnerId ? state.cards[state.winnerId] : null;
  const isBooking = state.phase === "booking";
  const done = state.phase === "done";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-8 py-10">
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">winner</div>
        <h2 className="text-3xl font-bold mt-1">{done ? "booked 🎉" : "yupii — you picked"}</h2>
      </div>

      {winner && (
        <motion.div layoutId={`card-${winner.card_id}`} className="w-72">
          <ListingCard card={winner} />
        </motion.div>
      )}

      {!isBooking && !done && (
        <button
          onClick={onBook}
          className="bg-glow text-ink font-extrabold text-2xl rounded-2xl px-10 py-5 shadow-[0_0_40px_rgba(124,255,178,0.6)] hover:scale-105 transition"
        >
          EASY BOOKING
        </button>
      )}

      <div className="w-full max-w-md space-y-2">
        <AnimatePresence>
          {state.bookingSteps.map((s, i) => (
            <motion.div
              key={`${s.step}-${i}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                s.step === "confirmed"
                  ? "border-glow bg-glow/10"
                  : "border-zinc-800 bg-zinc-900/60"
              }`}
            >
              <span className="text-glow text-xl mt-0.5">
                {s.step === "confirmed" ? "✓" : "•"}
              </span>
              <div>
                <div className="text-xs uppercase tracking-wider text-zinc-500">{s.step.replace("_", " ")}</div>
                <div className="text-sm">{s.detail}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {done && (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={onReset}
          className="mt-4 text-sm text-zinc-400 hover:text-zinc-200 underline underline-offset-4"
        >
          run another query →
        </motion.button>
      )}
    </div>
  );
}
