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
      select: { userId: true, plan: true, status: true, createdAt: true, currentPeriodEnd: true, stripeSubscriptionId: true },
    }),
  ]);

  const subMap = new Map(subscriptions.map(s => [s.userId, s]));

  const PLAN_PRICE: Record<string, number> = {
    FREE: 0,
    STANDARD: 9800,
    PRO: 19800,
  };

  const planCount = { FREE: 0, STANDARD: 0, PRO: 0 };
  let mrr = 0;

  for (const sub of subscriptions) {
    const plan = sub.plan as keyof typeof planCount;
    if (planCount[plan] !== undefined) planCount[plan]++;
    if (sub.status === "ACTIVE" && plan !== "FREE") {
      mrr += PLAN_PRICE[plan] ?? 0;
    }
  }

  const usersWithPlan = users.map(u => ({
    ...u,
    plan: subMap.get(u.id)?.plan ?? "FREE",
    subStatus: subMap.get(u.id)?.status ?? "INACTIVE",
    currentPeriodEnd: subMap.get(u.id)?.currentPeriodEnd ?? null,
  }));

  const recentSignups = usersWithPlan.slice(0, 20);

  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newUsersLast30 = users.filter(u => new Date(u.createdAt) > last30).length;

  return NextResponse.json({
    totalUsers: users.length,
    newUsersLast30,
    mrr,
    planCount,
    recentSignups,
  });
}
