"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { OfferCard } from "./offer-card";
import type { Offer } from "@/lib/types";
import { effectivePrice } from "@/lib/tier-logic";
import { Check, Loader2 } from "lucide-react";

export function BookingModal({
  offer,
  onConfirmed,
}: {
  offer: Offer;
  onConfirmed: (txId: string) => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [tx, setTx] = useState<string | null>(null);
  const final = effectivePrice(offer);
  const nights = 3;
  const total = final * nights;

  async function book() {
    setState("loading");
    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId: offer.id, amount: total }),
    });
    const data = await res.json();
    setTx(data.txId);
    setState("done");
    onConfirmed(data.txId);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto flex max-w-2xl flex-col items-center gap-6 rounded-3xl border border-zinc-700 bg-zinc-950/80 p-8 backdrop-blur"
    >
      <h2 className="text-3xl font-bold text-zinc-100">
        {state === "done" ? "🎉 Booked!" : "Your winner"}
      </h2>
      <OfferCard offer={offer} showTier />

      <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm">
        <div className="flex justify-between text-zinc-400">
          <span>${final} × {nights} nights</span>
          <span>${total}</span>
        </div>
        {offer.negotiatedDiscount && offer.negotiatedDiscount > 0 && (
          <div className="mt-1 flex justify-between font-semibold text-emerald-400">
            <span>Negotiated savings ({offer.negotiatedDiscount}%)</span>
            <span>
              -${(offer.price - final) * nights}
            </span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-zinc-800 pt-2 text-lg font-bold text-zinc-100">
          <span>Total</span>
          <span>${total}</span>
        </div>
      </div>

      {state === "idle" && (
        <button
          onClick={book}
          className="w-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 py-4 text-lg font-black tracking-wider text-black hover:brightness-110"
        >
          EASY BOOKING →
        </button>
      )}
      {state === "loading" && (
        <button
          disabled
          className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-800 py-4 text-lg font-bold text-zinc-300"
        >
          <Loader2 className="size-5 animate-spin" /> Processing x402…
        </button>
      )}
      {state === "done" && (
        <div className="flex w-full flex-col items-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-emerald-300">
          <Check className="size-8" />
          <div className="text-sm">Booked. Tx: <code className="text-xs">{tx}</code></div>
        </div>
      )}
    </motion.div>
  );
}
