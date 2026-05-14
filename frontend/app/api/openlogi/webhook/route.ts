import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Openlogi → 自社 Webhook 受信のパススルー。認証ガード外。
// 署名検証はバックエンド側で行うため、ここでは body を byte 単位で透過転送する。
export async function POST(req: NextRequest) {
  const fastapiUrl = process.env.FASTAPI_URL;
  if (!fastapiUrl) {
    console.error("[openlogi-webhook] FASTAPI_URL is not set");
    return NextResponse.json({ error: "Backend not configured" }, { status: 503 });
  }

  // HMAC 検証のため body を変換せず byte で受け渡す
  const rawBody = Buffer.from(await req.arrayBuffer());

  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") ?? "application/json",
    "X-API-Key": process.env.INTERNAL_API_KEY ?? "",
  };
  const sig = req.headers.get("x-openlogi-signature") ?? req.headers.get("x-signature");
  if (sig) headers["X-Openlogi-Signature"] = sig;

  let res: Response;
  try {
    res = await fetch(`${fastapiUrl}/api/fulfillment/webhooks/openlogi`, {
      method: "POST",
      headers,
      body: rawBody,
    });
  } catch (err) {
    console.error("[openlogi-webhook] backend forward failed:", err);
    return NextResponse.json({ error: "Forward failed" }, { status: 502 });
  }

  const respBody = await res.text();
  return new NextResponse(respBody, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}
