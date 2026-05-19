import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserSubscription, hasAccess } from "@/lib/subscription";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const sub = await getUserSubscription();
  if (!sub || !sub.isActive || !hasAccess(sub.plan, "STANDARD")) {
    return NextResponse.json(
      {
        error: "配送ラベルは Standard 以上のプランでご利用いただけます",
        code: "FORBIDDEN_TIER",
      },
      { status: 403 },
    );
  }

  const label = await prisma.shippingLabel.findFirst({
    where: { id, userId: sub.userId },
  });
  if (!label) {
    return NextResponse.json(
      { error: "配送ラベルが見つかりません" },
      { status: 404 },
    );
  }
  return NextResponse.json({ shippingLabel: label });
}
