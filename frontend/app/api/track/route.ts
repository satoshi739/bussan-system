import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body = await req.json();
  const { type, ...data } = body;

  try {
    switch (type) {
      case "purchase":
        await prisma.purchaseRecord.create({
          data: {
            userId,
            itemName: data.itemName ?? "不明",
            platform: data.platform ?? "不明",
            buyPrice: Number(data.buyPrice) || 0,
            shippingCost: Number(data.shippingCost) || 0,
            otherFees: Number(data.otherFees) || 0,
            sellPrice: Number(data.sellPrice) || 0,
            profit: Number(data.profit) || 0,
            roi: Number(data.roi) || 0,
            memo: data.memo ?? null,
          },
        });
        break;

      case "sale":
        await prisma.saleRecord.create({
          data: {
            userId,
            itemName: data.itemName ?? "不明",
            platform: data.platform ?? "不明",
            sellPrice: Number(data.sellPrice) || 0,
            buyPrice: Number(data.buyPrice) || 0,
            profit: Number(data.profit) || 0,
            roi: Number(data.roi) || 0,
            memo: data.memo ?? null,
          },
        });
        break;

      case "scan":
        await prisma.scanHistory.create({
          data: {
            userId,
            keyword: data.keyword ?? "不明",
            platform: data.platform ?? "不明",
            resultsCount: Number(data.resultsCount) || 0,
            topRoi: Number(data.topRoi) || 0,
            topProfit: Number(data.topProfit) || 0,
          },
        });
        break;

      case "calc":
        await prisma.profitCalcHistory.create({
          data: {
            userId,
            itemName: data.itemName ?? "不明",
            buyPrice: Number(data.buyPrice) || 0,
            sellPrice: Number(data.sellPrice) || 0,
            profit: Number(data.profit) || 0,
            roi: Number(data.roi) || 0,
            platform: data.platform ?? "不明",
          },
        });
        break;

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[track] error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
