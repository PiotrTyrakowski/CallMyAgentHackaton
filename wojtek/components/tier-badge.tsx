import type { Tier } from "@/lib/types";

const map: Record<Tier, { label: string; cls: string }> = {
  trash: { label: "TRASH", cls: "bg-red-500/20 text-red-300 border-red-500/40" },
  normal: { label: "OK", cls: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40" },
  good: {
    label: "GOOD",
    cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  gold: {
    label: "★ GOLD",
    cls: "bg-amber-400/20 text-amber-300 border-amber-400/60",
  },
};

export function TierBadge({ tier }: { tier: Tier }) {
  const m = map[tier];
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider ${m.cls}`}
    >
      {m.label}
    </span>
  );
}
