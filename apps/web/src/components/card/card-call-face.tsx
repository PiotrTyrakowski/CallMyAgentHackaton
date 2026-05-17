import type { OfferId } from '@callmyagent/lib/ids';
import type { CallEvent } from '@callmyagent/lib/types';
import { AnimatePresence, motion } from 'motion/react';
import { Phone, PhoneOff } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { useFlow } from '@/stores/flow/flow-store-provider';
import { CardBubble } from './card-bubble';

interface CardCallFaceProps {
  offerId: OfferId;
  className?: string;
}

const STATUS_LABEL: Record<CallEvent['status'] | 'idle', string> = {
  idle: 'Dialing…',
  dialing: 'Dialing…',
  on_call: 'On call',
  negotiating: 'Negotiating',
  done: 'Done',
  failed: "Couldn't reach",
};

const VISIBLE_BUBBLES = 3;

interface KeyedBubble {
  key: string;
  text: string;
}

function buildBubbleStream(events: CallEvent[] | undefined): KeyedBubble[] {
  if (!events) return [];
  const out: KeyedBubble[] = [];
  events.forEach((ev, idx) => {
    if (ev.status === 'negotiating') {
      out.push({ key: `${idx}:${ev.utterance}`, text: ev.utterance });
    }
  });
  // Only the most recent N are visible — the older ones fade up and out
  // via AnimatePresence as new bubbles push in.
  return out.slice(-VISIBLE_BUBBLES);
}

/**
 * The "flipped" face of an OfferCard (spec §10 / §13). Shown while the call
 * is in flight; the front face reappears once the outcome is recorded.
 *
 * Visuals:
 * - Big phone glyph (or PhoneOff if the call failed).
 * - Status copy that reads like a live caption.
 * - Up to three rolling speech bubbles populated from the SSE stream.
 */
export function CardCallFace({ offerId, className }: CardCallFaceProps) {
  const events = useFlow((s) => s.calls[offerId]);
  const latest = events?.[events.length - 1];
  const status: CallEvent['status'] | 'idle' = latest?.status ?? 'idle';
  const bubbles = useMemo(() => buildBubbleStream(events), [events]);
  const isFailed = status === 'failed';

  return (
    <div
      className={cn(
        'flex h-full flex-col items-center justify-between gap-3 p-4',
        'bg-card-bg',
        className,
      )}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <motion.div
          animate={
            isFailed
              ? { rotate: 0, scale: 1 }
              : { rotate: [0, -12, 12, -8, 8, 0] }
          }
          transition={
            isFailed
              ? { duration: 0 }
              : { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }
          }
          className={cn(
            'rounded-full p-3',
            isFailed
              ? 'bg-tier-red/15 text-tier-red'
              : 'bg-canvas-bg text-text',
          )}
          aria-hidden="true"
        >
          {isFailed ? (
            <PhoneOff className="h-7 w-7" />
          ) : (
            <Phone className="h-7 w-7" />
          )}
        </motion.div>

        <div className="font-display text-xl tracking-tight">
          {STATUS_LABEL[status]}
        </div>
      </div>

      <div className="flex w-full flex-col items-start gap-1.5 pb-1">
        <AnimatePresence initial={false}>
          {bubbles.map((b) => (
            <CardBubble key={b.key} text={b.text} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
