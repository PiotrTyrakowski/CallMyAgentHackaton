"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

interface Props {
  target: number;
  duration?: number;
  className?: string;
}

export function PriceCounter({ target, duration = 0.7, className }: Props) {
  const mv = useMotionValue(target);
  const rounded = useTransform(mv, (v) => `$${Math.round(v)}`);

  useEffect(() => {
    const controls = animate(mv, target, { duration, ease: "easeOut" });
    return () => controls.stop();
  }, [target, mv, duration]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
