// Memory factory. Picks Supermemory when SUPERMEMORY_API_KEY is set, falls
// back to the process-local in-memory adapter otherwise.
//
// The fallback lets the app boot in environments without third-party
// credentials configured (local development, tests, isolated CI).

import type { MemoryAdapter } from "./types";
import { InMemoryAdapter } from "./inMemory";
import { SupermemoryAdapter } from "./supermemoryAdapter";

let cached: MemoryAdapter | null = null;

export function getMemory(): MemoryAdapter {
  if (cached) return cached;
  const key = process.env.SUPERMEMORY_API_KEY;
  if (key) {
    console.log("[memory] using Supermemory adapter");
    cached = new SupermemoryAdapter(key);
  } else {
    console.log(
      "[memory] SUPERMEMORY_API_KEY not set — using in-process fallback",
    );
    cached = new InMemoryAdapter();
  }
  return cached;
}

export type {
  CallContext,
  GeoFact,
  GeoLevel,
  MemoryAdapter,
  ParsedHints,
  Signal,
  UserContext,
  UseCase,
} from "./types";
