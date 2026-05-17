// AbortSignal composition helpers. Use these instead of hand-rolled
// `setTimeout` + AbortController dances. See spec §11.

export function composeSignals(
  ...signals: (AbortSignal | undefined)[]
): AbortSignal {
  return AbortSignal.any(
    signals.filter((s): s is AbortSignal => Boolean(s))
  );
}

export function withTimeout(signal: AbortSignal, ms: number): AbortSignal {
  return AbortSignal.any([signal, AbortSignal.timeout(ms)]);
}
