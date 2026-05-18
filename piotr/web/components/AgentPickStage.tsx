"use client";

import { AnimatePresence, motion } from "motion/react";
import { OfferTinderCard } from "./OfferTinderCard";
import { SparklesIcon } from "./icons";
import type { Offer } from "@/lib/types";
import type { FlowEngine } from "@/lib/flow/machine";

const TIER_TAGLINE: Record<Offer["tier"], string> = {
  gold: "Top pick overall",
  green: "Strong fit",
  normal: "Decent option",
  red: "Risky but available",
};

export function AgentPickStage({ engine }: { engine: FlowEngine }) {
  const {
    agentRanking,
    agentIndex,
    agentRejected,
    runtime,
    acceptAgentPick,
    rejectAgentPick,
  } = engine;

  const current = agentRanking[agentIndex];
  const exhausted = !current && agentRanking.length > 0;
  const rt = current ? runtime[current.id] : undefined;

  if (exhausted) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <h2 className="text-3xl font-bold tracking-tight">No more matches.</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-md">
          You rejected all {agentRejected.length} survivors. Start over with a
          looser query to see more options.
        </p>
        <motion.button
          type="button"
          onClick={engine.reset}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="mt-8 rounded-full bg-black text-white px-7 py-3 text-sm font-semibold shadow-md"
        >
          Start over
        </motion.button>
      </div>
    );
  }

  if (!current || !rt) return null;

  const total = agentRanking.length;
  const position = agentIndex + 1;
  const tagline = TIER_TAGLINE[current.tier];
  const remaining = total - position;

  return (
    <div className="px-4 pt-3 pb-4">
      <div className="max-w-3xl mx-auto flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-3"
        >
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-semibold text-gray-500">
            <SparklesIcon className="w-3 h-3 text-amber-500" />
            Agent's pick · {tagline}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-1 leading-tight">
            {position === 1
              ? "Here's what the agent picked for you."
              : "Next pick."}
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Tap the card to see why → overview, agent's take, the call, reviews.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ x: 80, opacity: 0, rotate: 3, scale: 0.96 }}
            animate={{ x: 0, opacity: 1, rotate: 0, scale: 1 }}
            exit={{ x: -240, opacity: 0, rotate: -10, scale: 0.94 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <OfferTinderCard offer={current} runtime={rt} size="winner" />
          </motion.div>
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={acceptAgentPick}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 220 }}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="mt-5 w-full max-w-[min(480px,40vw)] min-w-[400px] rounded-full bg-black text-white px-9 py-4 text-lg font-semibold shadow-lg shadow-black/15 hover:shadow-xl transition-shadow"
        >
          BOOK THIS →
        </motion.button>

        <motion.button
          type="button"
          onClick={rejectAgentPick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          whileHover={{ y: -1 }}
          className="mt-2.5 text-[12px] text-gray-500 hover:text-gray-900 underline underline-offset-4 transition-colors"
        >
          Not this — show next best{remaining > 0 ? ` (${remaining} left)` : ""}
        </motion.button>

        {agentRejected.length > 0 && (
          <div className="mt-1 text-[11px] text-gray-400">
            Rejected so far: {agentRejected.length}
          </div>
        )}
      </div>
    </div>
  );
}
