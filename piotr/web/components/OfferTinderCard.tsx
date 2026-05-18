"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Offer, OfferRuntimeState, Tier } from "@/lib/types";
import {
  BathIcon,
  BedIcon,
  CheckIcon,
  MapPinIcon,
  PhoneIcon,
  PhoneOffIcon,
  SparklesIcon,
  StarIcon,
  UsersIcon,
  WifiIcon,
} from "./icons";

export const TINDER_PAGES = ["overview", "why", "negotiation", "reviews"] as const;
export type TinderPageKey = (typeof TINDER_PAGES)[number];
export const TINDER_PAGE_LABELS: Record<TinderPageKey, string> = {
  overview: "Overview",
  why: "Why",
  negotiation: "The Call",
  reviews: "Reviews",
};

const DEFAULT_STAY_NIGHTS = 7;

interface Props {
  offer: Offer;
  runtime: OfferRuntimeState;
  size?: "default" | "winner";
  pageIndex?: number;
  onChangePage?: (delta: number) => void;
  // Distilled preferences applicable to THIS offer for THIS user, surfaced on
  // the "Why" page. Empty when memory is cold (first session, fresh user id).
  tailoredHints?: string[];
}

const tierRing: Record<Tier, string> = {
  red: "border-red-300",
  normal: "border-gray-200",
  green: "border-emerald-400",
  gold: "border-amber-400 gold-shimmer",
};

interface TierAccent {
  text: string;
  soft: string;
  rule: string;
  quote: string;
}

const tierAccent: Record<Tier, TierAccent> = {
  red: {
    text: "text-red-700",
    soft: "bg-red-50",
    rule: "border-red-200",
    quote: "text-red-300",
  },
  normal: {
    text: "text-gray-700",
    soft: "bg-gray-50",
    rule: "border-gray-200",
    quote: "text-gray-300",
  },
  green: {
    text: "text-emerald-700",
    soft: "bg-emerald-50",
    rule: "border-emerald-200",
    quote: "text-emerald-300",
  },
  gold: {
    text: "text-amber-700",
    soft: "bg-amber-50",
    rule: "border-amber-200",
    quote: "text-amber-300",
  },
};

const tierBadge: Partial<Record<Tier, { label: string; cls: string }>> = {
  gold: { label: "Agent top pick", cls: "bg-amber-500 text-white" },
  green: { label: "Strong match", cls: "bg-emerald-500 text-white" },
};

const tierFitLabel: Partial<Record<Tier, string>> = {
  gold: "Top pick",
  green: "Strong fit",
  normal: "Worth a look",
  red: "Risky pick",
};

