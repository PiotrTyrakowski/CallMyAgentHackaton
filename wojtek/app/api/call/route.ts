import { agentphone } from "@/providers";
import type { Offer } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { offer, task } = (await req.json()) as { offer: Offer; task: string };
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of agentphone.call(offer, task)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
          );
        }
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
