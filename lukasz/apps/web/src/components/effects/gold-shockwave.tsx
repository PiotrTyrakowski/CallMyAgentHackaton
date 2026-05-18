import { motion } from 'motion/react';
import { cn } from '@/lib/cn';

interface GoldShockwaveProps {
  /** Pixel coordinates of every shockwave origin, relative to the viewport. */
  origins: ReadonlyArray<{ x: number; y: number }>;
  className?: string;
}

/**
 * The cinematic gold-card moment (spec §13). A radial SVG ring expands from
 * each provided origin while ~10 sparkle particles flare out in a randomised
 * starburst. Motion-only — no GSAP — per the spec.
 *
 * Mounted as a fixed-positioned overlay (pointer-events: none) so it doesn't
 * intercept clicks and never reflows the canvas. The parent (RoyaleOrchestrator)
 * controls lifetime: ~1.2 s total, then unmount; the unmount itself doesn't
 * need an exit animation because the parent flips straight to PvP and the
 * canvas vanishes.
 */
export function GoldShockwave({ origins, className }: GoldShockwaveProps) {
  return (
    <div
      aria-hidden="true"
      data-fx="gold-shockwave"
      className={cn(
        'pointer-events-none fixed inset-0 z-modal overflow-hidden',
        className,
      )}
    >
      {origins.map((origin, i) => (
        <ShockwaveCenter key={`sw-${i}-${origin.x}-${origin.y}`} {...origin} />
      ))}
    </div>
  );
}

const SPARKLE_COUNT = 10;
const WAVE_DURATION = 1.2;

function ShockwaveCenter({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="absolute"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
    >
      <RadialWave />
      <RadialWave delay={0.18} />
      <Sparkles count={SPARKLE_COUNT} />
    </div>
  );
}

function RadialWave({ delay = 0 }: { delay?: number }) {
  return (
    <motion.svg
      width={320}
      height={320}
      viewBox="0 0 320 320"
      className="absolute -translate-x-1/2 -translate-y-1/2"
      initial={{ scale: 0.05, opacity: 0.9 }}
      animate={{ scale: 1.4, opacity: 0 }}
      transition={{ duration: WAVE_DURATION, delay, ease: 'easeOut' }}
    >
      <title>gold shockwave</title>
      <circle
        cx={160}
        cy={160}
        r={150}
        fill="none"
        stroke="var(--color-tier-gold)"
        strokeWidth={4}
      />
      <circle
        cx={160}
        cy={160}
        r={120}
        fill="none"
        stroke="var(--color-tier-gold)"
        strokeOpacity={0.5}
        strokeWidth={2}
      />
    </motion.svg>
  );
}

/**
 * 10 small diamond particles, each launched on a randomised vector. Random
 * params are computed at render once (`useState(() => …)` would over-engineer
 * for a one-shot mount); the parent unmounts the whole tree after ~1.2 s.
 */
function Sparkles({ count }: { count: number }) {
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const distance = 90 + Math.random() * 110;
    return {
      key: `sp-${i}`,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      rotate: Math.random() * 360,
      scale: 0.6 + Math.random() * 0.7,
      delay: 0.05 + Math.random() * 0.2,
    };
  });

  return (
    <>
      {particles.map((p) => (
        <motion.span
          key={p.key}
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-tier-gold shadow-[0_0_10px_var(--color-tier-gold)]"
          style={{ rotate: '45deg' }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{
            x: p.dx,
            y: p.dy,
            opacity: 0,
            scale: p.scale,
            rotate: p.rotate,
          }}
          transition={{
            duration: 0.9,
            delay: p.delay,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
    </>
  );
}
