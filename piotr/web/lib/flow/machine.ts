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
  researchSources: string[];
  agentRanking: Offer[];
  agentIndex: number;
  agentRejected: string[];
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
  | { type: "FINALIZE_RUNTIME"; runtime: Record<string, OfferRuntimeState> }
  | { type: "START_AGENT_PICK"; ranking: Offer[] }
  | { type: "REJECT_PICK" }
  | { type: "ACCEPT_PICK" };

const initial: State = {
  phase: "idle",
  query: "",
  offers: [],
  runtime: {},
  champion: null,
  researchSources: ["airbnb.com", "booking.com", "vrbo.com", "hostelworld.com"],
  agentRanking: [],
  agentIndex: 0,
  agentRejected: [],
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
    case "FINALIZE_RUNTIME":
      return { ...s, runtime: a.runtime };
    case "START_AGENT_PICK":
      return {
        ...s,
        agentRanking: a.ranking,
        agentIndex: 0,
        agentRejected: [],
      };
    case "REJECT_PICK": {
      const rejected = s.agentRanking[s.agentIndex];
      const nextIndex = s.agentIndex + 1;
      return {
        ...s,
        agentIndex: nextIndex,
        agentRejected: rejected
          ? [...s.agentRejected, rejected.id]
          : s.agentRejected,
      };
    }
    case "ACCEPT_PICK": {
      const winner = s.agentRanking[s.agentIndex];
      if (!winner) return s;
      return { ...s, champion: winner, phase: "winner" };
    }
    default:
      return s;
  }
};

const TIER_WEIGHT: Record<Offer["tier"], number> = {
  gold: 1000,
  green: 700,
  normal: 400,
  red: 100,
};

export function scoreOffer(offer: Offer, rt: OfferRuntimeState): number {
  const base = TIER_WEIGHT[offer.tier];
  const discountScore = rt.negotiatedDiscount * 5;
  const ratingScore = offer.rating * 50;
  const reviewScore = Math.log10(Math.max(1, offer.reviews)) * 20;
  const callBonus = rt.callStatus === "done" ? 80 : 0;
  return base + discountScore + ratingScore + reviewScore + callBonus;
}

export function rankOffers(
  offers: Offer[],
  runtime: Record<string, OfferRuntimeState>,
): Offer[] {
  return [...offers].sort(
    (a, b) => scoreOffer(b, runtime[b.id]) - scoreOffer(a, runtime[a.id]),
  );
}

