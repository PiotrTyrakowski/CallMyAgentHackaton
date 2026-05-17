"use client";

import { AnimatePresence, motion } from "motion/react";
import { OfferTinderCard } from "./OfferTinderCard";
import type { Offer, OfferRuntimeState } from "@/lib/types";
import type { FlowEngine } from "@/lib/flow/machine";

export function BattleArena({ engine }: { engine: FlowEngine }) {
  const { leftCard, rightCard, runtime, battleRound, totalRounds, pickWinner } =
    engine;

  if (!leftCard || !rightCard) return null;

  return (
    <div className="flex flex-col items-center gap-6 py-6 px-4">
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
          Flip through each card, then pick your favorite.
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-stretch lg:items-start w-full justify-center">
        <Side
          offer={leftCard}
          runtime={runtime[leftCard.id]}
          onPick={() => pickWinner(leftCard.id)}
          entryX={-120}
          exitX={-300}
        />

        <div className="self-center text-2xl font-light text-gray-300">vs</div>

        <Side
          offer={rightCard}
          runtime={runtime[rightCard.id]}
          onPick={() => pickWinner(rightCard.id)}
          entryX={120}
          exitX={300}
        />
      </div>
    </div>
  );
}

function Side({
  offer,
  runtime,
  onPick,
  entryX,
  exitX,
}: {
  offer: Offer;
  runtime: OfferRuntimeState;
  onPick: () => void;
  entryX: number;
  exitX: number;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={offer.id}
          initial={{ x: entryX, opacity: 0, rotate: entryX < 0 ? -4 : 4 }}
          animate={{ x: 0, opacity: 1, rotate: 0 }}
          exit={{ x: exitX, opacity: 0, rotate: exitX < 0 ? -15 : 15 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <OfferTinderCard offer={offer} runtime={runtime} />
        </motion.div>
      </AnimatePresence>
      <motion.button
        type="button"
        onClick={onPick}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.96 }}
        className="rounded-full bg-black text-white px-8 py-3 text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
      >
        Pick this →
      </motion.button>
    </div>
  );
}
