import { motion } from 'motion/react';

/**
 * Empty masonry slot rendered until a real `<OfferCard>` arrives. Same outer
 * dimensions as a card so the grid never reflows when a slot is replaced.
 *
 * The pulsing "o" is intentionally restrained — at 40 simultaneous slots the
 * canvas already carries a lot of motion; loud per-slot animation reads as
 * noise. Opacity-only loop composites cheaply (no layout thrash).
 */
export function PlaceholderSlot() {
  return (
    <div
      aria-hidden="true"
      className="gpu rounded-2xl border border-card-border/40 bg-card-bg/40 flex items-center justify-center aspect-[3/4]"
    >
      <motion.span
        className="font-mono text-2xl text-text-mute/50 select-none"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        o
      </motion.span>
    </div>
  );
}
