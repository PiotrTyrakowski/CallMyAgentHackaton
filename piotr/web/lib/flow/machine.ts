"use client";

import { useCallback, useReducer, useRef } from "react";
import type { Offer, OfferRuntimeState, Phase } from "../types";
import type { BookingAuthorization } from "../providers";
import { callProvider, offerProvider } from "../providers";
import { sleep, timings } from "./timings";
import {
  fetchCallContext,
  ingestCallOutcome,
  recordSignal,
  startSession,
} from "@/app/actions/memory";
import {
  placeBookingHold,
  releaseBookingHold,
} from "@/app/actions/booking";
import type { CallContext, UserContext } from "../memory";
import { getUserId } from "../memory/userId";

export type BookingStatus =
  | "idle"
  | "authorizing"
  | "authorized"
  | "releasing"
  | "error";

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
  sessionId: string | null;
  userContext: UserContext | null;
  bookingAuth: BookingAuthorization | null;
  bookingStatus: BookingStatus;
  bookingError: string | null;
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
  | { type: "SET_SESSION"; sessionId: string; userContext: UserContext }
  | { type: "BOOKING_STATUS"; status: BookingStatus }
  | { type: "BOOKING_AUTH"; auth: BookingAuthorization }
  | { type: "BOOKING_ERROR"; message: string }
  | { type: "BOOKING_CLEAR" };

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
  sessionId: null,
  userContext: null,
  bookingAuth: null,
  bookingStatus: "idle",
  bookingError: null,
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
    case "SET_SESSION":
      return { ...s, sessionId: a.sessionId, userContext: a.userContext };
    case "BOOKING_STATUS":
      return { ...s, bookingStatus: a.status, bookingError: null };
    case "BOOKING_AUTH":
      return {
        ...s,
        bookingAuth: a.auth,
        bookingStatus: "authorized",
        bookingError: null,
      };
    case "BOOKING_ERROR":
      return {
        ...s,
        bookingStatus: "error",
        bookingError: a.message,
      };
    case "BOOKING_CLEAR":
      return {
        ...s,
        bookingAuth: null,
        bookingStatus: "idle",
        bookingError: null,
      };
    default:
      return s;
  }
};

const DEFAULT_STAY_NIGHTS = 3;

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

// Adjusts the structural score by the user's distilled preferences. Hits the
// user context once (already fetched at session start) — no extra round-trips.
// The match is intentionally loose (substring) so freeform Supermemory hints
// like "tends to accept luxury units in Marina" still bias the ranking.
function contextBoost(offer: Offer, ctx: UserContext | null): number {
  if (!ctx) return 0;
  const haystack = [
    ...ctx.staticPreferences,
    ...ctx.dynamicPreferences,
    ...ctx.useCaseHints,
  ]
    .join(" ")
    .toLowerCase();
  if (!haystack) return 0;
  let boost = 0;
  const neighborhood = offer.neighborhood.toLowerCase();
  if (haystack.includes(neighborhood)) {
    boost += haystack.includes(`avoids ${neighborhood}`) ? -120 : 60;
  }
  for (const amenity of offer.amenities) {
    if (haystack.includes(amenity.toLowerCase())) boost += 20;
  }
  if (ctx.parsedHints.budgetMaxPerNight) {
    if (offer.originalPrice <= ctx.parsedHints.budgetMaxPerNight) boost += 40;
    else boost -= 30;
  }
  if (ctx.useCase === "luxury" && offer.tier === "gold") boost += 40;
  if (ctx.useCase === "cheap_stay" && offer.originalPrice < 350) boost += 30;
  return boost;
}

