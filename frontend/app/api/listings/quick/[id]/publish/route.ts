import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAdapter, type PublishMode, type TargetPlatform } from "@/lib/publish-adapter";
import { validateListing, hasBlockingError } from "@/lib/listing-validator";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const item = await prisma.quickListing.findUnique({ where: { id } });
  if (!item || item.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { mode?: PublishMode; force?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const mode: PublishMode = body.mode ?? "csv";

  const title = item.aiTitle ?? item.productName;
  const description = item.aiDescription ?? item.notes ?? "";
  const price = item.aiSuggestedPrice ?? item.estPrice ?? 0;
  const shippingFee = item.aiShippingEstimate ?? 0;

  // 出品前バリデーション（プラットフォーム固有ルール込み）
  const warnings = validateListing({
    title,
    description,
    price,
    shippingFee,
    category: item.category ?? item.aiCategories[0] ?? null,
    imageUrls: item.imageUrls,
    platform: item.targetPlatform as TargetPlatform,
  });
  if (hasBlockingError(warnings) && !body.force) {
    return NextResponse.json({ error: "出品に必須の項目が不足しています", warnings }, { status: 422 });
  }

  const adapter = getAdapter(item.targetPlatform as TargetPlatform);
  const result = await adapter.publish(
    {
      title,
      description,
      price,
      shippingFee,
      category: item.category ?? item.aiCategories[0] ?? null,
      keywords: item.aiKeywords,
      imageUrls: item.imageUrls,
      condition: item.condition,
    },
    mode,
  );

  // ステータス更新
  if (result.ok) {
    const nextStatus =
      result.mode === "csv"  ? "CSV_EXPORTED" :
      result.mode === "copy" ? "CONFIRMED" :
      "PUBLISHED";
    await prisma.quickListing.update({
      where: { id },
      data: { status: nextStatus },
    });
  }

  return NextResponse.json({ ...result, warnings });
}
