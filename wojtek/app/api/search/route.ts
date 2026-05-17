import { browseruse } from "@/providers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { query } = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const offer of browseruse.searchOffers(query)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "offer", offer })}\n\n`),
          );
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
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
