"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Card, RunUiState, TranscriptLine } from "../types";

// Hit the FastAPI server directly. Next.js dev rewrites buffer SSE which breaks
// the event stream (cards never appear). CORS is wide-open on the backend.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

const initialState: RunUiState = {
  runId: null,
  phase: "idle",
  parsed: null,
  cards: {},
  tournamentLineup: [],
  pair: null,
  winnerId: null,
  bookingSteps: [],
  error: null,
};

type Action =
  | { type: "RESET" }
  | { type: "SET_RUN"; runId: string }
  | { type: "EVENT"; event: { type: string; data: any } };

function emptyCard(d: any): Card {
  return {
    card_id: d.card_id,
    source: d.source,
    title: d.title,
    photo_url: d.photo_url,
    original_price: d.price,
    final_price: d.price,
    dates: d.dates,
    capacity: d.capacity,
    owner_phone: d.owner_phone,
    owner_name: d.owner_name,
    grid_cell: d.grid_cell,
    call_started: false,
    call_finished: false,
    accepted: false,
    discount_pct: 0,
    summary: "",
    transcript: [],
    passed: null,
    reject_reason: "",
  };
}

function reducer(state: RunUiState, action: Action): RunUiState {
  switch (action.type) {
    case "RESET":
      return initialState;
    case "SET_RUN":
      return { ...initialState, runId: action.runId, phase: "spawning" };
    case "EVENT": {
      const { type, data } = action.event;
      switch (type) {
        case "phase":
          return { ...state, phase: data.phase, error: data.detail ?? state.error };
        case "query_parsed":
          return { ...state, parsed: data };
        case "card_spawned":
          return { ...state, cards: { ...state.cards, [data.card_id]: emptyCard(data) } };
        case "call_started": {
          const c = state.cards[data.card_id];
          if (!c) return state;
          return { ...state, cards: { ...state.cards, [data.card_id]: { ...c, call_started: true } } };
        }
        case "call_transcript": {
          const c = state.cards[data.card_id];
          if (!c) return state;
          const line: TranscriptLine = { role: data.role, text: data.text };
          return {
            ...state,
            cards: {
              ...state.cards,
              [data.card_id]: { ...c, transcript: [...c.transcript, line] },
            },
          };
        }
        case "call_finished": {
          const c = state.cards[data.card_id];
          if (!c) return state;
          return {
            ...state,
            cards: {
              ...state.cards,
              [data.card_id]: {
                ...c,
                call_finished: true,
                accepted: data.accepted,
                final_price: data.final_price,
                discount_pct: data.discount_pct,
                summary: data.summary,
              },
            },
          };
        }
        case "card_filtered": {
          const c = state.cards[data.card_id];
          if (!c) return state;
          return {
            ...state,
            cards: {
              ...state.cards,
              [data.card_id]: { ...c, passed: data.passed, reject_reason: data.reason },
            },
          };
        }
        case "tournament_lineup":
          return { ...state, tournamentLineup: data.card_ids };
        case "tournament_pair":
          return { ...state, pair: data };
        case "tournament_advance":
          return state;
        case "tournament_winner":
          return { ...state, winnerId: data.card_id, pair: null };
        case "booking_step":
          return { ...state, bookingSteps: [...state.bookingSteps, data] };
        default:
          return state;
      }
    }
  }
}

export function useRunStream() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const esRef = useRef<EventSource | null>(null);

  const start = useCallback(async (query: string, fresh = false) => {
    dispatch({ type: "RESET" });
    const r = await fetch(`${API_BASE}/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, fresh }),
    });
    const { run_id } = await r.json();
    dispatch({ type: "SET_RUN", runId: run_id });
  }, []);

  const pick = useCallback(
    async (winnerId: string) => {
      if (!state.runId) return;
      await fetch(`${API_BASE}/run/${state.runId}/pick`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ winner_id: winnerId }),
      });
    },
    [state.runId],
  );

  const book = useCallback(async () => {
    if (!state.runId) return;
    await fetch(`${API_BASE}/run/${state.runId}/book`, { method: "POST" });
  }, [state.runId]);

  useEffect(() => {
    if (!state.runId) return;
    const es = new EventSource(`${API_BASE}/run/${state.runId}/events`);
    esRef.current = es;
    const types = [
      "phase",
      "query_parsed",
      "card_spawned",
      "call_started",
      "call_transcript",
      "call_finished",
      "card_filtered",
      "tournament_lineup",
      "tournament_pair",
      "tournament_advance",
      "tournament_winner",
      "booking_step",
    ];
    const handlers: Record<string, (e: MessageEvent) => void> = {};
    for (const t of types) {
      const h = (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          dispatch({ type: "EVENT", event: parsed });
        } catch {}
      };
      handlers[t] = h;
      es.addEventListener(t, h as EventListener);
    }
    return () => {
      for (const t of types) es.removeEventListener(t, handlers[t] as EventListener);
      es.close();
    };
  }, [state.runId]);

  const reset = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    dispatch({ type: "RESET" });
  }, []);

  return { state, start, pick, book, reset };
}
