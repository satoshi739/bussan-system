import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserSubscription, hasAccess } from "@/lib/subscription";

type Ctx = { params: Promise<{ path: string[] }> };

// STANDARDプラン以上が必要なパスプレフィックス
const STANDARD_PATHS = ["scan", "watchlist", "reports", "notify", "fba", "fulfillment", "monitor"];
// PROプラン以上が必要なパスプレフィックス
const PRO_PATHS = ["agents"];

export async function GET(req: NextRequest, ctx: Ctx) {
  return forward(req, ctx, "GET");
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return forward(req, ctx, "POST");
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return forward(req, ctx, "PATCH");
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return forward(req, ctx, "DELETE");
}

async function forward(req: NextRequest, ctx: Ctx, method: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await ctx.params;
  const topPath = path[0] ?? "";

  const needsStandard = STANDARD_PATHS.includes(topPath);
  const needsPro = PRO_PATHS.includes(topPath);

  if (needsStandard || needsPro) {
    const sub = await getUserSubscription();
    const plan = sub?.plan ?? "FREE";
    if (needsPro && !hasAccess(plan, "PRO")) {
      return NextResponse.json({ error: "この機能はProプラン以上でご利用いただけます" }, { status: 403 });
    }
    if (needsStandard && !hasAccess(plan, "STANDARD")) {
      return NextResponse.json({ error: "この機能はStandardプラン以上でご利用いただけます" }, { status: 403 });
    }
  }

  if (!process.env.FASTAPI_URL) {
    return NextResponse.json({ error: "Backend not configured" }, { status: 503 });
  }

  const search = req.nextUrl.search;
  const url = `${process.env.FASTAPI_URL}/${path.join("/")}${search}`;
  const hasBody = method !== "GET" && method !== "DELETE";
  const body = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined;
  const contentType = req.headers.get("content-type") ?? "application/json";
  const isSSE = url.includes("/stream") || url.includes("sse");
  const timeoutMs = isSSE ? 120_000 : 20_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        "Content-Type": contentType,
        "X-API-Key": process.env.INTERNAL_API_KEY ?? "",
        "X-User-Id": session.user.id,
      },
      body,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    const isAbort = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { error: isAbort ? "バックエンドへの接続がタイムアウトしました" : "バックエンドに接続できませんでした" },
      { status: 504 }
    );
  }
  clearTimeout(timer);

  // SSEストリームはそのまま転送する
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("text/event-stream")) {
    return new NextResponse(res.body, {
      status: res.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  }

  const data = await res.text();
  const responseContentType = res.headers.get("content-type") ?? "application/json";
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": responseContentType.includes("json") ? "application/json" : responseContentType },
  });
}
