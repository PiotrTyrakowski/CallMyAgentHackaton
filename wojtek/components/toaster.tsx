"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useToasts, type ToastTone } from "@/lib/toast-store";

const toneStyles: Record<ToastTone, string> = {
  info: "border-zinc-700 bg-zinc-900/90 text-zinc-100",
  success:
    "border-emerald-400/60 bg-emerald-950/80 text-emerald-100 shadow-emerald-500/20",
  warning:
    "border-amber-400/60 bg-amber-950/80 text-amber-100 shadow-amber-400/20",
  danger:
    "border-red-500/60 bg-red-950/80 text-red-100 shadow-red-500/20",
  gold:
    "border-amber-300 bg-gradient-to-br from-amber-900/80 to-zinc-950 text-amber-100 shadow-amber-300/30",
};

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ x: 320, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 320, opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className={`pointer-events-auto rounded-xl border px-3.5 py-3 shadow-[0_8px_30px_-12px] backdrop-blur-md ${toneStyles[t.tone]}`}
          >
            <div className="flex items-start gap-2.5">
              {t.emoji && (
                <span className="mt-0.5 text-lg leading-none">{t.emoji}</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold leading-tight">{t.title}</div>
                {t.description && (
                  <div className="mt-0.5 text-xs opacity-80">
                    {t.description}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
