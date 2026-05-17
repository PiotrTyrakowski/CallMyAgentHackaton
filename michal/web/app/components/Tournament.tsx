"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import type { RunUiState } from "../types";
import { ListingCard } from "./ListingCard";

export function Tournament({
  state,
  onPick,
}: {
  state: RunUiState;
  onPick: (id: string) => void;
}) {
  const pair = state.pair;

  useEffect(() => {
    if (!pair) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onPick(pair.left_id);
      else if (e.key === "ArrowRight") onPick(pair.right_id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pair, onPick]);

  if (!pair) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-400">Loading next pair…</p>
      </div>
    );
  }
  const left = state.cards[pair.left_id];
  const right = state.cards[pair.right_id];
  if (!left || !right) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 py-10 gap-6">
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">tournament · round {pair.round}</div>
        <h2 className="text-3xl font-bold mt-1">pick the better one</h2>
        <p className="text-zinc-400 mt-1 text-sm">
          ← arrow · click · swipe · {pair.remaining} {pair.remaining === 1 ? "match" : "matches"} left
        </p>
      </div>

      <div className="flex items-stretch gap-8 w-full max-w-5xl">
        <Pick side="left" cardId={pair.left_id} onPick={() => onPick(pair.left_id)} state={state} />
        <div className="self-center text-zinc-600 text-3xl font-light">vs</div>
        <Pick side="right" cardId={pair.right_id} onPick={() => onPick(pair.right_id)} state={state} />
      </div>
    </div>
  );
}

function Pick({
  cardId,
  side,
  onPick,
  state,
}: {
  cardId: string;
  side: "left" | "right";
  onPick: () => void;
  state: RunUiState;
}) {
  const card = state.cards[cardId];
  if (!card) return null;

  return (
    <motion.button
      layoutId={`card-${cardId}`}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        const dx = info.offset.x;
        if ((side === "left" && dx > 80) || (side === "right" && dx < -80)) onPick();
      }}
      onClick={onPick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="flex-1 cursor-pointer text-left"
    >
      <div className="w-full max-w-md mx-auto">
        <ListingCard card={card} />
      </div>
      <div className="mt-3 text-center text-xs text-zinc-500">
        press {side === "left" ? "←" : "→"} or click
      </div>
    </motion.button>
  );
}
