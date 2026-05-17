"use client";
import { useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { streamSSE } from "@/lib/sse";
import {
  assignTiers,
  survivors,
  parseBudget,
  effectivePrice,
} from "@/lib/tier-logic";
import type { Offer, CallStatus, TranscriptChunk, Phase } from "@/lib/types";
import { QueryBar } from "@/components/query-bar";
import { Canvas } from "@/components/canvas";
import { OfferCard } from "@/components/offer-card";
import { TinderDeck } from "@/components/tinder-deck";
import { PvpArena } from "@/components/pvp-arena";
import { BookingModal } from "@/components/booking-modal";
import { Toaster } from "@/components/toaster";
import { toast } from "@/lib/toast-store";
import { fireConfetti } from "@/lib/confetti";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type SearchEvent = { type: "offer"; offer: Offer } | { type: "done" };
type CallEvent =
  | { type: "transcript"; chunk: TranscriptChunk }
  | { type: "discount"; percent: number }
  | { type: "status"; status: CallStatus };

export default function Home() {
  const s = useStore();
  const ranBattleRef = useRef(false);
  const ranTinderRef = useRef(false);

  const runCalls = useCallback(async () => {
    const offers = useStore.getState().offers;
    const callOne = async (o: Offer) => {
      await sleep(Math.random() * 600);
      useStore.getState().updateOffer(o.id, { callStatus: "ringing" });
      for await (const evt of streamSSE<CallEvent>("/api/call", {
        offer: o,
        task: "negotiate best price for 3 nights",
      })) {
        if (evt.type === "status") {
          useStore.getState().updateOffer(o.id, { callStatus: evt.status });
        } else if (evt.type === "transcript") {
          useStore.getState().appendTranscript(o.id, evt.chunk);
        } else if (evt.type === "discount") {
          useStore
            .getState()
            .updateOffer(o.id, { negotiatedDiscount: evt.percent });
          toast({
            tone: "success",
            title: `−${evt.percent}% · ${o.title}`,
          });
        }
      }
      useStore.getState().updateOffer(o.id, { callStatus: "done" });
    };
    await Promise.all(offers.map(callOne));
    await sleep(500);
    useStore.getState().setPhase("battle");
  }, []);

  const handleSearch = useCallback(
    async (q: string) => {
      const budget = parseBudget(q);
      s.setQuery(q, budget);
      s.resetOffers();
      ranBattleRef.current = false;
      ranTinderRef.current = false;
      s.setPhase("searching");
      await sleep(250);
      s.setPhase("spawning");
      for await (const evt of streamSSE<SearchEvent>("/api/search", {
        query: q,
      })) {
        if (evt.type === "offer") s.addOffer(evt.offer);
      }
      await sleep(500);
      s.setPhase("calling");
      runCalls();
    },
    [s, runCalls],
  );

  const runBattle = useCallback(async () => {
    if (ranBattleRef.current) return;
    ranBattleRef.current = true;
    const { offers, budget } = useStore.getState();
    const withTiers = assignTiers(offers, budget);
    useStore.getState().setOffers(withTiers);

    await sleep(700);
    const trashIds = withTiers
      .filter((o) => o.tier === "trash")
      .map((o) => o.id);
    for (const id of trashIds) {
      useStore.getState().updateOffer(id, { eliminated: true });
      await sleep(280);
    }
    await sleep(700);
    useStore.getState().setPhase("tinder-deck");
  }, []);

  const startPvp = useCallback(() => {
    if (ranTinderRef.current) return;
    ranTinderRef.current = true;
    const surv = survivors(useStore.getState().offers).map((o) => o.id);
    if (surv.length < 2) {
      useStore.getState().setWinner(surv[0]);
      useStore.getState().setPhase("winner");
      return;
    }
    useStore.getState().setPvpQueue(surv.slice(1));
    useStore.getState().setPvpChampion(surv[0]);
    useStore.getState().setPhase("pvp");
  }, []);

  const pickPvp = useCallback((winnerId: string) => {
    const { pvpQueue, pvpChampion } = useStore.getState();
    const left = pvpChampion!;
    const right = pvpQueue[0];
    const loser = winnerId === left ? right : left;
    useStore.getState().updateOffer(loser, { eliminated: true });
    const remainder = pvpQueue.slice(1);
    if (remainder.length === 0) {
      useStore.getState().setPvpChampion(null);
      useStore.getState().setPvpQueue([]);
      useStore.getState().setWinner(winnerId);
      useStore.getState().setPhase("winner");
      return;
    }
    useStore.getState().setPvpQueue(remainder);
    useStore.getState().setPvpChampion(winnerId);
  }, []);

  useEffect(() => {
    if (s.phase === "battle" && !ranBattleRef.current) void runBattle();
  }, [s.phase, runBattle]);

  useEffect(() => {
    if (s.phase === "tinder-deck" && !ranTinderRef.current) {
      const t = setTimeout(() => startPvp(), 1900);
      return () => clearTimeout(t);
    }
  }, [s.phase, startPvp]);

  useEffect(() => {
    if (s.phase === "winner") {
      fireConfetti({ gold: true });
      const t = setTimeout(() => useStore.getState().setPhase("booking"), 2200);
      return () => clearTimeout(t);
    }
  }, [s.phase]);

  useEffect(() => {
    if (s.phase === "done") fireConfetti();
  }, [s.phase]);

  const winnerOffer = s.offers.find((o) => o.id === s.winnerId) ?? null;
  const champion = s.offers.find((o) => o.id === s.pvpChampion);
  const challenger = s.offers.find((o) => o.id === s.pvpQueue[0]);
  const totalSurvivors = survivors(s.offers).length;
  const totalRounds = Math.max(0, totalSurvivors - 1);
  const currentRound = totalRounds - s.pvpQueue.length + 1;

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center gap-10 px-6 pb-16 pt-6">
      <Header onReset={() => s.reset()} canReset={s.phase !== "idle"} />
      <PhaseTitle phase={s.phase} />

      {(s.phase === "idle" || s.phase === "searching") && (
        <QueryBar onSubmit={handleSearch} disabled={s.phase !== "idle"} />
      )}

      {(s.phase === "spawning" ||
        s.phase === "calling" ||
        s.phase === "battle") && (
        <Canvas offers={s.offers} showTier={s.phase === "battle"} />
      )}

      {s.phase === "tinder-deck" && (
        <TinderDeck offers={survivors(s.offers)} onContinue={startPvp} />
      )}

      {s.phase === "pvp" && champion && challenger && (
        <PvpArena
          left={champion}
          right={challenger}
          round={currentRound}
          totalRounds={totalRounds}
          onPick={pickPvp}
        />
      )}

      {s.phase === "winner" && winnerOffer && <OfferCard offer={winnerOffer} showTier />}

      {s.phase === "booking" && winnerOffer && (
        <BookingModal
          offer={winnerOffer}
          onConfirmed={(tx) => {
            s.setBookingTx(tx);
            s.setPhase("done");
          }}
        />
      )}

      {s.phase === "done" && winnerOffer && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <p className="text-sm text-zinc-400">
            {winnerOffer.title} · ${effectivePrice(winnerOffer) * 3}
            {winnerOffer.negotiatedDiscount ? (
              <span className="ml-2 text-emerald-300">
                saved $
                {(winnerOffer.price - effectivePrice(winnerOffer)) * 3}
              </span>
            ) : null}
          </p>
          <button
            onClick={() => s.reset()}
            className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-200 hover:underline"
          >
            run again
          </button>
        </motion.div>
      )}

      <Toaster />
    </div>
  );
}

function Header({
  onReset,
  canReset,
}: {
  onReset: () => void;
  canReset: boolean;
}) {
  return (
    <header className="flex w-full max-w-6xl items-center justify-between">
      <span className="text-sm font-semibold tracking-tight text-zinc-300">
        ychack<span className="text-emerald-400">.booker</span>
      </span>
      {canReset && (
        <button
          onClick={onReset}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          reset
        </button>
      )}
    </header>
  );
}

const PHASE_TITLES: Record<Phase, string> = {
  idle: "Where to?",
  searching: "Searching…",
  spawning: "Found a few",
  calling: "Calling owners",
  battle: "Ranking",
  "tinder-deck": "Top picks",
  pvp: "Pick one",
  winner: "Your winner",
  booking: "",
  done: "Booked",
};

function PhaseTitle({ phase }: { phase: Phase }) {
  const title = PHASE_TITLES[phase];
  if (!title) return null;
  return (
    <AnimatePresence mode="wait">
      <motion.h1
        key={phase}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.25 }}
        className="text-center text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl"
      >
        {title}
      </motion.h1>
    </AnimatePresence>
  );
}
