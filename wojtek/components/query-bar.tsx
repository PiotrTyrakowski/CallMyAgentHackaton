"use client";
import { useState } from "react";
import { Search } from "lucide-react";

export function QueryBar({
  onSubmit,
  disabled,
}: {
  onSubmit: (q: string) => void;
  disabled?: boolean;
}) {
  const [q, setQ] = useState("Find me a house in SF, June 16-18, budget $400/night");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSubmit(q);
      }}
      className="w-full max-w-2xl"
    >
      <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/60 px-5 py-3 shadow-lg backdrop-blur">
        <Search className="size-5 text-zinc-400" />
        <input
          className="flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-500 outline-none"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="What are you looking for?"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled}
          className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          Find
        </button>
      </div>
    </form>
  );
}
