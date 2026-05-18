"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { useFlowEngine } from "@/lib/flow/machine";
import { AgentPickStage } from "@/components/AgentPickStage";
import { BookingModal } from "@/components/BookingModal";
import { MemoryBadge } from "@/components/MemoryBadge";
import { PhaseIndicator } from "@/components/PhaseIndicator";
import { PhoneIcon } from "@/components/icons";
import { QueryBar } from "@/components/QueryBar";
import { Stage } from "@/components/Stage";
import { WinnerStage } from "@/components/WinnerStage";
import { probesForUseCase } from "@/lib/memory/useCases";

const GRID_PHASES = new Set([
  "researching",
  "cards_landed",
  "calling",
  "tiering",
  "eliminating_red",
  "eliminating_norm",
]);

const SKIPPABLE_PHASES = new Set([
  "calling",
  "tiering",
  "eliminating_red",
  "eliminating_norm",
]);

const WINNER_PHASES = new Set(["winner", "booking", "booked"]);

export default function Home() {
  const engine = useFlowEngine();
  const isIdle = engine.phase === "idle";

  // Calling-phase probes: derived from the use case + parsed hints, so we can
  // tell the user *what the agent is asking the host about* without a per-call
  // round-trip. Same helper the call provider uses server-side.
  const probes = useMemo(() => {
    if (!engine.userContext) return [] as string[];
    return probesForUseCase(
      engine.userContext.useCase,
      engine.userContext.parsedHints,
    );
  }, [engine.userContext]);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200/70 bg-[#fafafa]/85 backdrop-blur px-4 sm:px-6 lg:px-10 py-3.5">
        <div className="flex items-center gap-2 font-semibold text-[15px]">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-black text-white">
            <PhoneIcon className="w-4 h-4" />
          </span>
          <span>CallMyAgent</span>
          {!isIdle && <MemoryBadge userContext={engine.userContext} />}
        </div>
        <div className="flex items-center gap-3">
          {SKIPPABLE_PHASES.has(engine.phase) && (
            <motion.button
              onClick={engine.skipToPicker}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="rounded-full bg-black text-white px-3.5 py-1.5 text-[12px] font-semibold shadow-sm hover:shadow-md transition-shadow"
            >
              Skip to pick →
            </motion.button>
          )}
          {!isIdle && (
            <button
              onClick={engine.reset}
              className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors"
            >
              Start over
            </button>
          )}
        </div>
      </header>

      <PhaseIndicator phase={engine.phase} probes={probes} />

      <div className="flex-1">
        {isIdle && (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-220px)] px-4 py-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
                Find. Negotiate. Book.
              </h1>
              <p className="text-base sm:text-lg text-gray-500 mt-3 max-w-xl mx-auto">
                Agents scan rentals, call to negotiate, and let you pick the
                winner.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="w-full"
            >
              <QueryBar onSubmit={engine.submit} />
            </motion.div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500">
              <span className="text-gray-400">Try:</span>
              {[
                "Chce dom w SF dobry 16-18 i budzet 400",
                "2BR Mission, $350 Nov 16–18",
                "Quiet 1BR near Hayes Valley, ≤$420",
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => engine.submit(s)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 hover:border-gray-400 hover:text-gray-900 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {GRID_PHASES.has(engine.phase) && <Stage engine={engine} />}

        {engine.phase === "agent_pick" && <AgentPickStage engine={engine} />}

        {WINNER_PHASES.has(engine.phase) && <WinnerStage engine={engine} />}
      </div>

      <BookingModal engine={engine} />
    </main>
  );
}
