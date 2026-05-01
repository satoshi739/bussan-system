import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe, PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { PlanKey } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const planKey = body.planKey as PlanKey | undefined;
  const priceId = planKey ? PLANS[planKey]?.priceId : (body.priceId as string | undefined);
  if (!priceId) {
    return NextResponse.json({ error: "priceId required" }, { status: 400 });
  }

  const userId = session.user.id;

  // 既存のStripe顧客IDを取得
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  const hasBeenCustomer = !!sub?.stripeCustomerId;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId },
    customer: sub?.stripeCustomerId ?? undefined,
    customer_email: sub?.stripeCustomerId ? undefined : session.user.email!,
    success_url: `${process.env.NEXTAUTH_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
    locale: "ja",
    subscription_data: {
      metadata: { userId },
      ...(hasBeenCustomer ? {} : { trial_period_days: 7 }),
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
