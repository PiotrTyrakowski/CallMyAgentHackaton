import type { Variants } from 'motion/react';

// Single Variants object keyed by FSM-derived card phase (spec §10). Adding a
// tier or call status = one entry, no `useEffect` choreography.
export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
    filter: 'blur(8px)',
  },
  idle: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  dialing: {
    x: [0, -2, 2, -2, 2, 0],
    rotate: [0, -1, 1, -1, 1, 0],
    transition: { repeat: Infinity, duration: 0.4 },
  },
  on_call: {
    x: [0, -1, 1, -1, 1, 0],
    rotate: [0, -0.5, 0.5, -0.5, 0.5, 0],
    transition: { repeat: Infinity, duration: 0.8 },
  },
  negotiating: {
    x: [0, -1, 1, -1, 1, 0],
    rotate: [0, -0.5, 0.5, -0.5, 0.5, 0],
    transition: { repeat: Infinity, duration: 1.2 },
  },
  red: {
    borderColor: 'var(--color-tier-red)',
    scale: 1,
  },
  neutral: {
    borderColor: 'var(--color-tier-neutral)',
    scale: 1,
  },
  green: {
    borderColor: 'var(--color-tier-green)',
    scale: 1,
  },
  gold: {
    borderColor: 'var(--color-tier-gold)',
    boxShadow: '0 0 32px var(--color-tier-gold)',
    scale: 1,
  },
  exit_dissolve: {
    opacity: 0,
    scale: 0.7,
    filter: 'blur(8px) saturate(0) hue-rotate(60deg)',
    transition: { duration: 0.6, ease: 'easeIn' },
  },
};
