"use client";
import { motion } from "framer-motion";

export function DiscountPulse({ percent }: { percent: number }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -15 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 14 }}
      className="absolute -top-3 -right-3 z-20"
    >
      <motion.div
        animate={{
          boxShadow: [
            "0 0 0 0 rgba(16,185,129,0.7)",
            "0 0 0 14px rgba(16,185,129,0)",
            "0 0 0 0 rgba(16,185,129,0)",
          ],
        }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 px-3 py-1.5 text-xs font-black text-black shadow-lg"
      >
        -{percent}% 🎉
      </motion.div>
    </motion.div>
  );
}
