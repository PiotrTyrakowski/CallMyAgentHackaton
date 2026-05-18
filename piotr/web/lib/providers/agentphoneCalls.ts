import type { CallEvent, Offer } from "../types";
import type { CallProvider } from "./CallProvider";
import { moss } from "./moss";

/**
 * Real AgentPhone outbound caller. Wraps POST /v1/calls with a per-call
 * system prompt override so the agent acts as the GUEST negotiating with the
 * listing owner. Streams the transcript via /transcript/stream (SSE).
 *
 * Moss harness:
 *   - pre-call: query prior negotiations in this neighborhood, splice into the
 *     agent's prompt as live "market context"
 *   - post-call: store the outcome so the next call learns
 *
 * Env:
 *   AGENTPHONE_API_KEY
 *   AGENTPHONE_AGENT_ID
 */

const API = "https://api.agentphone.ai/v1";

function negotiationPrompt(offer: Offer, marketContext: string): string {
  return [
    `You are calling the host of an Airbnb listing on behalf of a potential guest.`,
    `You ARE the guest. You are NOT the host. Introduce yourself briefly as "Alex".`,
    ``,
    `Listing: "${offer.title}" in ${offer.neighborhood}, San Francisco.`,
    `Listed at $${offer.originalPrice}/night. You want 3 nights (June 16-18).`,
    `Goal: negotiate the lowest possible nightly price.`,
    ``,
    marketContext
      ? `Market context (from prior negotiations in this neighborhood):\n${marketContext}\n`
      : ``,
    `Voice & style:`,
    `- warm, friendly, conversational, persistent`,
    `- short sentences, contractions, casual acks ("yeah", "gotcha", "right")`,
    `- one sentence at a time, then wait for them to respond`,
    ``,
    `Negotiation playbook (mix as needed):`,
    `- booking directly saves them the ~15% Airbnb fee, win-win`,
    `- 3 nights is a solid block, not a weekend turnover`,
    `- you're flexible / could extend to 4 nights`,
    `- you'd pay cash, instant confirm`,
    `- politely ask "any flexibility on the price?" when they push back`,
    `- aim for at least 10% off, ideally 20%`,
    ``,
    `When you have a final number, say:`,
    `"Great, that works — I'll send the booking confirmation. Thanks so much."`,
    `Then end the call. Keep the whole call under 90 seconds.`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function ap(path: string, init?: RequestInit) {
  const key = process.env.AGENTPHONE_API_KEY;
  if (!key) throw new Error("AGENTPHONE_API_KEY missing");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(
      `agentphone ${res.status} ${path}: ${(await res.text()).slice(0, 200)}`,
    );
  }
  return res;
}

async function* parseSSE(
  res: Response,
): AsyncGenerator<{ event: string; data: unknown }> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const blocks = buf.split("\n\n");
    buf = blocks.pop() ?? "";
    for (const block of blocks) {
      let evt = "message";
      let raw = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) evt = line.slice(6).trim();
        else if (line.startsWith("data:")) raw += line.slice(5).trim();
      }
      if (!raw) continue;
      let data: unknown = raw;
      try {
        data = JSON.parse(raw);
      } catch {}
      yield { event: evt, data };
    }
  }
}

export const agentPhoneCallProvider: CallProvider = {
  async *call(offer: Offer): AsyncIterable<CallEvent> {
    const agentId = process.env.AGENTPHONE_AGENT_ID;
    if (!agentId) throw new Error("AGENTPHONE_AGENT_ID missing");

    // 1. Moss enrichment — prior negotiations in this neighborhood.
    const prior = await moss
      .query(`neighborhood:${offer.neighborhood}`)
      .catch(() => [] as unknown[]);
    const marketContext = prior
      .slice(0, 5)
      .map((r) => {
        const x = r as { originalPrice?: number; finalPrice?: number };
        if (x?.originalPrice && x?.finalPrice) {
          return `- prior listing went from $${x.originalPrice} → $${x.finalPrice}`;
        }
        return null;
      })
      .filter(Boolean)
      .join("\n");

    const systemPrompt = negotiationPrompt(offer, marketContext);

    yield {
      offerId: offer.id,
      status: "ringing",
      currentPrice: offer.originalPrice,
      negotiatedDiscount: 0,
    };

    // 2. Initiate the call. Owner phone numbers aren't part of piotr's Offer
    // schema, so we look them up via env (a tiny mapping the hackathon ops
    // person can populate per listing). Falls back to AGENTPHONE_TEST_NUMBER
    // for the demo.
    const phoneMap = process.env.AGENTPHONE_PHONE_MAP
      ? (JSON.parse(process.env.AGENTPHONE_PHONE_MAP) as Record<string, string>)
      : {};
    const toNumber =
      phoneMap[offer.id] ?? process.env.AGENTPHONE_TEST_NUMBER ?? "";
    if (!toNumber) throw new Error(`no phone number for offer ${offer.id}`);

    const callRes = await ap("/calls", {
      method: "POST",
      body: JSON.stringify({
        agentId,
        toNumber,
        systemPrompt,
        initialGreeting: `Hi, I saw your listing in ${offer.neighborhood} — got a quick minute?`,
      }),
    });
    const callData = (await callRes.json()) as { id: string };
    const callId = callData.id;

    // 3. Stream transcript.
    const transcript: { role: string; text: string }[] = [];
    let discount = 0;
    let currentPrice = offer.originalPrice;
    const streamRes = await ap(`/calls/${callId}/transcript/stream`);

    for await (const { event, data } of parseSSE(streamRes)) {
      if (event === "ended") break;
      const d = data as { role?: string; content?: string };
      if (!d.role || !d.content) continue;
      transcript.push({ role: d.role, text: d.content });

      const m = d.content.match(/(?:-|down|off|discount)\s*(\d{1,2})\s*%/i);
      if (m && d.role !== "agent" && d.role !== "assistant") {
        const pct = parseInt(m[1], 10);
        if (pct > discount) {
          discount = pct;
          currentPrice = Math.round(offer.originalPrice * (1 - pct / 100));
          yield {
            offerId: offer.id,
            status: "negotiating",
            currentPrice,
            negotiatedDiscount: discount,
          };
        }
      }
    }

    // 4. Moss store outcome.
    await moss
      .store(`call:${offer.id}:${callId}`, {
        offerId: offer.id,
        neighborhood: offer.neighborhood,
        originalPrice: offer.originalPrice,
        finalPrice: currentPrice,
        negotiatedDiscount: discount,
        transcript,
        ts: Date.now(),
      })
      .catch(() => {});

    yield {
      offerId: offer.id,
      status: "done",
      currentPrice,
      negotiatedDiscount: discount,
    };
  },
};
