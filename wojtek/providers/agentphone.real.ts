import type { AgentPhoneProvider, CallChunk } from "./types";
import type { Offer } from "@/lib/types";
import { moss } from ".";

const API = "https://api.agentphone.ai/v1";

/**
 * The AgentPhone agent runs as the GUEST/CUSTOMER calling the listing's owner.
 * We override the agent's dashboard system prompt per-call so the negotiation
 * playbook is consistent across every property.
 *
 * The "marketContext" is pulled from Moss (prior negotiations in this
 * neighborhood) so the agent knows what discounts to anchor on.
 */
function negotiationPrompt(offer: Offer, marketContext: string): string {
  return [
    `You are calling the host of an Airbnb listing on behalf of a potential guest.`,
    `You ARE the guest. You are NOT the host. Introduce yourself briefly as "Alex".`,
    ``,
    `Listing: "${offer.title}" in ${offer.neighborhood}, San Francisco.`,
    `Listed at $${offer.price}/night. You want 3 nights (June 16-18).`,
    `Goal: negotiate the lowest possible nightly price.`,
    ``,
    marketContext
      ? `Market context (from prior negotiations in this neighborhood):\n${marketContext}\n`
      : ``,
    `Voice & style:`,
    `- warm, friendly, conversational, persistent`,
    `- short sentences, contractions, casual acks ("yeah", "gotcha", "right")`,
    `- never read URLs or numbers letter-by-letter, never spell things out`,
    `- one sentence at a time, then wait for them to respond`,
    ``,
    `Negotiation playbook (use whichever fits, don't dump them all at once):`,
    `- booking directly saves them the ~15% Airbnb fee, win-win`,
    `- 3 nights is a solid block, not a weekend turnover`,
    `- you're flexible on dates / could extend to 4 nights`,
    `- you'd pay cash, instant confirm, no Airbnb risk`,
    `- politely ask "any flexibility on the price?" when they push back`,
    `- aim for at least 10% off, ideally 20%`,
    ``,
    `When you have a final number (or they firmly refuse to budge), confirm:`,
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
    const txt = await res.text().catch(() => "");
    throw new Error(`agentphone ${res.status} ${path}: ${txt.slice(0, 300)}`);
  }
  return res;
}

async function startCall(offer: Offer, systemPrompt: string): Promise<string> {
  const agentId = process.env.AGENTPHONE_AGENT_ID;
  if (!agentId) throw new Error("AGENTPHONE_AGENT_ID missing");
  const res = await ap("/calls", {
    method: "POST",
    body: JSON.stringify({
      agentId,
      toNumber: offer.ownerPhone,
      systemPrompt,
      initialGreeting: `Hi, I saw your listing in ${offer.neighborhood} — got a quick minute?`,
    }),
  });
  const data = (await res.json()) as { id: string };
  return data.id;
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

export const realAgentPhone: AgentPhoneProvider = {
  async *call(offer: Offer, task: string): AsyncIterable<CallChunk> {
    // 1. Moss-backed retrieval — prior negotiations in this neighborhood
    //    become live market context inside the agent's prompt.
    const priorRuns = await moss
      .query(`neighborhood:${offer.neighborhood}`)
      .catch(() => [] as unknown[]);
    const marketContext = priorRuns
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

    const systemPrompt = `${task ? task + "\n\n" : ""}${negotiationPrompt(
      offer,
      marketContext,
    )}`;

    // 2. Initiate the outbound call.
    yield { type: "status", status: "ringing" };
    const callId = await startCall(offer, systemPrompt);
    yield { type: "status", status: "negotiating" };

    // 3. Stream the transcript.
    const transcript: { speaker: "agent" | "owner"; text: string; ts: number }[] = [];
    let negotiatedDiscount = 0;

    const streamRes = await ap(`/calls/${callId}/transcript/stream`, {
      headers: { Accept: "text/event-stream" },
    });

    for await (const { event, data } of parseSSE(streamRes)) {
      if (event === "ended") break;
      const d = data as {
        role?: string;
        speaker?: string;
        content?: string;
        text?: string;
      };
      const role = d.role ?? d.speaker;
      const text = d.content ?? d.text;
      if (!role || !text) continue;
      const speaker: "agent" | "owner" =
        role === "agent" || role === "assistant" ? "agent" : "owner";
      const chunk = { speaker, text, ts: Date.now() };
      transcript.push(chunk);
      yield { type: "transcript", chunk };

      const m = text.match(/(?:-|down|off|discount)\s*(\d{1,2})\s*%/i);
      if (m && speaker === "owner") {
        const pct = parseInt(m[1], 10);
        if (pct > negotiatedDiscount) {
          negotiatedDiscount = pct;
          yield { type: "discount", percent: pct };
        }
      }
    }

    // 4. Moss-backed write — persist the outcome so future calls in this
    //    neighborhood get smarter market context on the next run.
    const finalPrice = negotiatedDiscount
      ? Math.round(offer.price * (1 - negotiatedDiscount / 100))
      : offer.price;
    await moss
      .store(`call:${offer.id}:${callId}`, {
        offerId: offer.id,
        neighborhood: offer.neighborhood,
        originalPrice: offer.price,
        finalPrice,
        negotiatedDiscount,
        transcript,
        ts: Date.now(),
      })
      .catch(() => {});

    yield { type: "status", status: "done" };
  },
};
