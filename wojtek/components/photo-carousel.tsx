"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PhotoCarousel({
  photos,
  height = 180,
}: {
  photos: string[];
  height?: number;
}) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(0);
  const n = photos.length;

  const go = (delta: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDir(delta);
    setI((p) => (p + delta + n) % n);
  };

  return (
    <div
      className="group relative overflow-hidden bg-zinc-900"
      style={{ height }}
    >
      <AnimatePresence custom={dir} initial={false}>
        <motion.img
          key={i}
          src={photos[i]}
          alt=""
          draggable={false}
          custom={dir}
          initial={{ x: dir > 0 ? "100%" : "-100%", opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: dir > 0 ? "-100%" : "100%", opacity: 0.4 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </AnimatePresence>

      {n > 1 && (
        <>
          <button
            onClick={(e) => go(-1, e)}
            className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/60 group-hover:opacity-100"
            aria-label="Previous photo"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={(e) => go(1, e)}
            className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/60 group-hover:opacity-100"
            aria-label="Next photo"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
            {photos.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-5 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
