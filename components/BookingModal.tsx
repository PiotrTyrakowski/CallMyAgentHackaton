"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { FlowEngine } from "@/lib/flow/machine";
import { CheckIcon, PhoneIcon, ShieldIcon } from "./icons";

export function BookingModal({ engine }: { engine: FlowEngine }) {
  const {
    phase,
    champion,
    runtime,
    bookingResult,
    confirmBooking,
    closeBooking,
    reset,
  } = engine;
  const [submitting, setSubmitting] = useState(false);

  const open = phase === "booking" || phase === "booked";
  if (!open || !champion) return null;

  const rt = runtime[champion.id];
  const isBooked = phase === "booked";
  const total = rt.currentPrice * 3;

  const handleConfirm = async () => {
    setSubmitting(true);
    await confirmBooking();
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 grid place-items-center bg-black/35 backdrop-blur-sm p-4"
      >
        <motion.div
          key="modal"
          initial={{ y: 30, scale: 0.95, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 20, scale: 0.97, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          {isBooked ? (
            <div className="p-7 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 240, damping: 16 }}
                className="mx-auto w-16 h-16 rounded-full bg-emerald-100 grid place-items-center mb-4"
              >
                <CheckIcon className="w-8 h-8 text-emerald-600" strokeWidth={3} />
              </motion.div>
              <h2 className="text-2xl font-bold">Booked!</h2>
              <p className="text-sm text-gray-600 mt-2">
                {champion.title} is confirmed at{" "}
                <span className="font-semibold text-emerald-700">
                  ${rt.currentPrice}/night
                </span>
                .
              </p>
              {rt.negotiatedDiscount > 0 && (
                <p className="text-xs text-gray-500 mt-1.5">
                  Your agent saved you ${rt.negotiatedDiscount}/night.
                </p>
              )}
              {bookingResult?.cardLast4 && (
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] text-emerald-800">
                  <ShieldIcon className="w-3 h-3" />
                  Charged ${total} to virtual card ····{" "}
                  {bookingResult.cardLast4}
                </div>
              )}
              <div className="flex gap-2 justify-center mt-6">
                <button
                  onClick={closeBooking}
                  className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Done
                </button>
                <button
                  onClick={reset}
                  className="rounded-full bg-black text-white px-5 py-2.5 text-sm font-semibold"
                >
                  Search again
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">Easy Booking</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {champion.title}
                  </p>
                </div>
                <button
                  onClick={closeBooking}
                  aria-label="Close"
                  className="text-gray-400 hover:text-gray-800 text-2xl leading-none -mt-1 -mr-1"
                >
                  ×
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 mb-4 bg-gray-50">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Price/night</span>
                  <span className="font-semibold">${rt.currentPrice}</span>
                </div>
                {rt.negotiatedDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-700 mt-1.5">
                    <span>Agent negotiated</span>
                    <span className="font-semibold">
                      −${rt.negotiatedDiscount}/night
                    </span>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-sm">
                  <span className="text-gray-600">Total · 3 nights</span>
                  <span className="font-semibold text-gray-900">${total}</span>
                </div>
              </div>

              <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                  <ShieldIcon className="w-3.5 h-3.5" />
                  Sponge virtual card · issued at checkout
                </div>
                <div className="mt-3 font-mono text-[14px] tracking-[0.22em] text-gray-700">
                  •••• &nbsp; •••• &nbsp; •••• &nbsp; ••••
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <div className="uppercase tracking-wider text-gray-400 font-semibold">
                      Locked to
                    </div>
                    <div className="text-gray-800 font-medium truncate">
                      {champion.source}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wider text-gray-400 font-semibold">
                      Max charge
                    </div>
                    <div className="text-gray-800 font-medium">${total}</div>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
                  One-shot card scoped to this merchant and amount. Your real
                  card is never exposed; the issued card auto-expires after this
                  charge.
                </p>
              </div>

              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="mt-5 w-full rounded-full bg-black text-white py-3.5 font-semibold transition-opacity disabled:opacity-70"
              >
                {submitting ? "Issuing card & confirming…" : "Issue card & book"}
              </button>
              {submitting && (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <span className="ring-shake inline-flex">
                    <PhoneIcon className="w-3.5 h-3.5" />
                  </span>
                  Sponge minting card · locking discount with owner…
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
