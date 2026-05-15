import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 過去30日分の sns_daily_* を取得し、theme でグルーピング
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const items = await prisma.contentItem.findMany({
    where: { platform: { startsWith: "sns_daily_" }, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    items: items.map((it) => ({
      id: it.id,
      platform: it.platform,
      theme: it.theme,
      title: it.title,
      body: it.body,
      status: it.status,
      publishedAt: it.publishedAt,
      createdAt: it.createdAt,
    })),
  });
}
