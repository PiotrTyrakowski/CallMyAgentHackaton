"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { FlowEngine } from "@/lib/flow/machine";
import { CheckIcon, PhoneIcon } from "./icons";

export function BookingModal({ engine }: { engine: FlowEngine }) {
  const { phase, champion, runtime, confirmBooking, closeBooking, reset } =
    engine;
  const [submitting, setSubmitting] = useState(false);

  const open = phase === "booking" || phase === "booked";
  if (!open || !champion) return null;

  const rt = runtime[champion.id];
  const isBooked = phase === "booked";

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

              <div className="rounded-xl border border-gray-200 p-4 mb-5 bg-gray-50">
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
              </div>

              <div className="space-y-3">
                <Field
                  label="Card number"
                  placeholder="4242 4242 4242 4242"
                  inputMode="numeric"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Expiry" placeholder="12/27" />
                  <Field label="CVC" placeholder="123" inputMode="numeric" />
                </div>
              </div>

              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="mt-5 w-full rounded-full bg-black text-white py-3.5 font-semibold transition-opacity disabled:opacity-70"
              >
                {submitting ? "Confirming with owner…" : "Confirm with owner"}
              </button>
              {submitting && (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <span className="ring-shake inline-flex">
                    <PhoneIcon className="w-3.5 h-3.5" />
                  </span>
                  Calling to lock in the discount…
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({
  label,
  placeholder,
  inputMode,
}: {
  label: string;
  placeholder: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
        {label}
      </label>
      <input
        type="text"
        inputMode={inputMode}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-800 focus:outline-none"
      />
    </div>
  );
}
