"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { OfferCard } from "./OfferCard";
import { OfferDetailsModal } from "./OfferDetailsModal";
import { CheckIcon, PhoneIcon } from "./icons";
import type { FlowEngine } from "@/lib/flow/machine";

export function WinnerStage({ engine }: { engine: FlowEngine }) {
  const { champion, runtime, startBooking, phase } = engine;
  const [showDetails, setShowDetails] = useState(false);
  if (!champion) return null;
  const rt = runtime[champion.id];
  const bookingOpen = phase === "booking" || phase === "booked";

  return (
    <>
      <div className="flex flex-col items-center gap-6 py-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight">
            Your pick is in.
          </h2>
        </motion.div>

        <motion.div
          initial={{ scale: 0.85, opacity: 0, rotate: -2 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          onClick={() => setShowDetails(true)}
          className="cursor-pointer"
        >
          <OfferCard offer={champion} runtime={rt} showTier size="winner" />
        </motion.div>

        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="text-[13px] text-gray-500 hover:text-gray-900 underline-offset-4 hover:underline"
        >
          See full details
        </button>

        {champion.pros && champion.pros.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-5"
          >
            <h3 className="text-[11px] uppercase tracking-[0.18em] font-bold text-gray-500 mb-3">
              Why your agent picked it
            </h3>
            <ul className="space-y-2">
              {champion.pros.slice(0, 4).map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-2 text-[14px] text-gray-800"
                >
                  <CheckIcon className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </motion.section>
        )}

        {champion.negotiationHighlight && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
          >
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-bold text-emerald-800 mb-1.5">
              <PhoneIcon className="w-3.5 h-3.5" /> What the agent said
            </div>
            <p className="text-[14px] text-emerald-900 leading-snug">
              {champion.negotiationHighlight}
            </p>
            {rt.negotiatedDiscount > 0 && (
              <p className="text-[13px] text-emerald-700 font-semibold mt-2">
                Saved you ${rt.negotiatedDiscount}/night.
              </p>
            )}
          </motion.div>
        )}

        <motion.button
          type="button"
          onClick={startBooking}
          disabled={bookingOpen}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55, type: "spring", stiffness: 220 }}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="mt-2 rounded-full bg-black text-white px-9 py-4 text-lg font-semibold shadow-lg shadow-black/15 transition-shadow hover:shadow-xl disabled:opacity-40"
        >
          EASY BOOKING →
        </motion.button>
      </div>

      <OfferDetailsModal
        offer={showDetails ? champion : null}
        runtime={showDetails ? rt : null}
        onClose={() => setShowDetails(false)}
      />
    </>
  );
}
