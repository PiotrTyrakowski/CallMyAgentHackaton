import type { BrowserUseProvider, SearchEvent } from "./types";
import type { Offer } from "@/lib/types";

const API = "https://api.browser-use.com/api/v3";

// SF neighborhoods to fan out across. Each becomes its own parallel
// browser-use session. Pre-known lat/lng so we don't depend on the agent.
const TARGETS: Array<{ name: string; lat: number; lng: number }> = [
  { name: "Pacific Heights", lat: 37.7925, lng: -122.4382 },
  { name: "Mission District", lat: 37.7599, lng: -122.4148 },
  { name: "Castro", lat: 37.7609, lng: -122.435 },
  { name: "SoMa", lat: 37.7785, lng: -122.3948 },
  { name: "Nob Hill", lat: 37.793, lng: -122.4161 },
  { name: "Marina District", lat: 37.8021, lng: -122.4368 },
  { name: "Hayes Valley", lat: 37.7766, lng: -122.4244 },
  { name: "North Beach", lat: 37.806, lng: -122.4103 },
  { name: "Russian Hill", lat: 37.8013, lng: -122.4185 },
  { name: "Haight-Ashbury", lat: 37.7692, lng: -122.4481 },
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
          originalPrice: { type: "number" },
          rating: { type: "number" },
          reviews: { type: "integer" },
          amenities: { type: "array", items: { type: "string" } },
          photos: { type: "array", items: { type: "string" } },
        },
        required: ["title", "price", "rating"],
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
    throw new Error(`browser-use ${res.status} ${path}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

function tryParseOffers(output: unknown): Array<Partial<Offer>> | null {
  if (output == null) return null;
  if (typeof output === "object") {
    const o = output as { offers?: unknown };
    if (Array.isArray(o.offers)) return o.offers as Array<Partial<Offer>>;
    return null;
  }
  if (typeof output === "string") {
    const tryJson = (s: string) => {
      try {
        const p = JSON.parse(s);
        return Array.isArray(p.offers) ? p.offers : null;
      } catch {
        return null;
      }
    };
    const direct = tryJson(output);
    if (direct) return direct;
    const fence = output.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
    if (fence) return tryJson(fence[1]);
  }
  return null;
}

function taskFor(neighborhood: string, query: string): string {
  const slug = neighborhood.replace(/\s+/g, "-");
  const url = `https://www.airbnb.com/s/${encodeURIComponent(slug)}--San-Francisco--CA/homes`;
  return [
    `You are a short-term rental scraper. The user asked: "${query}".`,
    `Open this URL: ${url}`,
    `Grab the FIRST 2 distinct listings from the search results.`,
    `Don't scroll, don't open detail pages, don't navigate further.`,
    ``,
    `For each listing return EXACTLY these fields:`,
    ``,
    `- title: the actual property/listing name in BOLD at the top of the card (e.g. "Sunlit Victorian Studio", "Modern Loft with View"). DO NOT use the bed description ("1 queen bed"), DO NOT use "Show price breakdown", DO NOT use button text. If you only see a generic descriptor, use the LISTING SUBTITLE that describes the property.`,
    ``,
    `- price: nightly price in USD as a plain integer. Look for "$XXX night" or "$XXX per night". Do NOT capture the total price for the whole stay.`,
    ``,
    `- originalPrice: if a strike-through pre-discount price is visible right next to the price, capture it; otherwise OMIT the field entirely`,
    ``,
    `- rating: the star rating like 4.78 (a number between 3.0 and 5.0)`,
    ``,
    `- reviews: integer review count shown in parentheses after the rating (e.g. "4.92 (87)" -> 87)`,
    ``,
    `- amenities: pick 3 features visible on the card (e.g. "Self check-in", "Wifi", "Kitchen", "Pool", "Pets allowed")`,
    ``,
    `- photos: 1-2 absolute https image URLs of the LISTING'S MAIN HERO PHOTO — the big rectangular photo at the top of the listing card showing the room/interior/exterior. Critical rules:`,
    `   • URL MUST start with "https://a0.muscache.com/im/pictures/"`,
    `   • URL MUST contain the substring "Hosting-" OR be a raw UUID pattern like "/im/pictures/{uuid}.jpg"`,
    `   • URL MUST NOT contain "/user/" or "/avatars/" (host profile pictures)`,
    `   • URL MUST NOT contain "airbnb-platform-assets", "badges", "icons", "promo", "GuestFavorite", "Superhost", "trophy" or any other badge/icon paths`,
    `   • Skip any image smaller than a hero photo (badges, awards, trophy icons, app store buttons, etc.)`,
    `   • If you cannot find a clean listing photo URL meeting these criteria, OMIT the photos field for that listing entirely`,
    ``,
    `Skip listings with no rating. Skip listings whose only image is a host avatar. Stop after 2 listings. Return ONLY the JSON.`,
  ].join("\n");
}

