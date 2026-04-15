import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits, type PlanKey } from "@/lib/stripe";

export type { PlanKey };

// サーバーサイドでユーザーのサブスク情報を取得
export async function getUserSubscription() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { subscription: true },
  });

  if (!user) return null;

  const plan = (user.subscription?.plan ?? "FREE") as PlanKey;
  const status = user.subscription?.status ?? "INACTIVE";
  const isActive =
    plan === "FREE" ||
    status === "ACTIVE" ||
    status === "TRIALING";

  return {
    userId: user.id,
    plan,
    status,
    isActive,
    limits: getPlanLimits(plan),
    currentPeriodEnd: user.subscription?.currentPeriodEnd,
    stripeCustomerId: user.subscription?.stripeCustomerId,
    stripeSubscriptionId: user.subscription?.stripeSubscriptionId,
  };
}

// プランが指定したプラン以上かチェック
export function hasAccess(userPlan: PlanKey, requiredPlan: PlanKey): boolean {
  const order: PlanKey[] = ["FREE", "PRO", "BUSINESS"];
  return order.indexOf(userPlan) >= order.indexOf(requiredPlan);
}
