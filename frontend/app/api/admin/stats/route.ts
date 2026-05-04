import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, subscriptions] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, email: true, name: true, createdAt: true, role: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscription.findMany({
      select: { userId: true, plan: true, status: true, createdAt: true, currentPeriodEnd: true },
    }),
  ]);

  // バックエンドのユーザー別アクティビティを取得
  let backendStats: Record<string, { purchase_count: number; sold_count: number; listed_count: number; purchased_count: number; last_purchase_date: string | null; total_invested: number }> = {};
  try {
    const backendUrl = process.env.FASTAPI_URL ?? "http://localhost:8000";
    const apiKey = process.env.INTERNAL_API_KEY ?? "";
    const res = await fetch(`${backendUrl}/api/admin/user-stats`, {
      headers: { "X-API-Key": apiKey },
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const rows: { user_id: string; purchase_count: number; sold_count: number; listed_count: number; purchased_count: number; last_purchase_date: string | null; total_invested: number }[] = await res.json();
      for (const r of rows) {
        backendStats[r.user_id] = r;
      }
    }
  } catch {
    // バックエンドが落ちていても管理画面は表示する
  }

  const subMap = new Map(subscriptions.map(s => [s.userId, s]));

  const PLAN_PRICE: Record<string, number> = { FREE: 0, STANDARD: 9800, PRO: 19800 };
  const planCount = { FREE: 0, STANDARD: 0, PRO: 0 };
  let mrr = 0;

  for (const sub of subscriptions) {
    const plan = sub.plan as keyof typeof planCount;
    if (planCount[plan] !== undefined) planCount[plan]++;
    if (sub.status === "ACTIVE" && plan !== "FREE") mrr += PLAN_PRICE[plan] ?? 0;
  }

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const usersWithStats = users.map(u => {
    const sub = subMap.get(u.id);
    const activity = backendStats[u.id];
    const daysSinceSignup = Math.floor((now - new Date(u.createdAt).getTime()) / DAY);
    const plan = sub?.plan ?? "FREE";

    // チャーンリスク算出
    let churnRisk: "high" | "medium" | "low" | "safe" = "safe";
    if (plan === "FREE") {
      if (daysSinceSignup >= 14) churnRisk = "high";
      else if (daysSinceSignup >= 7) churnRisk = "medium";
      else churnRisk = "low";
    }

    return {
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      plan,
      subStatus: sub?.status ?? "INACTIVE",
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      daysSinceSignup,
      churnRisk,
      purchaseCount: activity?.purchase_count ?? 0,
      soldCount: activity?.sold_count ?? 0,
      listedCount: activity?.listed_count ?? 0,
      pendingCount: activity?.purchased_count ?? 0,
      totalInvested: activity?.total_invested ?? 0,
      lastPurchaseDate: activity?.last_purchase_date ?? null,
      isActive: (activity?.purchase_count ?? 0) > 0,
    };
  });

  const last30 = new Date(now - 30 * DAY);
  const newUsersLast30 = users.filter(u => new Date(u.createdAt) > last30).length;
  const activeUsers = usersWithStats.filter(u => u.isActive).length;

  const churnSummary = {
    high: usersWithStats.filter(u => u.churnRisk === "high").length,
    medium: usersWithStats.filter(u => u.churnRisk === "medium").length,
    low: usersWithStats.filter(u => u.churnRisk === "low").length,
    safe: usersWithStats.filter(u => u.churnRisk === "safe").length,
  };

  return NextResponse.json({
    totalUsers: users.length,
    activeUsers,
    newUsersLast30,
    mrr,
    planCount,
    churnSummary,
    users: usersWithStats,
  });
}
