"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  OfferTinderCard,
  TINDER_PAGES,
  TINDER_PAGE_LABELS,
  type TinderPageKey,
} from "./OfferTinderCard";
import type { Offer, OfferRuntimeState } from "@/lib/types";
import type { FlowEngine } from "@/lib/flow/machine";

export function BattleArena({ engine }: { engine: FlowEngine }) {
  const { leftCard, rightCard, runtime, battleRound, totalRounds, pickWinner } =
    engine;

  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [battleRound]);

  const changePage = useCallback((delta: number) => {
    setPageIndex((p) => (p + delta + TINDER_PAGES.length) % TINDER_PAGES.length);
  }, []);

  if (!leftCard || !rightCard) return null;

  return (
    <div className="flex flex-col items-center gap-4 py-5 px-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-gray-500">
          Battle Royale
        </div>
        <div className="text-2xl font-bold mt-0.5">
          Round {battleRound} of {totalRounds}
        </div>
      </motion.div>

      <PageTabs activeIndex={pageIndex} onSelect={setPageIndex} />

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-stretch lg:items-start w-full justify-center">
        <Side
          offer={leftCard}
          runtime={runtime[leftCard.id]}
          onPick={() => pickWinner(leftCard.id)}
          entryX={-120}
          exitX={-300}
          pageIndex={pageIndex}
          onChangePage={changePage}
        />

        <div className="self-center text-2xl font-light text-gray-300">vs</div>

        <Side
          offer={rightCard}
          runtime={runtime[rightCard.id]}
          onPick={() => pickWinner(rightCard.id)}
          entryX={120}
          exitX={300}
          pageIndex={pageIndex}
          onChangePage={changePage}
        />
      </div>
    </div>
  );
}

function PageTabs({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-gray-200 bg-white shadow-sm p-1 gap-0.5">
      {TINDER_PAGES.map((key, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(i)}
            className={`relative px-4 py-1.5 text-[12px] font-semibold rounded-full transition-colors ${
              active ? "text-white" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {active && (
              <motion.div
                layoutId="page-tab-pill"
                className="absolute inset-0 bg-black rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">
              {TINDER_PAGE_LABELS[key as TinderPageKey]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Side({
  offer,
  runtime,
  onPick,
  entryX,
  exitX,
  pageIndex,
  onChangePage,
}: {
  offer: Offer;
  runtime: OfferRuntimeState;
  onPick: () => void;
  entryX: number;
  exitX: number;
  pageIndex: number;
  onChangePage: (delta: number) => void;
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
          <OfferTinderCard
            offer={offer}
            runtime={runtime}
            pageIndex={pageIndex}
            onChangePage={onChangePage}
          />
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
