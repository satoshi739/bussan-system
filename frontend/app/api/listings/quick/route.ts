import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/listings/quick?status=DRAFT
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const status = req.nextUrl.searchParams.get("status");

  const items = await prisma.quickListing.findMany({
    where: {
      userId: session.user.id,
      ...(status ? { status: status as "DRAFT" | "CONFIRMED" | "CSV_EXPORTED" | "API_PENDING" | "PUBLISHED" } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ ok: true, items });
}

// POST /api/listings/quick  — 下書き作成（入力フォーム保存）
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const productName = String(body.productName ?? "").trim();
  if (!productName && !body.sourceUrl) {
    return NextResponse.json(
      { error: "商品名または商品URLが必要です" },
      { status: 400 }
    );
  }

  const created = await prisma.quickListing.create({
    data: {
      userId: session.user.id,
      productName: productName || "(URLからの下書き)",
      sourceUrl: (body.sourceUrl as string) || null,
      buyPrice: body.buyPrice != null ? Number(body.buyPrice) : null,
      estPrice: body.estPrice != null ? Number(body.estPrice) : null,
      condition: (body.condition as string) || null,
      category: (body.category as string) || null,
      notes: (body.notes as string) || null,
      weightG: body.weightG != null ? Number(body.weightG) : null,
      sizeCode: (body.sizeCode as string) || null,
      imageUrls: Array.isArray(body.imageUrls) ? (body.imageUrls as string[]) : [],
      targetPlatform: (body.targetPlatform as string) || "none",
    },
  });

  return NextResponse.json({ ok: true, item: created });
}
