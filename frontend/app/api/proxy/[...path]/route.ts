import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

type Ctx = { params: Promise<{ path: string[] }> };

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

  if (!process.env.FASTAPI_URL) {
    return NextResponse.json({ error: "Backend not configured" }, { status: 503 });
  }

  const { path } = await ctx.params;
  const search = req.nextUrl.search;
  const url = `${process.env.FASTAPI_URL}/${path.join("/")}${search}`;
  const hasBody = method !== "GET" && method !== "DELETE";
  const body = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined;
  const contentType = req.headers.get("content-type") ?? "application/json";
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": contentType,
      "X-API-Key": process.env.INTERNAL_API_KEY ?? "",
      "X-User-Id": session.user.id,
    },
    body,
  });

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
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
