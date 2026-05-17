export const timings = {
  researchTotal: 3000,
  researchPerCardStagger: 180,

  cardsLanded: 700,

  // Answered calls: total ~15s = short ring + long negotiation with price ticks
  callAnsweredRingMs: 1800,
  callAnsweredNegotiateMs: 13000,
  callAnsweredPriceSteps: 5,

  // Unanswered calls ring for a random duration in this range, then fail
  callNoAnswerMinMs: 2000,
  callNoAnswerMaxMs: 9000,

  tieringApply: 1000,
  tieringHold: 600,

  eliminateRedStagger: 130,
  eliminateRedFall: 800,
  eliminateRedHold: 500,

  eliminateNormStagger: 130,
  eliminateNormFall: 800,
  eliminateNormHold: 700,

  battleEnterMs: 500,
  battleExitMs: 600,

  winnerEnterMs: 700,

  bookingCallMs: 2200,
} as const;

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
