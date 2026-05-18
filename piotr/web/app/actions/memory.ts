"use server";

// Server actions exposed to the client flow machine. The Supermemory SDK and
// its API key never cross the network — these run server-side, only the
// distilled context strings cross back to the browser.

import { getMemory } from "@/lib/memory";
import type {
  CallContext,
  ParsedHints,
  Signal,
  UserContext,
  UseCase,
} from "@/lib/memory";
import { classifyUseCase, parseQueryHints } from "@/lib/memory/useCases";
import type { Offer } from "@/lib/types";

// Recorded at the top of every session. Returns the inferred use case + the
// user context the flow machine will use to bias scoring.
export async function startSession(
  userId: string,
  sessionId: string,
  query: string,
): Promise<{
  useCase: UseCase;
  parsedHints: ParsedHints;
  context: UserContext;
}> {
  const memory = getMemory();
  const useCase = classifyUseCase(query);
  const parsedHints = parseQueryHints(query);

  await memory.recordSignal(userId, sessionId, {
    kind: "query_submitted",
    query,
    useCase,
    parsedHints,
  });

  const context = await memory.getUserContext(
    userId,
    sessionId,
    useCase,
    parsedHints,
  );
  return { useCase, parsedHints, context };
}

// Called right before each agent call. Returns the per-offer context the
// negotiation prompt will be augmented with.
export async function fetchCallContext(
  userId: string,
  offer: Offer,
  useCase: UseCase,
): Promise<CallContext> {
  return getMemory().getCallContext(userId, offer, useCase);
}

// Generic single-signal recorder for swipes / surfaces / bookings.
export async function recordSignal(
  userId: string,
  sessionId: string,
  signal: Signal,
): Promise<void> {
  await getMemory().recordSignal(userId, sessionId, signal);
}

// Called once a call ends. Drives both the user profile update AND geo-fact
// accretion in one round-trip.
export async function ingestCallOutcome(args: {
  userId: string;
  sessionId: string;
  offer: Offer;
  transcript: string;
  answered: boolean;
  finalPrice: number;
  negotiatedDiscount: number;
}): Promise<void> {
  await getMemory().ingestCallTranscript(args);
}
