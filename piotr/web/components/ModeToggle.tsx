"use client";

import { motion } from "motion/react";
import type { Mode } from "@/lib/types";

const OPTIONS: { value: Mode; label: string; sub: string }[] = [
  {
    value: "battle",
    label: "Battle Royale",
    sub: "Cards face off 1v1, you pick winners",
  },
  {
    value: "agent_pick",
    label: "Agent's Pick",
    sub: "Agent ranks & presents one at a time",
  },
];

interface Props {
  value: Mode;
  onChange: (mode: Mode) => void;
}

export function ModeToggle({ value, onChange }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-gray-500">
        Demo mode
      </div>
      <div className="inline-flex items-stretch rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        {OPTIONS.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="relative px-4 py-2.5 text-left rounded-xl transition-colors min-w-[180px]"
            >
              {active && (
                <motion.div
                  layoutId="mode-toggle-pill"
                  className="absolute inset-0 bg-black rounded-xl"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <div className="relative z-10">
                <div
                  className={`text-[13px] font-bold ${
                    active ? "text-white" : "text-gray-900"
                  }`}
                >
                  {opt.label}
                </div>
                <div
                  className={`text-[11px] mt-0.5 ${
                    active ? "text-white/70" : "text-gray-500"
                  }`}
                >
                  {opt.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
