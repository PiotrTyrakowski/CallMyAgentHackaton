export interface RunEntry {
  runId: string;
  query: string;
  winnerId: string;
  confirmationCode: string;
  /** ISO 8601 timestamp. */
  finishedAt: string;
}