export function OfferTinderCard({
  offer,
  runtime,
  size = "default",
  pageIndex,
  onChangePage,
  tailoredHints,
}: Props) {
  const [localPage, setLocalPage] = useState(0);
  const controlled = pageIndex !== undefined && onChangePage !== undefined;
  const page = controlled ? pageIndex! : localPage;

  const change = (delta: number) => {
    if (controlled) {
      onChangePage!(delta);
    } else {
      setLocalPage((p) => (p + delta + TINDER_PAGES.length) % TINDER_PAGES.length);
    }
  };

  const current: TinderPageKey = TINDER_PAGES[page];
  const badge = tierBadge[offer.tier];
  const accent = tierAccent[offer.tier];

  const sizeClass =
    size === "winner"
      ? "w-[min(480px,40vw)] h-[min(740px,calc(100vh-340px))] min-h-[580px] min-w-[400px]"
      : "w-[min(420px,42vw)] h-[min(700px,calc(100vh-420px))] min-h-[540px] min-w-[360px]";

  return (
    <div
      className={`relative bg-white rounded-[28px] shadow-xl border-2 ${tierRing[offer.tier]} ${sizeClass} max-w-full overflow-hidden flex flex-col`}
    >
      <div className="relative flex-[0_0_52%] overflow-hidden bg-gray-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={offer.photoUrl}
          alt={offer.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />

        <button
          type="button"
          onClick={() => change(-1)}
          aria-label="Previous"
          className="absolute inset-y-0 left-0 w-1/2 z-10 cursor-pointer focus:outline-none"
        />
        <button
          type="button"
          onClick={() => change(1)}
          aria-label="Next"
          className="absolute inset-y-0 right-0 w-1/2 z-10 cursor-pointer focus:outline-none"
        />

        <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-20">
          {TINDER_PAGES.map((_, i) => (
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

        <div className="absolute bottom-0 inset-x-0 p-5 z-20 text-white pointer-events-none">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold leading-tight drop-shadow-sm">
                {offer.title}
              </h2>
              <div className="text-[13px] text-white/90 mt-0.5">
                {offer.neighborhood} ·{" "}
                {offer.beds === 0
                  ? "Studio"
                  : `${offer.beds} bed${offer.beds > 1 ? "s" : ""}`}{" "}
                · {offer.guests} guests
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

      <div className="flex-1 min-h-0 px-6 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="h-full"
          >
            {current === "overview" && <Overview offer={offer} accent={accent} />}
            {current === "why" && (
              <Why
                offer={offer}
                accent={accent}
                tailoredHints={tailoredHints}
              />
            )}
            {current === "negotiation" && (
              <Negotiation offer={offer} runtime={runtime} accent={accent} />
            )}
            {current === "reviews" && <Reviews offer={offer} accent={accent} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {!controlled && (
        <div className="px-6 pb-3 pt-1 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] font-semibold text-gray-400 select-none">
          <button
            type="button"
            onClick={() => change(-1)}
            className="hover:text-gray-700"
          >
            ← back
          </button>
          <span className="text-gray-600">{TINDER_PAGE_LABELS[current]}</span>
          <button
            type="button"
            onClick={() => change(1)}
            className="hover:text-gray-700"
          >
            next →
          </button>
        </div>
      )}
    </div>
  );
}

function Overview({ offer, accent }: { offer: Offer; accent: TierAccent }) {
  const stats = [
    {
      Icon: BedIcon,
      label: "Bedroom",
      value: offer.beds === 0 ? "Studio" : `${offer.beds}`,
    },
    { Icon: BathIcon, label: "Bath", value: `${offer.baths}` },
    { Icon: UsersIcon, label: "Guests", value: `${offer.guests}` },
    {
      Icon: WifiIcon,
      label: "Wi-Fi",
      value: (offer.wifiSpeed ?? "—").split(/\s+/).slice(0, 2).join(" "),
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-4 gap-2">
        {stats.map(({ Icon, label, value }) => (
          <div key={label} className="flex flex-col items-start gap-1">
            <Icon className={`w-4 h-4 ${accent.text}`} />
            <div
              className={`font-semibold text-gray-900 leading-none ${
                value.length > 3 ? "text-[14px]" : "text-[20px]"
              }`}
            >
              {value}
            </div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-gray-400 font-semibold">
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className={`mt-5 border-t ${accent.rule}`} />

      <div className="mt-4 space-y-2.5 text-[13px] text-gray-700">
        {offer.cancellationPolicy && (
          <div className="flex items-start gap-2">
            <span className={`mt-1 text-[10px] ${accent.text}`}>◇</span>
            <span>{offer.cancellationPolicy}</span>
          </div>
        )}
        {offer.verifiedFlags && offer.verifiedFlags.length > 0 && (
          <div className="flex items-start gap-2">
            <CheckIcon className={`mt-0.5 w-3.5 h-3.5 shrink-0 ${accent.text}`} />
            <span>{offer.verifiedFlags.join(" · ")}</span>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 flex items-center gap-1.5 text-[12px] text-gray-500">
        <MapPinIcon className="w-3.5 h-3.5" />
        <span>{offer.addressLine}</span>
      </div>
    </div>
  );
}

function Why({
  offer,
  accent,
  tailoredHints,
}: {
  offer: Offer;
  accent: TierAccent;
  tailoredHints?: string[];
}) {
  const top = (offer.pros ?? []).slice(0, 3);
  const fitLabel = tierFitLabel[offer.tier] ?? "Worth a look";
  const hints = (tailoredHints ?? []).slice(0, 2);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-bold text-gray-500">
        <SparklesIcon className={`w-3.5 h-3.5 ${accent.text}`} />
        Agent's take
      </div>

      <div className="mt-4 flex-1">
        {top.length > 0 ? (
          <ol className="space-y-3">
            {top.map((pro, i) => (
              <li key={pro} className="flex items-start gap-3">
                <span className={`text-[10px] font-mono font-bold tabular-nums tracking-tight ${accent.text} pt-1`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[14px] leading-snug text-gray-800">
                  {pro}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-500">No notes yet.</p>
        )}

        {hints.length > 0 && (
          <div className="mt-5 pt-4 border-t border-violet-100">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-bold text-violet-600">
              <SparklesIcon className="w-3 h-3" />
              Tailored to you
            </div>
            <ul className="mt-2 space-y-1.5">
              {hints.map((h) => (
                <li
                  key={h}
                  className="text-[12.5px] leading-snug text-violet-800/90 flex items-start gap-2"
                >
                  <span className="mt-1 inline-block h-1 w-1 rounded-full bg-violet-400 shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${accent.soft} ${accent.text}`}
        >
          <SparklesIcon className="w-3 h-3" /> {fitLabel}
        </span>
      </div>
    </div>
  );
}

function Negotiation({
  offer,
  runtime,
  accent,
}: {
  offer: Offer;
  runtime: OfferRuntimeState;
  accent: TierAccent;
}) {
  const failed = runtime.callStatus === "failed";
  const hasDiscount = runtime.negotiatedDiscount > 0;

  if (failed) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <PhoneOffIcon className="w-9 h-9 text-gray-400" />
        <h3 className="mt-3 text-[18px] font-bold text-gray-800">
          Didn't pick up
        </h3>
        <p className="mt-3 text-[13px] text-gray-600 leading-relaxed max-w-[26ch]">
          Owner missed the call. We'll retry right before you book to catch any
          last-minute drop.
        </p>
        <div className="mt-5 text-[11px] uppercase tracking-[0.18em] text-gray-400">
          Listed
        </div>
        <div className="text-[18px] font-bold text-gray-800">
          ${offer.originalPrice}
          <span className="text-[12px] font-medium text-gray-500"> /night</span>
        </div>
      </div>
    );
  }

  if (!hasDiscount) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <PhoneIcon className="w-9 h-9 text-gray-400" />
        <h3 className="mt-3 text-[18px] font-bold text-gray-800">
          Owner held firm
        </h3>
        <p className="mt-3 text-[13px] text-gray-600 leading-relaxed max-w-[26ch]">
          No discount this time — but we locked the standard rate before the
          listing could shift.
        </p>
        <div className="mt-5 text-[11px] uppercase tracking-[0.18em] text-gray-400">
          Listed
        </div>
        <div className="text-[18px] font-bold text-gray-800">
          ${offer.originalPrice}
          <span className="text-[12px] font-medium text-gray-500"> /night</span>
        </div>
      </div>
    );
  }

  const totalSaved = runtime.negotiatedDiscount * DEFAULT_STAY_NIGHTS;

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col items-center text-center">
        <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-emerald-700">
          Saved per night
        </div>
        <div className="mt-1 text-[56px] font-extrabold tracking-tight text-emerald-600 leading-none">
          −${runtime.negotiatedDiscount}
        </div>
      </div>

      <div className="mt-4 relative pl-6">
        <span
          className={`absolute -top-2 left-0 font-serif italic text-[42px] leading-none ${accent.quote}`}
          aria-hidden
        >
          &ldquo;
        </span>
        <p className="text-[13px] italic leading-snug text-gray-700">
          {offer.negotiationHighlight ??
            "Agent matched a nearby listing to lock in the lower rate."}
        </p>
      </div>

      <div className={`mt-auto pt-4 border-t ${accent.rule}`}>
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="text-gray-400 line-through">
            ${offer.originalPrice}
          </span>
          <span className="text-gray-300">→</span>
          <span className="font-bold text-emerald-600">
            ${runtime.currentPrice}
            <span className="text-[11px] font-medium text-gray-500"> /night</span>
          </span>
        </div>
        <div className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-gray-400 font-semibold">
          Est. {DEFAULT_STAY_NIGHTS}-night saving ·{" "}
          <span className="text-emerald-700 font-bold normal-case tracking-normal">
            ${totalSaved}
          </span>
        </div>
      </div>
    </div>
  );
}

function Reviews({ offer, accent }: { offer: Offer; accent: TierAccent }) {
  const stars = Math.round(offer.rating);
  const topAmenities = offer.amenities.slice(0, 4);

  return (
    <div className="h-full flex flex-col">
      {offer.recentReview ? (
        <div className="relative pl-7">
          <span
            className={`absolute -top-3 left-0 font-serif italic text-[56px] leading-none ${accent.quote}`}
            aria-hidden
          >
            &ldquo;
          </span>
          <p className="text-[14px] italic leading-snug text-gray-800">
            {offer.recentReview.text}
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-[12px] text-gray-500">
            <span className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < stars ? "text-amber-400" : "text-gray-200"
                  }`}
                />
              ))}
            </span>
            <span className="text-gray-700 font-medium">
              {offer.recentReview.author}
            </span>
            <span className="text-gray-300">·</span>
            <span>{offer.reviews} reviews</span>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-gray-500">No reviews yet.</p>
      )}

      {topAmenities.length > 0 && (
        <div className={`mt-auto pt-4 border-t ${accent.rule}`}>
          <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-gray-400 mb-1.5">
            Amenities
          </div>
          <div className="text-[13px] text-gray-700 leading-relaxed">
            {topAmenities.join(" · ")}
          </div>
        </div>
      )}
    </div>
  );
}
