"use client";

import { useCallback, useReducer, useRef } from "react";
import type { Offer, OfferRuntimeState, Phase } from "../types";
import { callProvider, offerProvider } from "../providers";
import { sleep, timings } from "./timings";

interface State {
  phase: Phase;
  query: string;
  offers: Offer[];
  runtime: Record<string, OfferRuntimeState>;
  champion: Offer | null;
  currentChallenger: Offer | null;
  battleQueue: Offer[];
  battleRound: number;
  totalRounds: number;
  researchSources: string[];
}

type Action =
  | { type: "RESET" }
  | { type: "SET_PHASE"; phase: Phase }
  | { type: "SET_QUERY"; query: string }
  | { type: "ADD_OFFER"; offer: Offer }
  | {
      type: "UPDATE_RUNTIME";
      id: string;
      patch: Partial<OfferRuntimeState>;
    }
  | { type: "KILL_OFFER"; id: string }
  | { type: "START_BATTLE"; survivors: Offer[] }
  | { type: "PICK"; winnerId: string };

const initial: State = {
  phase: "idle",
  query: "",
  offers: [],
  runtime: {},
  champion: null,
  currentChallenger: null,
  battleQueue: [],
  battleRound: 0,
  totalRounds: 0,
  researchSources: ["airbnb.com", "booking.com", "vrbo.com", "hostelworld.com"],
};

const reducer = (s: State, a: Action): State => {
  switch (a.type) {
    case "RESET":
      return { ...initial };
    case "SET_PHASE":
      return { ...s, phase: a.phase };
    case "SET_QUERY":
      return { ...s, query: a.query };
    case "ADD_OFFER":
      return {
        ...s,
        offers: [...s.offers, a.offer],
        runtime: {
          ...s.runtime,
          [a.offer.id]: {
            callStatus: "queued",
            currentPrice: a.offer.originalPrice,
            negotiatedDiscount: 0,
            alive: true,
          },
        },
      };
    case "UPDATE_RUNTIME":
      return {
        ...s,
        runtime: {
          ...s.runtime,
          [a.id]: { ...s.runtime[a.id], ...a.patch },
        },
      };
    case "KILL_OFFER":
      return {
        ...s,
        runtime: {
          ...s.runtime,
          [a.id]: { ...s.runtime[a.id], alive: false },
        },
      };
    case "START_BATTLE": {
      const survivors = a.survivors;
      const [champ, challenger, ...rest] = survivors;
      return {
        ...s,
        champion: champ ?? null,
        currentChallenger: challenger ?? null,
        battleQueue: rest,
        battleRound: 1,
        totalRounds: Math.max(0, survivors.length - 1),
      };
    }
    case "PICK": {
      if (!s.champion || !s.currentChallenger) return s;
      const winner =
        a.winnerId === s.champion.id ? s.champion : s.currentChallenger;
      if (s.battleQueue.length === 0) {
        return {
          ...s,
          champion: winner,
          currentChallenger: null,
          phase: "winner",
        };
      }
      const [next, ...rest] = s.battleQueue;
      return {
        ...s,
        champion: winner,
        currentChallenger: next,
        battleQueue: rest,
        battleRound: s.battleRound + 1,
      };
    }
    default:
      return s;
  }
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function useFlowEngine() {
  const [state, dispatch] = useReducer(reducer, initial);
  const runningRef = useRef(false);

  const submit = useCallback(async (query: string) => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      dispatch({ type: "RESET" });
      dispatch({ type: "SET_QUERY", query });
      dispatch({ type: "SET_PHASE", phase: "researching" });

      const collected: Offer[] = [];
      for await (const offer of offerProvider.search(query)) {
        collected.push(offer);
        dispatch({ type: "ADD_OFFER", offer });
      }

      dispatch({ type: "SET_PHASE", phase: "cards_landed" });
      await sleep(timings.cardsLanded);

      dispatch({ type: "SET_PHASE", phase: "calling" });
      const callTasks = collected.map(async (offer, idx) => {
        await sleep(idx * timings.callPerCardOffset);
        for await (const ev of callProvider.call(offer)) {
          dispatch({
            type: "UPDATE_RUNTIME",
            id: offer.id,
            patch: {
              callStatus: ev.status,
              currentPrice: ev.currentPrice,
              negotiatedDiscount: ev.negotiatedDiscount,
            },
          });
        }
      });
      await Promise.all(callTasks);
      await sleep(400);

      dispatch({ type: "SET_PHASE", phase: "tiering" });
      await sleep(timings.tieringApply + timings.tieringHold);

      dispatch({ type: "SET_PHASE", phase: "eliminating_red" });
      const reds = collected.filter((o) => o.tier === "red");
      for (let i = 0; i < reds.length; i++) {
        dispatch({ type: "KILL_OFFER", id: reds[i].id });
        await sleep(timings.eliminateRedStagger);
      }
      await sleep(timings.eliminateRedFall + timings.eliminateRedHold);

      dispatch({ type: "SET_PHASE", phase: "eliminating_norm" });
      const norms = collected.filter((o) => o.tier === "normal");
      for (let i = 0; i < norms.length; i++) {
        dispatch({ type: "KILL_OFFER", id: norms[i].id });
        await sleep(timings.eliminateNormStagger);
      }
      await sleep(timings.eliminateNormFall + timings.eliminateNormHold);

      const survivors = collected.filter(
        (o) => o.tier === "green" || o.tier === "gold",
      );
      dispatch({ type: "START_BATTLE", survivors: shuffle(survivors) });
      dispatch({ type: "SET_PHASE", phase: "battle_royale" });
    } finally {
      runningRef.current = false;
    }
  }, []);

  const pickWinner = useCallback((id: string) => {
    dispatch({ type: "PICK", winnerId: id });
  }, []);

  const startBooking = useCallback(() => {
    dispatch({ type: "SET_PHASE", phase: "booking" });
  }, []);

  const closeBooking = useCallback(() => {
    dispatch({ type: "SET_PHASE", phase: "winner" });
  }, []);

  const confirmBooking = useCallback(async () => {
    await sleep(timings.bookingCallMs);
    dispatch({ type: "SET_PHASE", phase: "booked" });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    ...state,
    submit,
    pickWinner,
    startBooking,
    closeBooking,
    confirmBooking,
    reset,
  };
}

export type FlowEngine = ReturnType<typeof useFlowEngine>;
