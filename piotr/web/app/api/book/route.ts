import { mockPaymentsProvider } from "@/lib/providers/mockPayments";
import { spongePaymentsProvider } from "@/lib/providers/spongePayments";
import type { BookingRequest } from "@/lib/providers/PaymentsProvider";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as BookingRequest;

  // Auto-detect: real Sponge virtual-card issuance when SPONGE_API_KEY is set,
  // otherwise the local mock so the demo always works offline.
  const provider = process.env.SPONGE_API_KEY
    ? spongePaymentsProvider
    : mockPaymentsProvider;

  try {
    const result = await provider.checkout(body);
    return Response.json(result);
  } catch (e) {
    return new Response(
      JSON.stringify({ status: "failed", error: String(e) }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
