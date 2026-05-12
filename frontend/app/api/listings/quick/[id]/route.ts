import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

async function ensureOwn(userId: string, id: string) {
  const found = await prisma.quickListing.findUnique({ where: { id } });
  if (!found || found.userId !== userId) return null;
  return found;
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const item = await ensureOwn(session.user.id, id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, item });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const owned = await ensureOwn(session.user.id, id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  // 許可フィールドのみ反映
  const allowed = [
    "productName", "sourceUrl", "buyPrice", "estPrice", "condition", "category",
    "notes", "weightG", "sizeCode", "imageUrls",
    "aiTitle", "aiDescription", "aiCategories", "aiKeywords",
    "aiSuggestedPrice", "aiProfitEstimate", "aiShippingEstimate", "aiWarnings",
    "targetPlatform", "status",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) data[k] = body[k];
  }

  const updated = await prisma.quickListing.update({
    where: { id },
    data,
  });
  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const owned = await ensureOwn(session.user.id, id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.quickListing.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
