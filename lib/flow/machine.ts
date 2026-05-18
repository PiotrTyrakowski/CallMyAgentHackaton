"use client";

import { useCallback, useReducer, useRef } from "react";
import type { Offer, OfferRuntimeState, Phase } from "../types";
import {
  callProvider,
  offerProvider,
  paymentsProvider,
  type BookingResult,
} from "../providers";
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
  bookingResult: BookingResult | null;
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
  | { type: "ACCEPT_PICK" }
  | { type: "SET_BOOKING_RESULT"; result: BookingResult };

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
  bookingResult: null,
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
    case "SET_BOOKING_RESULT":
      return { ...s, bookingResult: a.result };
    default:
      return s;
  }
};

// Tier is the floor, negotiation is the multiplier. 200pt gap between
// adjacent tiers + discount weight 15 means ~$13/night of agent-won savings
// is worth one tier crossing — a strongly-negotiated green can outrank a
// sleepy gold. Before this rebalance, tier dominated so hard the call
// outcome never moved the ranking and the "agent's pick" felt pre-baked.
const TIER_WEIGHT: Record<Offer["tier"], number> = {
  gold: 1000,
  green: 800,
  normal: 600,
  red: 250,
};

export function scoreOffer(offer: Offer, rt: OfferRuntimeState): number {
  const base = TIER_WEIGHT[offer.tier];
  const discountScore = rt.negotiatedDiscount * 15;
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
  const stateRef = useRef(state);
  stateRef.current = state;

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
    // Charge the negotiated total via Sponge (real) or mock — the API route
    // picks based on whether SPONGE_API_KEY is set on the server. The result
    // carries the issued virtual-card last4, which the UI surfaces on the
    // "Booked!" screen so the safety story closes visually.
    const champion = stateRef.current.champion;
    const runtime = champion ? stateRef.current.runtime[champion.id] : null;
    const nightly = runtime?.currentPrice ?? champion?.originalPrice ?? 0;
    const total = nightly * 3;
    if (champion) {
      try {
        const result = await paymentsProvider.checkout({
          offerId: champion.id,
          amount: total,
          merchantName: champion.source,
          merchantUrl: `https://${champion.source.toLowerCase().replace(/\.com$/, "")}.com`,
          description: `${champion.title} · 3 nights`,
        });
        dispatch({ type: "SET_BOOKING_RESULT", result });
      } catch (e) {
        console.error("[book] payment failed", e);
      }
    }
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
