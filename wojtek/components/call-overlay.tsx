"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Phone } from "lucide-react";
import type { CallStatus, TranscriptChunk } from "@/lib/types";

export function CallOverlay({
  status,
  transcript,
}: {
  status: CallStatus;
  transcript: TranscriptChunk[];
}) {
  const ringing = status === "ringing";
  const active = status === "ringing" || status === "negotiating";
  if (!active && transcript.length === 0) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-stretch justify-end overflow-hidden bg-black/70 backdrop-blur-sm">
      <AnimatePresence>
        {ringing && (
          <motion.div
            key="ring"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          >
            <motion.div
              animate={{ rotate: [-12, 12, -12] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            >
              <Phone className="size-12 text-emerald-400" />
            </motion.div>
            <div className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
              ringing…
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-h-[60%] space-y-1 overflow-y-auto p-3 text-[11px] leading-tight">
        {transcript.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={
              c.speaker === "agent"
                ? "text-emerald-300"
                : "text-zinc-200"
            }
          >
            <span className="opacity-60">
              {c.speaker === "agent" ? "agent:" : "owner:"}
            </span>{" "}
            {c.text}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
