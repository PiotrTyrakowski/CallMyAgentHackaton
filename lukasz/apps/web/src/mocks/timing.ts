/**
 * Tiny timing helpers shared by the MSW handlers.
 *
 * Kept in one file so handler code reads like a script ("sleep, emit, sleep")
 * instead of being littered with `new Promise(r => setTimeout(r, ms))`.
 */

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Random float in `[min, max)`. Use for animation jitter. */
export const jitter = (min: number, max: number): number =>
  min + Math.random() * (max - min);

/** Random integer in `[min, max]` (inclusive). */
export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;
