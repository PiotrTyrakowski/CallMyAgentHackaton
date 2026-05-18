import { agentphone, moss } from "@/providers";
import type { Offer } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { offer, task } = (await req.json()) as { offer: Offer; task: string };
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const transcriptBuf: unknown[] = [];
      let negotiatedDiscount = 0;
      try {
        for await (const chunk of agentphone.call(offer, task)) {
          if (chunk.type === "transcript") transcriptBuf.push(chunk.chunk);
          if (chunk.type === "discount") negotiatedDiscount = chunk.percent;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
          );
        }

        // Moss harness: persist this call's outcome for future retrieval.
        // Even when the AgentPhone adapter is mocked, the call route writes
        // through to Moss so the retrieval layer is exercised end-to-end.
        const finalPrice = negotiatedDiscount
          ? Math.round(offer.price * (1 - negotiatedDiscount / 100))
          : offer.price;
        await moss
          .store(`call:${offer.id}:${Date.now()}`, {
            offerId: offer.id,
            neighborhood: offer.neighborhood,
            originalPrice: offer.price,
            finalPrice,
            negotiatedDiscount,
            transcript: transcriptBuf,
            ts: Date.now(),
          })
          .catch(() => {});
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
