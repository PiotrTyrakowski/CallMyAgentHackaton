import { motion } from 'motion/react';
import { cn } from '@/lib/cn';

interface CardBubbleProps {
  text: string;
  className?: string;
}

/**
 * One speech bubble in the call face's transcript stream (spec §13).
 *
 * Pop-in: scale + tiny rotation so the entry reads as "spoken" rather than
 * tooltip-mechanical. Exit fades and lifts up — the bubble drifts off as
 * newer ones push in below. Bubbles older than the visible window are
 * unmounted by the parent's AnimatePresence; this component is purely visual.
 */
export function CardBubble({ text, className }: CardBubbleProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.6, rotate: -4, y: 8 }}
      animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className={cn(
        'inline-block max-w-[90%] rounded-2xl rounded-bl-md',
        'bg-canvas-bg/95 px-3 py-1.5 text-xs leading-snug shadow-sm',
        'border border-card-border/70',
        className,
      )}
    >
      {text}
    </motion.div>
  );
}
