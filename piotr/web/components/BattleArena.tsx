"use client";

import { AnimatePresence, motion } from "motion/react";
import { OfferCard } from "./OfferCard";
import type { FlowEngine } from "@/lib/flow/machine";

export function BattleArena({ engine }: { engine: FlowEngine }) {
  const {
    champion,
    currentChallenger,
    runtime,
    battleRound,
    totalRounds,
    pickWinner,
  } = engine;

  if (!champion || !currentChallenger) return null;

  return (
    <div className="flex flex-col items-center gap-8 py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-gray-500">
          Battle Royale
        </div>
        <div className="text-2xl font-bold mt-1">
          Round {battleRound} of {totalRounds}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Champion vs new challenger — pick your favorite.
        </p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-center w-full justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={`champ-${champion.id}-${battleRound}`}
            initial={{ x: -120, opacity: 0, rotate: -4 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            exit={{ x: -300, opacity: 0, rotate: -15 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="relative"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gray-900 text-white px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider z-10">
              Champion
            </div>
            <OfferCard
              offer={champion}
              runtime={runtime[champion.id]}
              showTier
              size="battle"
              onClick={() => pickWinner(champion.id)}
            />
          </motion.div>
        </AnimatePresence>

        <div className="text-2xl font-light text-gray-300 sm:rotate-0 rotate-90">
          vs
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`chal-${currentChallenger.id}-${battleRound}`}
            initial={{ x: 120, opacity: 0, rotate: 4 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            exit={{ x: 300, opacity: 0, rotate: 15 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="relative"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 text-white px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider z-10">
              Challenger
            </div>
            <OfferCard
              offer={currentChallenger}
              runtime={runtime[currentChallenger.id]}
              showTier
              size="battle"
              onClick={() => pickWinner(currentChallenger.id)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="text-xs text-gray-400">Click a card to keep it.</p>
    </div>
  );
}
