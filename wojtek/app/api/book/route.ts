import { payments } from "@/providers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { offerId, amount } = await req.json();
  const result = await payments.checkout(offerId, amount);
  return Response.json(result);
}