// URL patterns we DON'T want — host avatars, badges, icons, promo assets, etc.
const PHOTO_DENYLIST = [
  /\/user\//i,
  /\/users\//i,
  /\/avatars?\//i,
  /\bprofile\b/i,
  /airbnb-platform-assets/i,
  /\/badges?\//i,
  /\/icons?\//i,
  /\/promo\//i,
  /GuestFavorite/i,
  /Superhost/i,
  /trophy/i,
  /award/i,
  /logo/i,
];

// URL patterns we DO want for real Airbnb listing photos.
const PHOTO_ALLOWLIST = [
  /Hosting-\d+/i,                              // /pictures/miso/Hosting-12345/...
  /prohost-api/i,                              // /pictures/prohost-api/Hosting-...
  /\/pictures\/[a-f0-9-]{30,}\.(jpe?g|png|webp)/i, // raw UUID listing photos
  /\/pictures\/miso\//i,                       // miso bucket = listing media
];

function isLikelyListingPhoto(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (!url.startsWith("https://a0.muscache.com/")) return false;
  if (PHOTO_DENYLIST.some((re) => re.test(url))) return false;
  if (!PHOTO_ALLOWLIST.some((re) => re.test(url))) return false;
  return true;
}

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

interface Session {
  target: (typeof TARGETS)[number];
  sessionId: string;
  liveUrl?: string;
  done: boolean;
  yielded: number;
}

