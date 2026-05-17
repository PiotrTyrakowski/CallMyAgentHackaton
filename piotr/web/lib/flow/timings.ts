export const timings = {
  researchTotal: 3000,
  researchPerCardStagger: 180,

  cardsLanded: 700,

  callRingMs: 900,
  callNegotiateMs: 1100,
  callPerCardOffset: 650,

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
