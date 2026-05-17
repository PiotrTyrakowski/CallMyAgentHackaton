"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Offer, OfferRuntimeState, Tier } from "@/lib/types";
import { CheckIcon, PhoneIcon, StarIcon } from "./icons";

const PAGES = ["overview", "why", "negotiation", "reviews"] as const;
type PageKey = (typeof PAGES)[number];

interface Props {
  offer: Offer;
  runtime: OfferRuntimeState;
  size?: "default" | "winner";
}

const tierRing: Record<Tier, string> = {
  red: "border-red-300",
  normal: "border-gray-200",
  green: "border-emerald-400",
  gold: "border-amber-400 gold-shimmer",
};

const tierBadge: Partial<Record<Tier, { label: string; cls: string }>> = {
  gold: {
    label: "Agent top pick",
    cls: "bg-amber-500 text-white",
  },
  green: {
    label: "Strong match",
    cls: "bg-emerald-500 text-white",
  },
};

export function OfferTinderCard({ offer, runtime, size = "default" }: Props) {
  const [page, setPage] = useState(0);

  const next = () => setPage((p) => (p + 1) % PAGES.length);
  const prev = () => setPage((p) => (p - 1 + PAGES.length) % PAGES.length);
  const current: PageKey = PAGES[page];
  const badge = tierBadge[offer.tier];

  const sizeClass =
    size === "winner"
      ? "w-[440px] sm:w-[480px] h-[min(82vh,760px)]"
      : "w-[400px] sm:w-[440px] h-[min(76vh,680px)]";

  return (
    <div
      className={`relative bg-white rounded-[28px] shadow-xl border-2 ${tierRing[offer.tier]} ${sizeClass} max-w-full overflow-hidden flex flex-col`}
    >
      <div className="relative flex-[0_0_56%] overflow-hidden bg-gray-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={offer.photoUrl}
          alt={offer.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/30" />

        <button
          type="button"
          onClick={prev}
          aria-label="Previous"
          className="absolute inset-y-0 left-0 w-1/2 z-10 cursor-pointer focus:outline-none"
        />
        <button
          type="button"
          onClick={next}
          aria-label="Next"
          className="absolute inset-y-0 right-0 w-1/2 z-10 cursor-pointer focus:outline-none"
        />

        <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-20">
          {PAGES.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i === page ? "bg-white" : "bg-white/35"
              }`}
            />
          ))}
        </div>

        <div className="absolute top-7 left-3 right-3 z-20 flex items-center justify-between gap-2">
          <div className="rounded-full bg-white/90 backdrop-blur px-2.5 py-0.5 text-[11px] font-medium text-gray-800 shadow-sm">
            {offer.source}
          </div>
          <div className="flex items-center gap-2">
            {badge && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-md ${badge.cls}`}
              >
                {badge.label}
              </span>
            )}
            {runtime.negotiatedDiscount > 0 && (
              <span className="rounded-full bg-emerald-500 text-white px-2.5 py-0.5 text-[12px] font-bold shadow-md">
                −${runtime.negotiatedDiscount}
              </span>
            )}
            {runtime.callStatus === "failed" && (
              <span className="rounded-full bg-gray-800 text-white px-2.5 py-0.5 text-[11px] font-bold shadow-md uppercase tracking-wider">
                No answer
              </span>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 p-5 z-20 text-white">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold leading-tight drop-shadow-sm">
                {offer.title}
              </h2>
              <div className="text-[13px] text-white/90 mt-0.5">
                {offer.neighborhood} ·{" "}
                {offer.beds === 0 ? "Studio" : `${offer.beds} bed${offer.beds > 1 ? "s" : ""}`} ·{" "}
                {offer.guests} guests
              </div>
            </div>
            <div className="flex items-center gap-1 text-[13px] font-semibold shrink-0">
              <StarIcon className="w-4 h-4 text-amber-300" />
              {offer.rating.toFixed(1)}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {runtime.negotiatedDiscount > 0 && (
              <span className="line-through text-[13px] text-white/70">
                ${offer.originalPrice}
              </span>
            )}
            <span
              className={`text-2xl font-bold ${
                runtime.negotiatedDiscount > 0 ? "text-emerald-300" : "text-white"
              }`}
            >
              ${runtime.currentPrice}
            </span>
            <span className="text-[12px] text-white/80">/night</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {current === "overview" && <Overview offer={offer} />}
            {current === "why" && <Why offer={offer} />}
            {current === "negotiation" && (
              <Negotiation offer={offer} runtime={runtime} />
            )}
            {current === "reviews" && <Reviews offer={offer} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-5 pb-3 pt-1 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] font-semibold text-gray-400 select-none">
        <button type="button" onClick={prev} className="hover:text-gray-700">
          ← back
        </button>
        <span className="text-gray-600">{labelFor(current)}</span>
        <button type="button" onClick={next} className="hover:text-gray-700">
          next →
        </button>
      </div>
    </div>
  );
}

