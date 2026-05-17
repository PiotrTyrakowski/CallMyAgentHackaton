"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { Card, RunUiState } from "../types";
import { ListingCard } from "./ListingCard";

export function Canvas({ state }: { state: RunUiState }) {
  const cards = Object.values(state.cards);
  const [flyRejected, setFlyRejected] = useState(false);

  useEffect(() => {
    if (state.phase !== "filtering") {
      setFlyRejected(false);
      return;
    }
    const t = setTimeout(() => setFlyRejected(true), 700);
    return () => clearTimeout(t);
  }, [state.phase]);

  const cells: (Card | null)[] = Array(25).fill(null);
  for (const c of cards) {
    if (c.grid_cell >= 0 && c.grid_cell < 25) {
      // hide rejected once the fly-off timer triggers
      if (flyRejected && c.passed === false) continue;
      cells[c.grid_cell] = c;
    }
  }

  const phaseLabel: Record<string, string> = {
    spawning: "Scouting listings",
    calling: "Negotiating with owners",
    filtering: "Filtering offers",
  };

  return (
    <div className="min-h-screen px-8 py-6 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">phase</div>
          <h2 className="text-2xl font-semibold">
            {phaseLabel[state.phase] ?? state.phase}{" "}
            <span className="text-glow animate-pulse">●</span>
          </h2>
        </div>
        <div className="text-right text-xs text-zinc-400">
          {state.parsed && (
            <>
              <div>{state.parsed.location} · {state.parsed.date_start}–{state.parsed.date_end}</div>
              <div>budget ${state.parsed.budget_per_night} · sleeps {state.parsed.capacity}</div>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 grid grid-cols-5 grid-rows-5 gap-3 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="popLayout">
          {cells.map((c, i) =>
            c ? (
              <ListingCard key={c.card_id} card={c} hideBadgeUntilFinished />
            ) : (
              <div key={`empty-${i}`} className="rounded-xl border border-dashed border-zinc-800/50" />
            ),
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
