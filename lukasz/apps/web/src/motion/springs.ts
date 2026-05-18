export const springs = {
  snap: { type: 'spring' as const, stiffness: 400, damping: 28 },
  soft: { type: 'spring' as const, stiffness: 200, damping: 24 },
  bouncy: { type: 'spring' as const, stiffness: 300, damping: 18 },
} satisfies Record<
  string,
  { type: 'spring'; stiffness: number; damping: number }
>;
