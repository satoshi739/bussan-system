import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Fail-Closed: シークレット未設定なら一律拒否（undefined 一致を防ぐ）
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/keepalive] CRON_SECRET is not set");
    return NextResponse.json({ error: "Cron secret is not configured" }, { status: 503 });
  }
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fastapiUrl = process.env.FASTAPI_URL;
  if (!fastapiUrl) {
    return NextResponse.json({ ok: false, error: "FASTAPI_URL not set" }, { status: 503 });
  }

  try {
    const res = await fetch(`${fastapiUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json({ ok: res.ok, status: res.status, ts: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 504 });
  }
}
