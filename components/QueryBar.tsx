"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import {
  ArrowUpIcon,
  CalendarIcon,
  FilterIcon,
  MapPinIcon,
} from "./icons";

interface Props {
  onSubmit: (query: string) => void;
  disabled?: boolean;
  defaultValue?: string;
}

export function QueryBar({ onSubmit, disabled, defaultValue = "" }: Props) {
  const [v, setV] = useState(defaultValue);

  const submit = () => {
    const t = v.trim();
    if (!t || disabled) return;
    onSubmit(t);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl">
      <div className="rounded-[22px] border border-gray-200 bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] overflow-hidden">
        <div className="flex flex-col gap-2 px-5 py-4">
          <textarea
            value={v}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="2BR in SoMa, Nov 16–18, under $400…"
            aria-label="Describe what you want to find"
            className="w-full resize-none border-0 bg-transparent py-1.5 text-[15px] leading-6 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-gray-500">
              <ToolButton label="Filters">
                <FilterIcon className="w-4 h-4" />
              </ToolButton>
              <ToolButton label="Map">
                <MapPinIcon className="w-4 h-4" />
              </ToolButton>
              <ToolButton label="Dates">
                <CalendarIcon className="w-4 h-4" />
              </ToolButton>
            </div>
            <motion.button
              type="submit"
              disabled={disabled || !v.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Search"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white shadow-md transition-shadow hover:shadow-lg disabled:opacity-25"
            >
              <ArrowUpIcon className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </form>
  );
}

function ToolButton({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
    >
      {children}
    </button>
  );
}
