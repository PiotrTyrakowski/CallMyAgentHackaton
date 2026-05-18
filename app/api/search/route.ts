import { mockOfferProvider } from "@/lib/providers/mockOffers";
import { browserUseOfferProvider } from "@/lib/providers/browseruseOffers";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { query } = (await req.json()) as { query: string };

  // Auto-detect: if BROWSERUSE_API_KEY is set, do a real scrape.
  // Otherwise fall back to the local mock so the demo runs offline.
  const provider = process.env.BROWSERUSE_API_KEY
    ? browserUseOfferProvider
    : mockOfferProvider;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const offer of provider.search(query)) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ kind: "offer", offer })}\n\n`,
            ),
          );
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ kind: "done" })}\n\n`),
        );
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ kind: "error", message: String(e) })}\n\n`,
          ),
        );
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
