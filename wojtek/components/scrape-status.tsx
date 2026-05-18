"use client";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Globe } from "lucide-react";

export interface ScrapeState {
  sessionId?: string;
  liveUrl?: string;
  status: string;
  elapsedSeconds: number;
  costUsd?: number;
  actions: string[];
  offersFound: number;
}

export function ScrapeStatus({ state }: { state: ScrapeState }) {
  const live = state.status === "running" || state.status === "starting";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 backdrop-blur"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <motion.div
            animate={live ? { scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] } : {}}
            transition={{ duration: 1.4, repeat: Infinity }}
            className={`size-2 rounded-full ${live ? "bg-emerald-400" : state.status === "idle" ? "bg-zinc-500" : "bg-emerald-400"}`}
          />
          <span className="font-mono text-xs text-zinc-400">
            browser-use · {state.status}
          </span>
          <span className="text-[10px] text-zinc-600">
            {state.elapsedSeconds}s
          </span>
          {typeof state.costUsd === "number" && (
            <span className="text-[10px] text-zinc-600">
              · ${state.costUsd.toFixed(3)}
            </span>
          )}
        </div>
        {state.liveUrl && (
          <a
            href={state.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
          >
            <Globe className="size-3" /> watch live{" "}
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      <div className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">
        agent actions
      </div>
      <div className="max-h-40 space-y-1 overflow-y-auto text-xs">
        <AnimatePresence initial={false}>
          {state.actions.slice(-12).map((a, i) => (
            <motion.div
              key={`${i}-${a.slice(0, 12)}`}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-mono text-zinc-400"
            >
              <span className="text-emerald-400">›</span> {a}
            </motion.div>
          ))}
        </AnimatePresence>
        {state.actions.length === 0 && (
          <div className="text-zinc-600 italic">spinning up browser…</div>
        )}
      </div>

      {state.offersFound > 0 && (
        <div className="mt-3 text-[11px] text-zinc-400">
          <span className="text-emerald-300 font-semibold">
            {state.offersFound}
          </span>{" "}
          listing{state.offersFound === 1 ? "" : "s"} captured
        </div>
      )}
    </motion.div>
  );
}