function labelFor(p: PageKey) {
  switch (p) {
    case "overview":
      return "Overview";
    case "why":
      return "Why this one";
    case "negotiation":
      return "The call";
    case "reviews":
      return "Reviews";
  }
}

function Overview({ offer }: { offer: Offer }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-[13px]">
        <Stat
          label="Beds"
          value={offer.beds === 0 ? "Studio" : `${offer.beds}`}
        />
        <Stat label="Baths" value={`${offer.baths}`} />
        <Stat label="Guests" value={`${offer.guests}`} />
        <Stat label="Wi-Fi" value={offer.wifiSpeed ?? "—"} />
      </div>
      {offer.cancellationPolicy && (
        <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-[12px] text-gray-700">
          {offer.cancellationPolicy}
        </div>
      )}
      {offer.verifiedFlags && offer.verifiedFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {offer.verifiedFlags.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-medium text-blue-800"
            >
              <CheckIcon className="w-3 h-3" /> {v}
            </span>
          ))}
        </div>
      )}
      <div className="text-[12px] text-gray-500 pt-1">{offer.addressLine}</div>
    </div>
  );
}

function Why({ offer }: { offer: Offer }) {
  return (
    <section>
      <h3 className="text-[11px] uppercase tracking-[0.18em] font-bold text-gray-500 mb-2">
        Why your agent picked it
      </h3>
      {offer.pros && offer.pros.length > 0 ? (
        <ul className="space-y-2">
          {offer.pros.map((p) => (
            <li
              key={p}
              className="flex items-start gap-2 text-[14px] text-gray-800 leading-snug"
            >
              <CheckIcon className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No notes yet.</p>
      )}
    </section>
  );
}

function Negotiation({
  offer,
  runtime,
}: {
  offer: Offer;
  runtime: OfferRuntimeState;
}) {
  const failed = runtime.callStatus === "failed";

  if (failed) {
    return (
      <section className="space-y-3">
        <h3 className="text-[11px] uppercase tracking-[0.18em] font-bold text-gray-500">
          The call
        </h3>
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-bold text-gray-700 mb-1.5">
            <PhoneIcon className="w-3.5 h-3.5" /> No answer
          </div>
          <p className="text-[14px] text-gray-700 leading-snug">
            Owner didn't pick up. We'll retry right before you book to lock in
            any last-minute discount. Listed at the standard rate for now.
          </p>
        </div>
        <div className="text-[12px] text-gray-500">
          Standard listing rate ·{" "}
          <span className="font-semibold text-gray-800">
            ${offer.originalPrice}/night
          </span>
        </div>
      </section>
    );
  }

  if (runtime.negotiatedDiscount <= 0) {
    return (
      <section>
        <h3 className="text-[11px] uppercase tracking-[0.18em] font-bold text-gray-500 mb-2">
          The call
        </h3>
        <p className="text-[14px] text-gray-700">
          The owner held firm — no discount this time. Listed at the original price.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="text-[11px] uppercase tracking-[0.18em] font-bold text-gray-500">
        The call
      </h3>
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-bold text-emerald-800 mb-1.5">
          <PhoneIcon className="w-3.5 h-3.5" /> What the agent said
        </div>
        <p className="text-[14px] text-emerald-900 leading-snug">
          {offer.negotiationHighlight ??
            "Agent negotiated a better rate by referencing nearby listings."}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Mini label="Listed" value={`$${offer.originalPrice}`} />
        <Mini label="You pay" value={`$${runtime.currentPrice}`} accent />
        <Mini label="Saved/night" value={`$${runtime.negotiatedDiscount}`} />
      </div>
    </section>
  );
}

function Reviews({ offer }: { offer: Offer }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] uppercase tracking-[0.18em] font-bold text-gray-500">
        Reviews & amenities
      </h3>
      {offer.recentReview ? (
        <div>
          <blockquote className="text-[14px] text-gray-800 leading-relaxed italic border-l-2 border-gray-300 pl-3">
            "{offer.recentReview.text}"
          </blockquote>
          <div className="text-[12px] text-gray-500 mt-1.5 pl-3">
            — {offer.recentReview.author} ·{" "}
            {"★".repeat(offer.recentReview.rating)}{" "}
            <span className="text-gray-400">({offer.reviews} total)</span>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-gray-500">No reviews yet.</p>
      )}
      {offer.amenities.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-gray-400 mb-1.5">
            Amenities
          </div>
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
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
        {label}
      </div>
      <div className="text-[14px] font-semibold text-gray-900 mt-0.5">
        {value}
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-2 py-2 ${
        accent
          ? "bg-emerald-500 border-emerald-500 text-white"
          : "bg-white border-gray-200 text-gray-900"
      }`}
    >
      <div
        className={`text-[10px] uppercase tracking-wider font-semibold ${
          accent ? "text-emerald-50" : "text-gray-500"
        }`}
      >
        {label}
      </div>
      <div className="text-[13px] font-bold mt-0.5">{value}</div>
    </div>
  );
}
