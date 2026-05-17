export type Phase =
  | "idle"
  | "spawning"
  | "calling"
  | "filtering"
  | "tournament"
  | "booking"
  | "done"
  | "error";

export type TranscriptLine = { role: "agent" | "owner"; text: string };

export type Card = {
  card_id: string;
  source: string;
  title: string;
  photo_url: string;
  original_price: number;
  final_price: number;
  dates: string;
  capacity: number;
  owner_phone: string;
  owner_name?: string;
  grid_cell: number;
  call_started: boolean;
  call_finished: boolean;
  accepted: boolean;
  discount_pct: number;
  summary: string;
  transcript: TranscriptLine[];
  passed: boolean | null;
  reject_reason: string;
};

export type TournamentPair = {
  round: number;
  left_id: string;
  right_id: string;
  remaining: number;
};

export type BookingStep = {
  step: "charging" | "charged" | "calling_owner" | "confirmed";
  detail: string;
};

export type RunUiState = {
  runId: string | null;
  phase: Phase;
  parsed: Record<string, any> | null;
  cards: Record<string, Card>;
  tournamentLineup: string[];
  pair: TournamentPair | null;
  winnerId: string | null;
  bookingSteps: BookingStep[];
  error: string | null;
};
