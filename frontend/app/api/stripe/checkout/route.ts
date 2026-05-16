import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { stripe, PRICE_IDS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { PlanKey } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    console.error("[stripe/checkout] NEXTAUTH_URL is not set");
    return NextResponse.json({ error: "サーバー設定が不完全です（管理者へ連絡してください）" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const planKey = body.planKey as PlanKey | undefined;
  if (!planKey || !PRICE_IDS[planKey]) {
    return NextResponse.json({ error: "Invalid planKey" }, { status: 400 });
  }
  const priceId = PRICE_IDS[planKey];

  if (!session.user.email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const userId = session.user.id;

  // 既存のStripe顧客IDを取得
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  const hasBeenCustomer = !!sub?.stripeCustomerId;

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId },
      client_reference_id: userId,
      customer: sub?.stripeCustomerId ?? undefined,
      customer_email: sub?.stripeCustomerId ? undefined : session.user.email,
      success_url: `${baseUrl}/settings/billing?success=true`,
      cancel_url: `${baseUrl}/pricing`,
      locale: "ja",
      subscription_data: {
        metadata: { userId },
        ...(hasBeenCustomer ? {} : { trial_period_days: 7 }),
      },
    });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    Sentry.captureException(err, { tags: { context: "stripe_checkout" } });
    return NextResponse.json(
      { error: "決済セッションの作成に失敗しました。しばらく経ってから再度お試しください。" },
      { status: 500 }
    );
  }
}
