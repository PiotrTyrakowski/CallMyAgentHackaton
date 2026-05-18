import type { Offer, TranscriptChunk } from "@/lib/types";

export type SearchEvent =
  | { kind: "session"; sessionId: string; liveUrl?: string }
  | { kind: "status"; status: string; elapsedSeconds?: number; costUsd?: number }
  | { kind: "action"; message: string }
  | { kind: "offer"; offer: Offer }
  | { kind: "done" }
  | { kind: "error"; message: string };

export interface BrowserUseProvider {
  searchOffers(query: string): AsyncIterable<SearchEvent>;
}

export type CallChunk =
  | { type: "transcript"; chunk: TranscriptChunk }
  | { type: "discount"; percent: number }
  | { type: "status"; status: "ringing" | "negotiating" | "done" | "failed" };

export interface AgentPhoneProvider {
  call(offer: Offer, task: string): AsyncIterable<CallChunk>;
}

export interface MossProvider {
  store(key: string, data: unknown): Promise<void>;
  query(q: string): Promise<unknown[]>;
}

export interface PaymentsProvider {
  checkout(offerId: string, amount: number): Promise<{ txId: string }>;
}