export function useFlowEngine() {
  const [state, dispatch] = useReducer(reducer, initial);
  const runningRef = useRef(false);
  const skipControllerRef = useRef<AbortController | null>(null);

  const submit = useCallback(async (query: string) => {
    if (runningRef.current) return;
    runningRef.current = true;
    const controller = new AbortController();
    skipControllerRef.current = controller;
    const signal = controller.signal;

    const abortableSleep = (ms: number) =>
      new Promise<void>((resolve) => {
        if (signal.aborted) return resolve();
        const id = setTimeout(resolve, ms);
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(id);
            resolve();
          },
          { once: true },
        );
      });

    try {
      dispatch({ type: "RESET" });
      dispatch({ type: "SET_QUERY", query });
      dispatch({ type: "SET_PHASE", phase: "researching" });

      const collected: Offer[] = [];
      for await (const offer of offerProvider.search(query)) {
        collected.push(offer);
        dispatch({ type: "ADD_OFFER", offer });
      }

      const localRuntime: Record<string, OfferRuntimeState> = {};
      for (const o of collected) {
        localRuntime[o.id] = {
          callStatus: "queued",
          currentPrice: o.originalPrice,
          negotiatedDiscount: 0,
          alive: true,
        };
      }

      dispatch({ type: "SET_PHASE", phase: "cards_landed" });
      await abortableSleep(timings.cardsLanded);

      dispatch({ type: "SET_PHASE", phase: "calling" });
      const callTasks = collected.map(async (offer) => {
        for await (const ev of callProvider.call(offer)) {
          if (signal.aborted) return;
          localRuntime[offer.id] = {
            ...localRuntime[offer.id],
            callStatus: ev.status,
            currentPrice: ev.currentPrice,
            negotiatedDiscount: ev.negotiatedDiscount,
          };
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

      const callsDonePromise = Promise.all(callTasks);
      const abortPromise = new Promise<"aborted">((resolve) => {
        if (signal.aborted) return resolve("aborted");
        signal.addEventListener("abort", () => resolve("aborted"), {
          once: true,
        });
      });
      const raceResult = await Promise.race([callsDonePromise, abortPromise]);

      if (raceResult === "aborted") {
        for (const o of collected) {
          const cur = localRuntime[o.id];
          const inProgress =
            cur.callStatus === "negotiating" || cur.callStatus === "done";
          if (inProgress) {
            const target = Math.round(
              o.originalPrice * (1 - o.expectedDiscountPct / 100),
            );
            localRuntime[o.id] = {
              callStatus: "done",
              currentPrice: target,
              negotiatedDiscount: o.originalPrice - target,
              alive: o.tier === "green" || o.tier === "gold",
            };
          } else {
            localRuntime[o.id] = {
              callStatus: "failed",
              currentPrice: o.originalPrice,
              negotiatedDiscount: 0,
              alive: o.tier === "green" || o.tier === "gold",
            };
          }
        }
        dispatch({ type: "FINALIZE_RUNTIME", runtime: localRuntime });
      } else {
        await abortableSleep(400);

        dispatch({ type: "SET_PHASE", phase: "tiering" });
        await abortableSleep(timings.tieringApply + timings.tieringHold);

        dispatch({ type: "SET_PHASE", phase: "eliminating_red" });
        const reds = collected.filter((o) => o.tier === "red");
        for (let i = 0; i < reds.length; i++) {
          if (signal.aborted) break;
          dispatch({ type: "KILL_OFFER", id: reds[i].id });
          localRuntime[reds[i].id].alive = false;
          await abortableSleep(timings.eliminateRedStagger);
        }
        await abortableSleep(timings.eliminateRedFall + timings.eliminateRedHold);

        dispatch({ type: "SET_PHASE", phase: "eliminating_norm" });
        const norms = collected.filter((o) => o.tier === "normal");
        for (let i = 0; i < norms.length; i++) {
          if (signal.aborted) break;
          dispatch({ type: "KILL_OFFER", id: norms[i].id });
          localRuntime[norms[i].id].alive = false;
          await abortableSleep(timings.eliminateNormStagger);
        }
        await abortableSleep(timings.eliminateNormFall + timings.eliminateNormHold);

        if (signal.aborted) {
          for (const o of collected) {
            if (o.tier === "red" || o.tier === "normal") {
              localRuntime[o.id] = { ...localRuntime[o.id], alive: false };
            }
          }
          dispatch({ type: "FINALIZE_RUNTIME", runtime: localRuntime });
        }
      }

      const survivors = collected.filter(
        (o) => o.tier === "green" || o.tier === "gold",
      );
      const ranking = rankOffers(survivors, localRuntime);
      dispatch({ type: "START_AGENT_PICK", ranking });
      dispatch({ type: "SET_PHASE", phase: "agent_pick" });
    } finally {
      runningRef.current = false;
      skipControllerRef.current = null;
    }
  }, []);

  const skipToPicker = useCallback(() => {
    skipControllerRef.current?.abort();
  }, []);

  const acceptAgentPick = useCallback(() => {
    dispatch({ type: "ACCEPT_PICK" });
  }, []);

  const rejectAgentPick = useCallback(() => {
    dispatch({ type: "REJECT_PICK" });
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
    skipToPicker,
    acceptAgentPick,
    rejectAgentPick,
    startBooking,
    closeBooking,
    confirmBooking,
    reset,
  };
}

export type FlowEngine = ReturnType<typeof useFlowEngine>;
