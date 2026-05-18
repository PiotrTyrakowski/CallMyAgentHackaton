import { CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';

interface EasyBookSuccessProps {
  confirmationCode: string;
}

/**
 * The "you're booked!" confirmation badge that mounts once the store flips
 * to `booked`. The confetti burst itself is fired imperatively from
 * `useBookFlow` on the mutation's `onSuccess` (not here) so the side effect
 * doesn't double-fire on a stray remount. This component is purely visual:
 * a Lucide check icon + a large monospaced confirmation code.
 *
 * Wrapped in a `motion.div` with a zoom-in entrance so the moment the
 * winner card finishes its layout morph into the pane, the badge punches
 * forward — pairs with the confetti burst.
 */
export function EasyBookSuccess({ confirmationCode }: EasyBookSuccessProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex flex-col items-center gap-4 rounded-2xl',
        'border border-tier-gold/40 bg-tier-gold/10 px-8 py-6',
        'text-center shadow-md',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <CheckCircle2
          className="h-8 w-8 text-tier-green"
          aria-hidden="true"
        />
        <span className="font-display text-2xl tracking-tight">
          Booked!
        </span>
      </div>
      <div className="space-y-1">
        <div className="font-mono text-xs uppercase tracking-widest text-text-mute">
          Confirmation code
        </div>
        <div className="font-mono text-3xl font-semibold tabular-nums text-text">
          {confirmationCode}
        </div>
      </div>
    </motion.div>
  );
}