export const realBrowserUse: BrowserUseProvider = {
  async *searchOffers(query: string): AsyncIterable<SearchEvent> {
    if (!process.env.BROWSERUSE_API_KEY) {
      throw new Error("BROWSERUSE_API_KEY missing in env");
    }

    yield {
      kind: "action",
      message: `spawning ${TARGETS.length} parallel browser agents…`,
    };

    // 1. Create sessions one-by-one with a small stagger — bursts of 10+
    //    POST /sessions in <1s trigger 429 rate limits on the API.
    const sessions: Session[] = [];
    for (const target of TARGETS) {
      try {
        const created = await bu("/sessions", {
          method: "POST",
          body: JSON.stringify({
            task: taskFor(target.name, query),
            model: "bu-mini",
            output_schema: OUTPUT_SCHEMA,
          }),
        });
        sessions.push({
          target,
          sessionId: created.id as string,
          liveUrl: created.live_url as string | undefined,
          done: false,
          yielded: 0,
        });
      } catch (e) {
        yield {
          kind: "action",
          message: `${target.name}: failed to start (${String(e).slice(0, 80)})`,
        };
      }
      await sleep(250);
    }

    if (sessions.length === 0) {
      throw new Error("failed to start any browser-use sessions");
    }

    // Emit the first session's liveUrl so UI gets a "watch live" link.
    yield {
      kind: "session",
      sessionId: sessions[0].sessionId,
      liveUrl: sessions[0].liveUrl,
    };
    yield {
      kind: "action",
      message: `${sessions.length} agents running across ${sessions.map((s) => s.target.name).slice(0, 4).join(", ")}…`,
    };

    // 2. Poll all sessions until each is terminal.
    const start = Date.now();
    const MAX_MS = 5 * 60 * 1000;
    let offerCounter = 0;
    let totalCost = 0;
    const seenTitles = new Set<string>();

    while (sessions.some((s) => !s.done)) {
      const elapsed = Math.round((Date.now() - start) / 1000);
      if (Date.now() - start > MAX_MS) {
        yield {
          kind: "action",
          message: `timed out after 5 min — ${sessions.filter((s) => s.done).length}/${sessions.length} agents finished`,
        };
        break;
      }

      await sleep(3000);

      // Poll every still-running session in parallel.
      const updates = await Promise.all(
        sessions.map(async (s) => {
          if (s.done) return null;
          try {
            const detail = await bu(`/sessions/${s.sessionId}`);
            return { session: s, detail };
          } catch (e) {
            return { session: s, error: String(e) };
          }
        }),
      );

      for (const u of updates) {
        if (!u) continue;
        if ("error" in u) {
          u.session.done = true;
          yield {
            kind: "action",
            message: `${u.session.target.name}: error · ${u.error?.slice(0, 80)}`,
          };
          continue;
        }
        const { session: s, detail } = u;
        const status = detail.status as string;
        const cost = parseFloat(detail.totalCostUsd ?? "0");
        if (!isNaN(cost)) totalCost += cost - (s as { _cost?: number })._cost!;
        (s as { _cost?: number })._cost = isNaN(cost) ? 0 : cost;

        if (status === "idle" || status === "stopped") {
          s.done = true;
          const raw = tryParseOffers(detail.output) ?? [];
          let yielded = 0;
          let skipped = 0;
          for (const r of raw) {
            const rawTitle = (r.title ?? "").toString().trim();
            const cleanTitle = rawTitle.replace(/^[\s·•]+/, "");
            const titleKey = normalizeTitle(cleanTitle);

            // dedupe by normalized title (across all sessions)
            if (!titleKey || seenTitles.has(titleKey)) {
              skipped++;
              continue;
            }
            // reject junk titles agent sometimes returns
            if (
              /^show price breakdown$/i.test(cleanTitle) ||
              /^\d+ (queen|king|twin|bed)/i.test(cleanTitle) ||
              cleanTitle.length < 4
            ) {
              skipped++;
              continue;
            }
            seenTitles.add(titleKey);

            // filter photos to drop avatars/junk
            const rawPhotos = Array.isArray(r.photos) ? (r.photos as string[]) : [];
            const cleanPhotos = rawPhotos.filter(isLikelyListingPhoto);
            if (cleanPhotos.length === 0) {
              skipped++;
              continue;
            }

            offerCounter++;
            yielded++;
            const offer: Offer = {
              id: `bu-${s.sessionId.slice(0, 6)}-${yielded}`,
              title: cleanTitle,
              neighborhood: s.target.name,
              price: Number(r.price) || 0,
              originalPrice:
                r.originalPrice != null && Number(r.originalPrice) > 0
                  ? Number(r.originalPrice)
                  : undefined,
              rating: Number(r.rating) || 0,
              reviews: Number(r.reviews) || 0,
              emoji: "🏠",
              amenities: Array.isArray(r.amenities) ? r.amenities : [],
              photos: cleanPhotos,
              lat: s.target.lat,
              lng: s.target.lng,
              callStatus: "idle",
              transcript: [],
              tier: "normal",
              ownerPhone: `+1 (415) 555-0${String(100 + offerCounter).padStart(3, "0")}`,
            };
            yield { kind: "offer", offer };
          }
          yield {
            kind: "action",
            message: `${s.target.name}: done · ${yielded} kept${skipped > 0 ? `, ${skipped} skipped` : ""}`,
          };
        } else if (status === "error" || status === "timed_out") {
          s.done = true;
          yield {
            kind: "action",
            message: `${s.target.name}: ${status}`,
          };
        }
      }

      const doneCount = sessions.filter((s) => s.done).length;
      const runningCount = sessions.length - doneCount;
      yield {
        kind: "status",
        status:
          runningCount > 0
            ? `${doneCount}/${sessions.length} agents done · ${offerCounter} listings`
            : "complete",
        elapsedSeconds: elapsed,
        costUsd: totalCost > 0 ? totalCost : undefined,
      };
    }
  },
};
