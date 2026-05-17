"use client";
import { MapPin } from "lucide-react";

/**
 * Lightweight static map preview using the public OpenStreetMap tile server.
 * We compute a single tile + offset the marker by lat/lng — no API key needed,
 * loads lazily because it's only rendered when card details are expanded.
 */
export function MiniMap({
  lat,
  lng,
  label,
  zoom = 13,
  height = 140,
}: {
  lat: number;
  lng: number;
  label?: string;
  zoom?: number;
  height?: number;
}) {
  // Tile math (slippy-map): convert lat/lng + zoom to tile x/y.
  const n = 2 ** zoom;
  const xTile = ((lng + 180) / 360) * n;
  const yTile =
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180),
      ) /
        Math.PI) /
      2) *
    n;

  const x = Math.floor(xTile);
  const y = Math.floor(yTile);
  // pin offset within the 256×256 tile
  const px = (xTile - x) * 256;
  const py = (yTile - y) * 256;

  const tileUrl = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800"
      style={{ height }}
    >
      <img
        src={tileUrl}
        alt="map"
        className="absolute inset-0 h-full w-full object-cover opacity-90"
        draggable={false}
      />
      <div
        className="absolute -translate-x-1/2 -translate-y-full"
        style={{ left: `${(px / 256) * 100}%`, top: `${(py / 256) * 100}%` }}
      >
        <MapPin className="size-7 fill-red-500 text-red-200 drop-shadow-md" />
      </div>
      {label && (
        <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white backdrop-blur">
          {label}
        </div>
      )}
    </div>
  );
}
