import type { OfferTier } from '@callmyagent/lib/types';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';

interface CardTierBadgeProps {
  /** Target score the badge ticks toward (0–100). */
  score: number;
  tier: OfferTier;
  className?: string;
}

/**
 * Animated tier badge overlaid on a revealed offer card (spec §13).
 *
 * The score digit ticks from 0 → target via `useMotionValue` + `useSpring` +
 * `useTransform → Math.round(v).toString()` rendered through `<motion.span>`,
 * so the React tree never re-renders while the digit climbs (ANIMATION §5.5
 * — zero React renders during ticking). `tabular-nums` is mandatory or the
 * digit jitters horizontally as widths change between glyphs.
 *
 * Tier color comes from CSS custom props (one per OKLCH-balanced tier) so a
 * future palette tweak doesn't have to touch this file.
 */
export function CardTierBadge({
  score,
  tier,
  className,
}: CardTierBadgeProps) {
  // useMotionValue is rendered through useSpring → useTransform; React never
  // re-renders during the climb. Resetting to 0 on mount means each reveal
  // animates the tick from scratch even when the badge is portalled back in.
  const raw = useMotionValue(0);
  const spring = useSpring(raw, { damping: 20, mass: 0.5, stiffness: 100 });
  const display = useTransform(spring, (v) => Math.round(v).toString());

  useEffect(() => {
    raw.set(score);
  }, [raw, score]);

  return (
    <div
      data-tier={tier}
      className={cn(
        'absolute right-2 bottom-2 z-card',
        'flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'bg-card-bg/95 backdrop-blur shadow-sm',
        'border',
        tierBorderClass[tier],
        'font-mono text-[11px] font-semibold',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('h-1.5 w-1.5 rounded-full', tierDotClass[tier])}
      />
      <motion.span className="tabular-nums">{display}</motion.span>
    </div>
  );
}

const tierBorderClass: Record<OfferTier, string> = {
  red: 'border-tier-red/60 text-tier-red',
  neutral: 'border-tier-neutral/60 text-text-mute',
  green: 'border-tier-green/60 text-tier-green',
  gold: 'border-tier-gold/70 text-tier-gold',
};

const tierDotClass: Record<OfferTier, string> = {
  red: 'bg-tier-red',
  neutral: 'bg-tier-neutral',
  green: 'bg-tier-green',
  gold: 'bg-tier-gold',
};
