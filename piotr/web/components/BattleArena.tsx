"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { OfferCard } from "./OfferCard";
import { OfferDetailsModal } from "./OfferDetailsModal";
import type { Offer } from "@/lib/types";
import type { FlowEngine } from "@/lib/flow/machine";

export function BattleArena({ engine }: { engine: FlowEngine }) {
  const { leftCard, rightCard, runtime, battleRound, totalRounds, pickWinner } =
    engine;
  const [detailsOffer, setDetailsOffer] = useState<Offer | null>(null);

  if (!leftCard || !rightCard) return null;

  return (
    <>
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
            Tap a card for details — then pick the one you like more.
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-stretch w-full justify-center">
          <Side
            offer={leftCard}
            onShowDetails={() => setDetailsOffer(leftCard)}
            onPick={() => pickWinner(leftCard.id)}
            runtime={runtime[leftCard.id]}
            entryX={-120}
            exitX={-300}
          />

          <div className="self-center text-2xl font-light text-gray-300">
            vs
          </div>

          <Side
            offer={rightCard}
            onShowDetails={() => setDetailsOffer(rightCard)}
            onPick={() => pickWinner(rightCard.id)}
            runtime={runtime[rightCard.id]}
            entryX={120}
            exitX={300}
          />
        </div>
      </div>

      <OfferDetailsModal
        offer={detailsOffer}
        runtime={detailsOffer ? runtime[detailsOffer.id] : null}
        onClose={() => setDetailsOffer(null)}
      />
    </>
  );
}

function Side({
  offer,
  onShowDetails,
  onPick,
  runtime,
  entryX,
  exitX,
}: {
  offer: Offer;
  onShowDetails: () => void;
  onPick: () => void;
  runtime: FlowEngine["runtime"][string];
  entryX: number;
  exitX: number;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={offer.id}
          initial={{ x: entryX, opacity: 0, rotate: entryX < 0 ? -4 : 4 }}
          animate={{ x: 0, opacity: 1, rotate: 0 }}
          exit={{ x: exitX, opacity: 0, rotate: exitX < 0 ? -15 : 15 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <OfferCard
            offer={offer}
            runtime={runtime}
            showTier
            size="battle"
            onClick={onShowDetails}
          />
        </motion.div>
      </AnimatePresence>
      <motion.button
        key={`pick-${offer.id}`}
        type="button"
        onClick={onPick}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.96 }}
        className="rounded-full bg-black text-white px-6 py-2.5 text-sm font-semibold shadow-md hover:shadow-lg transition-shadow"
      >
        Pick this →
      </motion.button>
      <button
        type="button"
        onClick={onShowDetails}
        className="text-[12px] text-gray-500 hover:text-gray-900 underline-offset-4 hover:underline"
      >
        See details
      </button>
    </div>
  );
}
