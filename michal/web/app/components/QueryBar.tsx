"use client";

import { useState } from "react";

export function QueryBar({ onSubmit }: { onSubmit: (q: string) => void }) {
  const [q, setQ] = useState("Chcę dom w SF dobry 16-18 i budżet 400");
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 gap-8">
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-center">
        flow<span className="text-glow">.</span>
      </h1>
      <p className="text-zinc-400 text-center max-w-xl">
        Type what you want. Agents will scout listings, ring every owner, negotiate, and book.
      </p>
      <form
        className="w-full max-w-2xl flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) onSubmit(q.trim());
        }}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 bg-zinc-900/70 backdrop-blur border border-zinc-800 rounded-xl px-5 py-4 text-lg outline-none focus:border-glow"
          placeholder="e.g. need a house in SF for May 16-18, budget $400"
        />
        <button
          type="submit"
          className="bg-glow text-ink font-semibold rounded-xl px-6 py-4 hover:bg-emerald-300 transition"
        >
          go →
        </button>
      </form>
    </div>
  );
}
