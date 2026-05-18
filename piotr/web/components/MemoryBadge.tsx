"use client";

import { motion } from "motion/react";
import type { UserContext } from "@/lib/memory";
import { summarizeHints, useCaseLabel } from "@/lib/memory/personalize";
import { SparklesIcon } from "./icons";

interface Props {
  userContext: UserContext | null;
}

export function MemoryBadge({ userContext }: Props) {
  if (!userContext) return null;
  const parts = summarizeHints(userContext);
  const label = useCaseLabel(userContext.useCase);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-2.5 py-1 text-[11px] font-medium text-violet-700"
      title="Inferred from your query and history"
    >
      <SparklesIcon className="w-3 h-3 text-violet-500" />
      <span className="font-semibold">{label}</span>
      {parts.length > 0 && (
        <>
          <span className="text-violet-300">·</span>
          <span className="text-violet-600">{parts.join(" · ")}</span>
        </>
      )}
    </motion.div>
  );
}
