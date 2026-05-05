import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
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
