import { z } from 'zod';
import {
  BackendError,
  NetworkError,
  ValidationError,
} from '@callmyagent/lib/errors';
import type { OfferId } from '@callmyagent/lib/ids';
import {
  bookResponseSchema,
  searchResponseSchema,
  scoringResponseSchema,
  type BookResponse,
  type ScoringRequest,
  type ScoringResponse,
  type SearchResponse,
} from './schemas';

interface RequestOptions<T> {
  schema: z.ZodType<T>;
  signal?: AbortSignal | undefined;
}

/**
 * Typed fetch wrapper. Single chokepoint for converting network failures,
 * HTTP errors, and schema mismatches into the lib's AppError hierarchy.
 *
 * - AbortError propagates as-is (callers / TanStack Query unwrap it).
 * - Other fetch failures become NetworkError.
 * - Non-2xx responses become BackendError.
 * - Schema mismatches become ValidationError, surfaced via the
 *   PhaseErrorBoundary on the way up.
 */
export async function request<T>(
  input: string,
  init: RequestInit,
  opts: RequestOptions<T>
): Promise<T> {
  let res: Response;
  try {
    // Only attach `signal` when actually provided — `exactOptionalPropertyTypes`
    // forbids passing `undefined` where the DOM type expects `AbortSignal | null`.
    const finalInit: RequestInit = opts.signal
      ? { ...init, signal: opts.signal }
      : { ...init };
    res = await fetch(input, finalInit);
  } catch (err) {
    // AbortError is expected — TanStack Query / consumer code decides
    // whether to silently bail (the canonical case) or surface a toast.
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new NetworkError(`Network failure calling ${input}`, { cause: err });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new BackendError(
      `HTTP ${res.status} from ${input}: ${body.slice(0, 200)}`,
      res.status
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    throw new BackendError(`Invalid JSON from ${input}`, res.status, {
      cause: err,
    });
  }

  const parsed = opts.schema.safeParse(json);
  if (!parsed.success) {
    // Zod 4: use z.flattenError (the v3 .flatten() method was removed).
    const flat = z.flattenError(parsed.error);
    throw new ValidationError(`Schema mismatch at ${input}`, flat.fieldErrors, {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

// ---------- Endpoint callers ----------

interface CallOptions {
  signal?: AbortSignal | undefined;
}

export function apiSearch(
  q: string,
  opts: CallOptions = {}
): Promise<SearchResponse> {
  const url = `/api/search?q=${encodeURIComponent(q)}`;
  return request(
    url,
    { method: 'GET' },
    { schema: searchResponseSchema, signal: opts.signal }
  );
}

export function apiScoring(
  payload: ScoringRequest,
  opts: CallOptions = {}
): Promise<ScoringResponse> {
  return request(
    '/api/scoring',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    { schema: scoringResponseSchema, signal: opts.signal }
  );
}

export function apiBook(
  offerIdValue: OfferId,
  opts: CallOptions = {}
): Promise<BookResponse> {
  return request(
    '/api/book',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId: offerIdValue }),
    },
    { schema: bookResponseSchema, signal: opts.signal }
  );
}
