"use client";
import { create } from "zustand";
import type { Offer, Phase, TranscriptChunk } from "./types";

interface State {
  phase: Phase;
  query: string;
  budget: number;
  offers: Offer[];
  callingIndex: number;
  pvpQueue: string[];
  pvpChampion: string | null;
  winnerId: string | null;
  bookingTxId: string | null;

  setPhase: (p: Phase) => void;
  setQuery: (q: string, budget: number) => void;
  addOffer: (o: Offer) => void;
  resetOffers: () => void;
  setOffers: (o: Offer[]) => void;
  updateOffer: (id: string, patch: Partial<Offer>) => void;
  appendTranscript: (id: string, chunk: TranscriptChunk) => void;
  setCallingIndex: (i: number) => void;
  setPvpQueue: (q: string[]) => void;
  setPvpChampion: (id: string | null) => void;
  setWinner: (id: string) => void;
  setBookingTx: (tx: string) => void;
  reset: () => void;
}

export const useStore = create<State>((set) => ({
  phase: "idle",
  query: "",
  budget: 400,
  offers: [],
  callingIndex: -1,
  pvpQueue: [],
  pvpChampion: null,
  winnerId: null,
  bookingTxId: null,

  setPhase: (phase) => set({ phase }),
  setQuery: (query, budget) => set({ query, budget }),
  addOffer: (o) => set((s) => ({ offers: [...s.offers, o] })),
  resetOffers: () => set({ offers: [] }),
  setOffers: (offers) => set({ offers }),
  updateOffer: (id, patch) =>
    set((s) => ({
      offers: s.offers.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    })),
  appendTranscript: (id, chunk) =>
    set((s) => ({
      offers: s.offers.map((o) =>
        o.id === id ? { ...o, transcript: [...o.transcript, chunk] } : o,
      ),
    })),
  setCallingIndex: (callingIndex) => set({ callingIndex }),
  setPvpQueue: (pvpQueue) => set({ pvpQueue }),
  setPvpChampion: (pvpChampion) => set({ pvpChampion }),
  setWinner: (winnerId) => set({ winnerId }),
  setBookingTx: (bookingTxId) => set({ bookingTxId }),
  reset: () =>
    set({
      phase: "idle",
      query: "",
      budget: 400,
      offers: [],
      callingIndex: -1,
      pvpQueue: [],
      pvpChampion: null,
      winnerId: null,
      bookingTxId: null,
    }),
}));
