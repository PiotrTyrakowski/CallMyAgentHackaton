import { mockCallProvider } from "@/lib/providers/mockCalls";
import { agentPhoneCallProvider } from "@/lib/providers/agentphoneCalls";
import type { Offer } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { offer } = (await req.json()) as { offer: Offer };

  // Auto-detect: real AgentPhone call when both API key + agent id are set.
  // Otherwise fall back to the scripted mock so the demo runs offline.
  const provider =
    process.env.AGENTPHONE_API_KEY && process.env.AGENTPHONE_AGENT_ID
      ? agentPhoneCallProvider
      : mockCallProvider;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of provider.call(offer)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ kind: "done" })}\n\n`),
        );
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              kind: "error",
              message: String(e),
            })}\n\n`,
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
