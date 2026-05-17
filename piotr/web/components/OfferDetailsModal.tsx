"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Offer, OfferRuntimeState } from "@/lib/types";
import { CheckIcon, PhoneIcon, StarIcon } from "./icons";

interface Props {
  offer: Offer | null;
  runtime: OfferRuntimeState | null;
  onClose: () => void;
}

export function OfferDetailsModal({ offer, runtime, onClose }: Props) {
  return (
    <AnimatePresence>
      {offer && runtime && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-40 grid place-items-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <motion.div
            key="card"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 24, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden my-8"
          >
            <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={offer.photoUrl}
                alt={offer.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-gray-700 hover:bg-white shadow-md text-xl leading-none"
              >
                ×
              </button>
              <div className="absolute bottom-3 left-3 rounded-full bg-white/95 backdrop-blur px-3 py-1 text-[12px] font-medium text-gray-700 shadow-sm">
                {offer.source}
              </div>
              {runtime.negotiatedDiscount > 0 && (
                <div className="absolute bottom-3 right-3 rounded-full bg-emerald-500 text-white px-3 py-1 text-[13px] font-bold shadow-md">
                  −${runtime.negotiatedDiscount}/night
                </div>
              )}
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold leading-tight">
                    {offer.title}
                  </h2>
                  <div className="text-sm text-gray-500 mt-1">
                    {offer.addressLine} · {offer.neighborhood}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold shrink-0">
                  <StarIcon className="w-4 h-4 text-amber-500" />
                  {offer.rating.toFixed(1)}
                  <span className="text-gray-400 font-normal">
                    ({offer.reviews})
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-[13px] text-gray-700">
                <Stat
                  label={
                    offer.beds === 0
                      ? "Studio"
                      : `${offer.beds} bed${offer.beds > 1 ? "s" : ""}`
                  }
                />
                <Stat label={`${offer.baths} bath`} />
                <Stat label={`${offer.guests} guests`} />
                {offer.wifiSpeed && <Stat label={`Wi-Fi ${offer.wifiSpeed}`} />}
              </div>

              <div className="flex items-baseline gap-2">
                {runtime.negotiatedDiscount > 0 && (
                  <span className="line-through text-base text-gray-400">
                    ${offer.originalPrice}
                  </span>
                )}
                <span
                  className={`text-3xl font-bold ${
                    runtime.negotiatedDiscount > 0
                      ? "text-emerald-700"
                      : "text-gray-900"
                  }`}
                >
                  ${runtime.currentPrice}
                </span>
                <span className="text-sm text-gray-500">/night</span>
              </div>

              {offer.pros && offer.pros.length > 0 && (
                <section>
                  <h3 className="text-[11px] uppercase tracking-[0.18em] font-bold text-gray-500 mb-2">
                    Why your agent likes it
                  </h3>
                  <ul className="space-y-1.5">
                    {offer.pros.map((p) => (
                      <li
                        key={p}
                        className="flex items-start gap-2 text-[14px] text-gray-800"
                      >
                        <CheckIcon className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {offer.negotiationHighlight && (
                <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-bold text-emerald-800 mb-1.5">
                    <PhoneIcon className="w-3.5 h-3.5" /> Negotiation
                  </div>
                  <p className="text-[14px] text-emerald-900 leading-snug">
                    {offer.negotiationHighlight}
                  </p>
                </section>
              )}

              {offer.recentReview && (
                <section>
                  <h3 className="text-[11px] uppercase tracking-[0.18em] font-bold text-gray-500 mb-2">
                    Recent review
                  </h3>
                  <blockquote className="text-[14px] text-gray-800 leading-relaxed italic border-l-2 border-gray-300 pl-3">
                    "{offer.recentReview.text}"
                  </blockquote>
                  <div className="text-[12px] text-gray-500 mt-1.5 pl-3">
                    — {offer.recentReview.author} ·{" "}
                    {"★".repeat(offer.recentReview.rating)}
                  </div>
                </section>
              )}

              {offer.amenities.length > 0 && (
                <section>
                  <h3 className="text-[11px] uppercase tracking-[0.18em] font-bold text-gray-500 mb-2">
                    Amenities
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {offer.amenities.map((a) => (
                      <span
                        key={a}
                        className="rounded-full border border-gray-200 px-2.5 py-1 text-[12px] text-gray-700"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {offer.verifiedFlags && offer.verifiedFlags.length > 0 && (
                <section className="flex flex-wrap gap-1.5">
                  {offer.verifiedFlags.map((v) => (
                    <span
                      key={v}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-[12px] font-medium text-blue-800"
                    >
                      <CheckIcon className="w-3 h-3" /> {v}
                    </span>
                  ))}
                </section>
              )}

              {offer.cancellationPolicy && (
                <p className="text-[12px] text-gray-500">
                  {offer.cancellationPolicy}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-gray-100 px-2 py-1 text-[12px] font-medium text-gray-700">
      {label}
    </span>
  );
}
