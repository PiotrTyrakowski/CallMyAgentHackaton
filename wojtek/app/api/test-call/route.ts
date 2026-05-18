import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const API = "https://api.agentphone.ai/v1";

interface Body {
  numbers: string[];
  task: string;
  initialGreeting?: string;
}

async function startCall(toNumber: string, task: string, greeting?: string) {
  const key = process.env.AGENTPHONE_API_KEY;
  const agentId = process.env.AGENTPHONE_AGENT_ID;
  if (!key) throw new Error("AGENTPHONE_API_KEY missing");
  if (!agentId) throw new Error("AGENTPHONE_AGENT_ID missing");

  const res = await fetch(`${API}/calls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agentId,
      toNumber,
      systemPrompt: task,
      initialGreeting: greeting,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`agentphone POST /calls ${res.status}: ${txt.slice(0, 400)}`);
  }
  return res.json();
}

async function pipeTranscript(
  callId: string,
  idx: number,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
) {
  const key = process.env.AGENTPHONE_API_KEY!;
  const res = await fetch(`${API}/calls/${callId}/transcript/stream`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "text/event-stream" },
  });
  if (!res.body) {
    controller.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({ idx, type: "error", payload: "no stream body" })}\n\n`,
      ),
    );
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let currentEvent = "message";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split(/\n\n/);
    buf = parts.pop() ?? "";
    for (const block of parts) {
      const lines = block.split("\n");
      let dataPayload: string | null = null;
      let eventName = "message";
      for (const line of lines) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:"))
          dataPayload = (dataPayload ?? "") + line.slice(5).trim();
      }
      currentEvent = eventName;
      if (dataPayload) {
        let parsed: unknown = dataPayload;
        try {
          parsed = JSON.parse(dataPayload);
        } catch {}
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              idx,
              type: currentEvent,
              payload: parsed,
            })}\n\n`,
          ),
        );
        if (eventName === "ended") return;
      }
    }
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const numbers = (body.numbers ?? []).filter(Boolean).slice(0, 4);
  if (numbers.length === 0) {
    return new Response(JSON.stringify({ error: "no numbers" }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // 1. initiate every call in parallel
        const started = await Promise.all(
          numbers.map(async (n, idx) => {
            try {
              const data = await startCall(n, body.task, body.initialGreeting);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    idx,
                    type: "started",
                    payload: { toNumber: n, ...data },
                  })}\n\n`,
                ),
              );
              return { idx, callId: data.id ?? data.callId ?? data.call_id };
            } catch (e) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    idx,
                    type: "error",
                    payload: String(e),
                  })}\n\n`,
                ),
              );
              return null;
            }
          }),
        );

        // 2. pipe transcripts in parallel
        await Promise.all(
          started
            .filter(
              (s): s is { idx: number; callId: string } =>
                s != null && !!s.callId,
            )
            .map((s) =>
              pipeTranscript(s.callId, s.idx, controller, encoder).catch((e) =>
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      idx: s.idx,
                      type: "error",
                      payload: String(e),
                    })}\n\n`,
                  ),
                ),
              ),
            ),
        );

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "all-done" })}\n\n`),
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
