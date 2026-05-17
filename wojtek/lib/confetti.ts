"use client";
import confetti from "canvas-confetti";

export function fireConfetti(opts?: { gold?: boolean }) {
  const colors = opts?.gold
    ? ["#fbbf24", "#f59e0b", "#fcd34d", "#fde68a"]
    : ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0"];
  const end = Date.now() + 900;
  const burst = () => {
    confetti({
      particleCount: 40,
      spread: 70,
      startVelocity: 45,
      origin: { x: 0.5, y: 0.55 },
      colors,
      scalar: 1.1,
    });
  };
  burst();
  const intv = setInterval(() => {
    if (Date.now() > end) {
      clearInterval(intv);
      return;
    }
    confetti({
      particleCount: 18,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.6 },
      colors,
    });
    confetti({
      particleCount: 18,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.6 },
      colors,
    });
  }, 220);
}