export function rankOffers(
  offers: Offer[],
  runtime: Record<string, OfferRuntimeState>,
  ctx?: UserContext | null,
): Offer[] {
  return [...offers].sort(
    (a, b) =>
      scoreOffer(b, runtime[b.id]) +
      contextBoost(b, ctx ?? null) -
      (scoreOffer(a, runtime[a.id]) + contextBoost(a, ctx ?? null)),
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

      const userId = getUserId();
      const sessionId = `s_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      let userContext: UserContext | null = null;
      try {
        const session = await startSession(userId, sessionId, query);
        userContext = session.context;
        dispatch({
          type: "SET_SESSION",
          sessionId,
          userContext: session.context,
        });
      } catch (err) {
        console.warn("[memory] startSession failed, continuing without:", err);
      }

      const collected: Offer[] = [];
      for await (const offer of offerProvider.search(query)) {
        collected.push(offer);
        dispatch({ type: "ADD_OFFER", offer });
      }
      // Note: offer_surfaced signals are intentionally not written — the
      // accept/reject/book signals carry the user's actual judgment, so
      // writing every surfaced card would only dilute the profile with noise.

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
      const useCase = userContext?.useCase ?? "default";
      const callTasks = collected.map(async (offer) => {
        // Pull the per-offer context (user prefs + geo facts up the chain)
        // before placing the call so the negotiation prompt is augmented.
        let ctx: CallContext | undefined;
        if (userContext) {
          try {
            ctx = await fetchCallContext(userId, offer, useCase);
          } catch (err) {
            console.warn("[memory] fetchCallContext failed:", err);
          }
        }
        let transcriptBuf = "";
        for await (const ev of callProvider.call(offer, ctx)) {
          if (signal.aborted) return;
          if (ev.message) transcriptBuf += ev.message + " ";
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
        // Fire-and-forget: after a call settles, ingest the outcome so the
        // geo-fact corpus grows AND the user profile sees the negotiation result.
        const cur = localRuntime[offer.id];
        const answered = cur.callStatus === "done";
        void ingestCallOutcome({
          userId,
          sessionId,
          offer,
          transcript: transcriptBuf.trim(),
          answered,
          finalPrice: cur.currentPrice,
          negotiatedDiscount: cur.negotiatedDiscount,
        });
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
      const ranking = rankOffers(survivors, localRuntime, userContext);
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
    const winner = state.agentRanking[state.agentIndex];
    if (winner && state.sessionId) {
      const rt = state.runtime[winner.id];
      void recordSignal(getUserId(), state.sessionId, {
        kind: "offer_accepted",
        offer: winner,
        finalPrice: rt?.currentPrice,
        negotiatedDiscount: rt?.negotiatedDiscount,
      });
    }
    dispatch({ type: "ACCEPT_PICK" });
  }, [state.agentRanking, state.agentIndex, state.sessionId, state.runtime]);

  const rejectAgentPick = useCallback(() => {
    const rejected = state.agentRanking[state.agentIndex];
    if (rejected && state.sessionId) {
      void recordSignal(getUserId(), state.sessionId, {
        kind: "offer_rejected",
        offer: rejected,
      });
    }
    dispatch({ type: "REJECT_PICK" });
  }, [state.agentRanking, state.agentIndex, state.sessionId]);

  const startBooking = useCallback(() => {
    dispatch({ type: "SET_PHASE", phase: "booking" });
  }, []);

  const closeBooking = useCallback(() => {
    dispatch({ type: "SET_PHASE", phase: "winner" });
  }, []);

  const confirmBooking = useCallback(async () => {
    if (!state.champion || !state.sessionId) return;
    const rt = state.runtime[state.champion.id];
    const pricePerNight = rt?.currentPrice ?? state.champion.originalPrice;
    const nights =
      state.userContext?.parsedHints.nights ?? DEFAULT_STAY_NIGHTS;

    dispatch({ type: "BOOKING_STATUS", status: "authorizing" });
    try {
      const auth = await placeBookingHold({
        userId: getUserId(),
        sessionId: state.sessionId,
        offer: state.champion,
        pricePerNight,
        nights,
      });
      dispatch({ type: "BOOKING_AUTH", auth });
      dispatch({ type: "SET_PHASE", phase: "booked" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authorization failed.";
      dispatch({ type: "BOOKING_ERROR", message });
    }
  }, [
    state.champion,
    state.sessionId,
    state.runtime,
    state.userContext,
  ]);

  const releaseBooking = useCallback(async () => {
    if (!state.bookingAuth) {
      dispatch({ type: "BOOKING_CLEAR" });
      dispatch({ type: "SET_PHASE", phase: "winner" });
      return;
    }
    dispatch({ type: "BOOKING_STATUS", status: "releasing" });
    try {
      await releaseBookingHold(state.bookingAuth);
    } catch (err) {
      console.warn("[booking] release failed:", err);
    }
    dispatch({ type: "BOOKING_CLEAR" });
    dispatch({ type: "SET_PHASE", phase: "winner" });
  }, [state.bookingAuth]);

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
    releaseBooking,
    reset,
  };
}

export type FlowEngine = ReturnType<typeof useFlowEngine>;
