export const runtime = "nodejs";

const API = "https://api.agentphone.ai/v1";

export async function POST() {
  const key = process.env.AGENTPHONE_API_KEY;
  const agentId = process.env.AGENTPHONE_AGENT_ID;
  if (!key || !agentId) {
    return new Response(
      JSON.stringify({ error: "AGENTPHONE_API_KEY or AGENTPHONE_AGENT_ID missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  const res = await fetch(`${API}/calls/web`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ agentId }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `agentphone ${res.status}: ${txt.slice(0, 400)}` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
  const data = await res.json();
  return Response.json(data);
}
