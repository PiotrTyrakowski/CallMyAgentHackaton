import type { AgentPhoneProvider, CallChunk } from "./types";
import type { Offer } from "@/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function scriptFor(offer: Offer, willDiscount: boolean, percent: number) {
  const lines: Array<{ speaker: "agent" | "owner"; text: string }> = [
    { speaker: "agent", text: `Hi, calling about ${offer.title}.` },
    { speaker: "owner", text: `Yeah, what's up?` },
    {
      speaker: "agent",
      text: `Looking for 3 nights, 16th-18th. Listed at $${offer.price}/night — any flexibility?`,
    },
  ];
  if (willDiscount) {
    lines.push(
      { speaker: "owner", text: `Hmm... it's a slow week actually.` },
      {
        speaker: "agent",
        text: `I can book right now if we land at -${percent}%.`,
      },
      { speaker: "owner", text: `Tell you what — deal. Send the booking.` },
    );
  } else {
    lines.push(
      { speaker: "owner", text: `Price is firm. High season.` },
      { speaker: "agent", text: `Understood, I'll get back to you.` },
    );
  }
  return lines;
}

export const mockAgentPhone: AgentPhoneProvider = {
  async *call(offer: Offer, _task: string): AsyncIterable<CallChunk> {
    yield { type: "status", status: "ringing" };
    await sleep(700 + Math.random() * 500);

    yield { type: "status", status: "negotiating" };
    const willDiscount = Math.random() < 0.6;
    const percent = willDiscount ? 5 + Math.floor(Math.random() * 21) : 0;
    const lines = scriptFor(offer, willDiscount, percent);

    for (const line of lines) {
      await sleep(420 + Math.random() * 280);
      yield {
        type: "transcript",
        chunk: { speaker: line.speaker, text: line.text, ts: Date.now() },
      };
    }

    if (willDiscount) {
      await sleep(200);
      yield { type: "discount", percent };
    }
    await sleep(150);
    yield { type: "status", status: "done" };
  },
};
