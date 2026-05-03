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

  // ADMIN は常に PRO フルアクセス（Stripe 契約不要）
  if (user.role === "ADMIN") {
    return {
      userId: user.id,
      plan: "PRO" as PlanKey,
      status: "ACTIVE",
      isActive: true,
      limits: getPlanLimits("PRO"),
      currentPeriodEnd: null,
      stripeCustomerId: user.subscription?.stripeCustomerId ?? null,
      stripeSubscriptionId: user.subscription?.stripeSubscriptionId ?? null,
    };
  }

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

const PLAN_HIERARCHY: Record<PlanKey, number> = {
  FREE: 0,
  STANDARD: 1,
  PRO: 2,
};

// プランが指定したプラン以上かチェック
export function hasAccess(userPlan: PlanKey, requiredPlan: PlanKey): boolean {
  const userLevel = PLAN_HIERARCHY[userPlan] ?? -1;
  const reqLevel = PLAN_HIERARCHY[requiredPlan] ?? -1;
  if (userLevel === -1 || reqLevel === -1) return false;
  return userLevel >= reqLevel;
}
