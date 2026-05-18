"use client";

import { AnimatePresence, motion } from "motion/react";
import type { FlowEngine } from "@/lib/flow/machine";
import type { BookingAuthorization } from "@/lib/providers";
import { CheckIcon, PhoneIcon, SparklesIcon } from "./icons";

const DEFAULT_STAY_NIGHTS = 3;

export function BookingModal({ engine }: { engine: FlowEngine }) {
  const {
    phase,
    champion,
    runtime,
    userContext,
    bookingAuth,
    bookingStatus,
    bookingError,
    confirmBooking,
    closeBooking,
    releaseBooking,
    reset,
  } = engine;

  const open = phase === "booking" || phase === "booked";
  if (!open || !champion) return null;

  const rt = runtime[champion.id];
  const pricePerNight = rt?.currentPrice ?? champion.originalPrice;
  const nights = userContext?.parsedHints.nights ?? DEFAULT_STAY_NIGHTS;
  const negotiatedTotal = pricePerNight * nights;
  const merchantName = bookingAuth?.merchantName ?? champion.source;
  const isBooked = phase === "booked" && bookingAuth !== null;
  const isAuthorizing = bookingStatus === "authorizing";
  const isReleasing = bookingStatus === "releasing";

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4"
      >
        <motion.div
          key="modal"
          initial={{ y: 30, scale: 0.95, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 20, scale: 0.97, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          {isBooked && bookingAuth ? (
            <AuthorizedView
              auth={bookingAuth}
              championTitle={champion.title}
              merchantName={merchantName}
              releasing={isReleasing}
              onDone={closeBooking}
              onRelease={releaseBooking}
              onReset={reset}
            />
          ) : (
            <PreAuthView
              championTitle={champion.title}
              merchantName={merchantName}
              pricePerNight={pricePerNight}
              nights={nights}
              negotiatedTotal={negotiatedTotal}
              negotiatedDiscount={rt?.negotiatedDiscount ?? 0}
              authorizing={isAuthorizing}
              error={bookingError}
              onConfirm={confirmBooking}
              onClose={closeBooking}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function PreAuthView(props: {
  championTitle: string;
  merchantName: string;
  pricePerNight: number;
  nights: number;
  negotiatedTotal: number;
  negotiatedDiscount: number;
  authorizing: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Easy Book</h2>
          <p className="text-sm text-gray-600 mt-0.5">{props.championTitle}</p>
        </div>
        <button
          onClick={props.onClose}
          aria-label="Close"
          className="text-gray-400 hover:text-gray-800 text-2xl leading-none -mt-1 -mr-1"
        >
          ×
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 mb-4 bg-gray-50">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            ${props.pricePerNight}/night × {props.nights}{" "}
            {props.nights === 1 ? "night" : "nights"}
          </span>
          <span className="font-semibold">${props.negotiatedTotal}</span>
        </div>
        {props.negotiatedDiscount > 0 && (
          <div className="flex justify-between text-sm text-emerald-700 mt-1.5">
            <span>Agent negotiated</span>
            <span className="font-semibold">
              −${props.negotiatedDiscount}/night
            </span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 mb-5">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-semibold text-amber-700">
          <SparklesIcon className="w-3 h-3" />
          Agent wallet
        </div>
        <div className="mt-1.5 text-[13px] text-gray-700 leading-snug">
          A single-merchant virtual card will be minted on your{" "}
          <span className="font-semibold">Sponge wallet</span> (Tempo, USDC),
          locked to <span className="font-semibold">{props.merchantName}</span>
          {", "}capped at the stay total, and expires in 15 minutes.
        </div>
      </div>

      {props.error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {props.error}
        </div>
      )}

      <button
        onClick={props.onConfirm}
        disabled={props.authorizing}
        className="w-full rounded-full bg-black text-white py-3.5 font-semibold transition-opacity disabled:opacity-70"
      >
        {props.authorizing
          ? "Authorizing on agent wallet…"
          : "Authorize & lock the rate"}
      </button>
      {props.authorizing && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
          <span className="ring-shake inline-flex">
            <PhoneIcon className="w-3.5 h-3.5" />
          </span>
          Minting a merchant-locked card via Sponge…
        </div>
      )}
    </div>
  );
}

function AuthorizedView(props: {
  auth: BookingAuthorization;
  championTitle: string;
  merchantName: string;
  releasing: boolean;
  onDone: () => void;
  onRelease: () => void;
  onReset: () => void;
}) {
  const auth = props.auth;
  const amount = (auth.amountCents / 100).toFixed(2);
  const before = auth.walletBalanceBeforeUsd;
  const after = auth.walletBalanceAfterUsd;
  const isSimulated = auth.status === "simulated";

  return (
    <div className="p-7">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 16 }}
        className="mx-auto w-14 h-14 rounded-full bg-emerald-100 grid place-items-center mb-4"
      >
        <CheckIcon className="w-7 h-7 text-emerald-600" strokeWidth={3} />
      </motion.div>
      <h2 className="text-center text-2xl font-bold">Hold placed</h2>
      <p className="text-center text-sm text-gray-600 mt-1.5">
        {props.championTitle}
      </p>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-900 to-gray-700 text-white p-5 shadow-lg">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/60">
          <span>Sponge virtual card</span>
          {isSimulated ? (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px]">
              simulated
            </span>
          ) : (
            <span className="rounded-full bg-emerald-500/20 text-emerald-200 px-2 py-0.5 text-[9px]">
              live
            </span>
          )}
        </div>
        <div className="mt-3 font-mono text-lg tracking-[0.18em]">
          •••• •••• •••• {auth.cardLast4 ?? "----"}
        </div>
        <div className="mt-3 flex items-end justify-between text-[11px] text-white/70">
          <div>
            <div className="uppercase tracking-wider text-[9px] text-white/50">
              Merchant lock
            </div>
            <div className="font-semibold text-white">{props.merchantName}</div>
          </div>
          <div className="text-right">
            <div className="uppercase tracking-wider text-[9px] text-white/50">
              Authorized
            </div>
            <div className="font-semibold text-white">${amount}</div>
          </div>
          <div className="text-right">
            <div className="uppercase tracking-wider text-[9px] text-white/50">
              Exp
            </div>
            <div className="font-semibold text-white">
              {auth.cardExp ?? "--/--"}
            </div>
          </div>
        </div>
      </div>

      <dl className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[12px] text-gray-700 grid grid-cols-2 gap-y-1.5 gap-x-3">
        <dt className="text-gray-500">Negotiated stay</dt>
        <dd className="text-right font-medium">
          ${auth.pricePerNight}/night × {auth.nights}
        </dd>
        <dt className="text-gray-500">Settlement</dt>
        <dd className="text-right font-medium">
          USDC · {auth.chain ?? "tempo"}
        </dd>
        {before !== undefined && after !== undefined && (
          <>
            <dt className="text-gray-500">Wallet balance</dt>
            <dd className="text-right font-medium">
              ${before.toFixed(2)} → ${after.toFixed(2)}
            </dd>
          </>
        )}
        <dt className="text-gray-500">Payment method ID</dt>
        <dd
          className="text-right font-mono text-[10.5px] text-gray-600 truncate"
          title={auth.id}
        >
          {auth.id}
        </dd>
      </dl>

      {auth.dashboardUrl && (
        <a
          href={auth.dashboardUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-center text-[12px] text-gray-500 hover:text-gray-900 underline underline-offset-4"
        >
          View card on Sponge dashboard →
        </a>
      )}

      <div className="mt-5 flex gap-2 justify-center">
        <button
          onClick={props.onRelease}
          disabled={props.releasing}
          className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {props.releasing ? "Releasing…" : "Release hold"}
        </button>
        <button
          onClick={props.onDone}
          className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Done
        </button>
        <button
          onClick={props.onReset}
          className="rounded-full bg-black text-white px-5 py-2.5 text-sm font-semibold"
        >
          Search again
        </button>
      </div>
    </div>
  );
}
