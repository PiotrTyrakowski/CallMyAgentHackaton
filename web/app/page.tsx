"use client";

import { useRunStream } from "./hooks/useRunStream";
import { Booking } from "./components/Booking";
import { Canvas } from "./components/Canvas";
import { QueryBar } from "./components/QueryBar";
import { Tournament } from "./components/Tournament";

export default function Page() {
  const { state, start, pick, book, reset } = useRunStream();

  if (state.phase === "idle") return <QueryBar onSubmit={start} />;
  if (state.phase === "error")
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-red-400">
        <div>Error: {state.error ?? "unknown"}</div>
        <button onClick={reset} className="text-sm text-zinc-400 underline underline-offset-4">
          start over
        </button>
      </div>
    );

  // winner declared → booking surface (covers idle-tournament-with-winner, booking, done)
  if (state.winnerId) return <Booking state={state} onBook={book} onReset={reset} />;

  if (state.phase === "tournament") return <Tournament state={state} onPick={pick} />;
  return <Canvas state={state} />;
}
