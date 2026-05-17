"use client";

export function PhoneIcon({ ringing }: { ringing: boolean }) {
  return (
    <div
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full ${
        ringing ? "bg-glow text-ink animate-ring-pulse shadow-[0_0_18px_rgba(124,255,178,0.65)]" : "bg-zinc-800 text-zinc-500"
      }`}
      style={{ transformOrigin: "center" }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    </div>
  );
}
