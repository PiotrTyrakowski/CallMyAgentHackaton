import type { BrowserUseProvider } from "./types";
import type { Offer } from "@/lib/types";

const API = "https://api.browser-use.com/api/v3";

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    offers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          neighborhood: { type: "string" },
          price: {
            type: "number",
            description: "nightly price in USD as a plain number",
          },
          originalPrice: {
            type: "number",
            description: "pre-discount strike-through price if shown",
          },
          rating: { type: "number" },
          reviews: { type: "integer" },
          amenities: { type: "array", items: { type: "string" } },
          photos: {
            type: "array",
            items: { type: "string", description: "absolute https image URL" },
          },
          lat: { type: "number" },
          lng: { type: "number" },
        },
        required: ["title", "neighborhood", "price", "rating", "amenities"],
      },
    },
  },
  required: ["offers"],
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function bu(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "X-Browser-Use-API-Key": process.env.BROWSERUSE_API_KEY ?? "",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`browser-use ${res.status} ${path}: ${txt.slice(0, 400)}`);
  }
  return res.json();
}

function tryParseOffers(output: unknown): Array<Partial<Offer>> | null {
  if (output == null) return null;
  if (typeof output === "object" && output !== null) {
    const o = output as { offers?: unknown };
    if (Array.isArray(o.offers)) return o.offers as Array<Partial<Offer>>;
    return null;
  }
  if (typeof output === "string") {
    const tryJson = (s: string) => {
      try {
        const parsed = JSON.parse(s);
        if (parsed && Array.isArray(parsed.offers)) return parsed.offers;
        return null;
      } catch {
        return null;
      }
    };
    const direct = tryJson(output);
    if (direct) return direct;
    const fence = output.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
    if (fence) {
      const fromFence = tryJson(fence[1]);
      if (fromFence) return fromFence;
    }
  }
  return null;
}

export const realBrowserUse: BrowserUseProvider = {
  async *searchOffers(query: string): AsyncIterable<Offer> {
    if (!process.env.BROWSERUSE_API_KEY) {
      throw new Error("BROWSERUSE_API_KEY missing in env");
    }

    const task = [
      `You are a short-term rental discovery agent. The user asked:`,
      `"${query}"`,
      ``,
      `Go to https://www.airbnb.com and search for stays in San Francisco matching the query.`,
      `Browse the search results page and collect 10-14 listings. For each listing capture from the search results card (no need to open every detail page):`,
      `- title`,
      `- neighborhood (e.g. "Mission", "Pacific Heights", "SoMa")`,
      `- price: nightly price in USD as a plain number, no currency symbol`,
      `- originalPrice: if Airbnb shows a strike-through original price, capture it; otherwise omit`,
      `- rating: a number like 4.78`,
      `- reviews: integer review count`,
      `- amenities: a short list of 3-5 features visible on the card`,
      `- photos: 2-5 absolute https image URLs from the listing's photo carousel`,
      `- lat / lng: rough latitude / longitude of the neighborhood center (your best guess for SF neighborhoods)`,
      ``,
      `Skip listings with no rating or no photos. Return ONLY the requested JSON.`,
    ].join("\n");

    const created = await bu("/sessions", {
      method: "POST",
      body: JSON.stringify({
        task,
        model: "claude-sonnet-4.6",
        output_schema: OUTPUT_SCHEMA,
      }),
    });

    const sessionId = created.id as string | undefined;
    if (!sessionId) {
      throw new Error(`browser-use: no session id, got ${JSON.stringify(created)}`);
    }
    if (created.live_url) {
      console.log("[browser-use] live preview:", created.live_url);
    }

    const start = Date.now();
    const MAX_MS = 5 * 60 * 1000;
    let output: unknown = null;
    while (true) {
      if (Date.now() - start > MAX_MS) {
        throw new Error("browser-use task timed out after 5 min");
      }
      await sleep(3000);
      const s = await bu(`/sessions/${sessionId}`);
      const status = s.status as string;
      output = s.output;
      console.log(
        `[browser-use] status=${status} elapsed=${Math.round((Date.now() - start) / 1000)}s cost=$${s.llm_cost_usd ?? "?"}`,
      );
      if (status === "idle" || status === "stopped") break;
      if (status === "error" || status === "timed_out") {
        throw new Error(`browser-use task ${status}: ${JSON.stringify(s).slice(0, 400)}`);
      }
    }

    const offers = tryParseOffers(output);
    if (!offers || offers.length === 0) {
      throw new Error(
        `browser-use returned no offers — raw output: ${String(output).slice(0, 400)}`,
      );
    }

    let idx = 0;
    for (const raw of offers) {
      idx++;
      const offer: Offer = {
        id: `bu${idx}`,
        title: raw.title ?? `Listing ${idx}`,
        neighborhood: raw.neighborhood ?? "San Francisco",
        price: Number(raw.price) || 0,
        originalPrice:
          raw.originalPrice != null ? Number(raw.originalPrice) : undefined,
        rating: Number(raw.rating) || 0,
        reviews: Number(raw.reviews) || 0,
        emoji: "🏠",
        amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
        photos:
          Array.isArray(raw.photos) && raw.photos.length > 0
            ? (raw.photos as string[])
            : [`https://picsum.photos/seed/bu${idx}/600/400`],
        lat: Number(raw.lat) || 37.7749,
        lng: Number(raw.lng) || -122.4194,
        callStatus: "idle",
        transcript: [],
        tier: "normal",
        ownerPhone:
          raw.ownerPhone ??
          `+1 (415) 555-0${String(100 + idx).padStart(3, "0")}`,
      };
      await sleep(180);
      yield offer;
    }
  },
};
