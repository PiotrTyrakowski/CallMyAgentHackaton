import type { Offer } from "../types";
import type { OfferProvider } from "./OfferProvider";

/**
 * Real browser-use offer search. Fans out N parallel sessions across SF
 * neighborhoods (one session per neighborhood), each returning 1-2 listings
 * from Airbnb's neighborhood-scoped results page. Wall time ≈ slowest single
 * session (~60-120s) instead of sequential 10× that.
 *
 * Env:
 *   BROWSERUSE_API_KEY
 *   BROWSERUSE_ENDPOINT (default https://api.browser-use.com/api/v3)
 */

const API = process.env.BROWSERUSE_ENDPOINT ?? "https://api.browser-use.com/api/v3";

const TARGETS: Array<{ name: string; lat: number; lng: number }> = [
  { name: "Pacific Heights", lat: 37.7925, lng: -122.4382 },
  { name: "Mission District", lat: 37.7599, lng: -122.4148 },
  { name: "Castro", lat: 37.7609, lng: -122.435 },
  { name: "SoMa", lat: 37.7785, lng: -122.3948 },
  { name: "Nob Hill", lat: 37.793, lng: -122.4161 },
  { name: "Marina District", lat: 37.8021, lng: -122.4368 },
  { name: "Hayes Valley", lat: 37.7766, lng: -122.4244 },
  { name: "North Beach", lat: 37.806, lng: -122.4103 },
];

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    offers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          price: { type: "number" },
          rating: { type: "number" },
          reviews: { type: "integer" },
          photos: { type: "array", items: { type: "string" } },
        },
        required: ["title", "price", "rating"],
      },
    },
  },
  required: ["offers"],
};

async function bu(path: string, init?: RequestInit) {
  const key = process.env.BROWSERUSE_API_KEY;
  if (!key) throw new Error("BROWSERUSE_API_KEY missing");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "X-Browser-Use-API-Key": key,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`browser-use ${res.status} ${path}`);
  }
  return res.json();
}

function taskFor(neighborhood: string, query: string): string {
  const slug = neighborhood.replace(/\s+/g, "-");
  return [
    `User asked: "${query}".`,
    `Go to https://www.airbnb.com/s/${encodeURIComponent(slug)}--San-Francisco--CA/homes`,
    `Grab the FIRST 2 listings shown on the results page. Don't open detail pages.`,
    `For each: title (actual listing name, not bed description), price as plain number USD/night, rating, reviews count, 1-2 photo URLs from a0.muscache.com containing "Hosting-" or matching /pictures/{uuid}.jpg.`,
    `Skip listings without rating or without a clean listing photo. Stop after 2.`,
    `Return ONLY the JSON.`,
  ].join("\n");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const browserUseOfferProvider: OfferProvider = {
  async *search(query: string): AsyncIterable<Offer> {
    // Stagger session creation to dodge the per-second rate limit on POST
    // /sessions — bursts of 8+ at once trigger 429s.
    const sessions: Array<{ target: typeof TARGETS[number]; sessionId: string; done: boolean }> = [];
    for (const t of TARGETS) {
      try {
        const created = await bu("/sessions", {
          method: "POST",
          body: JSON.stringify({
            task: taskFor(t.name, query),
            model: "bu-mini",
            output_schema: OUTPUT_SCHEMA,
          }),
        });
        sessions.push({ target: t, sessionId: created.id as string, done: false });
      } catch (e) {
        // skip neighborhoods we couldn't start; the rest still run
        console.warn(`[browseruse] skip ${t.name}: ${e}`);
      }
      await sleep(250);
    }
    if (sessions.length === 0) {
      throw new Error("could not start any browser-use sessions");
    }

    const seen = new Set<string>();
    let counter = 0;

    while (sessions.some((s) => !s.done)) {
      await sleep(2500);
      for (const s of sessions) {
        if (s.done) continue;
        const detail = await bu(`/sessions/${s.sessionId}`);
        if (detail.status === "idle" || detail.status === "stopped") {
          s.done = true;
          const raw =
            (detail.output as { offers?: unknown[] })?.offers ?? [];
          for (const r of raw) {
            const o = r as {
              title?: string;
              price?: number;
              rating?: number;
              reviews?: number;
              photos?: string[];
            };
            const title = (o.title ?? "").trim();
            const key = title.toLowerCase();
            if (!title || key.length < 4 || seen.has(key)) continue;
            seen.add(key);
            counter++;
            const firstPhoto = Array.isArray(o.photos) ? o.photos[0] : undefined;
            const offer: Offer = {
              id: `bu-${s.sessionId.slice(0, 6)}-${counter}`,
              title,
              neighborhood: s.target.name,
              addressLine: `${s.target.name}, San Francisco, CA`,
              photoUrl: firstPhoto ?? "",
              source: "Airbnb",
              originalPrice: Number(o.price) || 0,
              beds: 1,
              baths: 1,
              guests: 2,
              rating: Number(o.rating) || 0,
              reviews: Number(o.reviews) || 0,
              amenities: [],
              tier: "normal",
              expectedDiscountPct: 12,
              pros: [],
            };

            yield offer;
          }
        } else if (
          detail.status === "error" ||
          detail.status === "timed_out"
        ) {
          s.done = true;
        }
      }
    }
  },
};
