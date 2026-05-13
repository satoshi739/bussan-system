import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      secret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 重複イベントの検出: ハンドラ実行前に findUnique で既処理かチェック。
  // 既処理ならスキップ。ここではまだ stripeEvent.create はしない（ハンドラ成功後に commit する）。
  const existing = await prisma.stripeEvent.findUnique({
    where: { eventId: event.id },
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(sub);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      default:
        console.log(`[webhook] unhandled event type: ${event.type}`);
    }

    // ハンドラ成功後に eventId を登録（commit 相当）。
    // 同時受信のレース時に発生する P2002 は無視する（ハンドラは upsert/updateMany で冪等）。
    try {
      await prisma.stripeEvent.create({ data: { eventId: event.id } });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
        throw err;
      }
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { context: "stripe_webhook" } });
    // ハンドラ失敗時は 500 を返して Stripe にリトライさせる。
    // stripeEvent は未登録のため、リトライは duplicate 扱いにならず再度ハンドラが走る。
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// SubscriptionItem に current_period_end がある
function getPeriodEnd(sub: Stripe.Subscription): Date | null {
  const item = sub.items.data[0];
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000);
  }
  return null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId ?? session.client_reference_id ?? null;
  if (!userId) return;

  if (!session.subscription) {
    console.log("[webhook] checkout.session.completed: no subscription (mode != subscription), skipping");
    return;
  }

  const stripeSubId = session.subscription as string;
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
  const subItem = stripeSub.items.data[0];
  if (!subItem) return;
  const priceId = subItem.price.id;
  const plan = getPlanFromPriceId(priceId);
  const status = mapStripeStatus(stripeSub.status);
  const periodEnd = getPeriodEnd(stripeSub);

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: stripeSubId,
      stripePriceId: priceId,
      plan,
      status,
      currentPeriodEnd: periodEnd,
    },
    update: {
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: stripeSubId,
      stripePriceId: priceId,
      plan,
      status,
      currentPeriodEnd: periodEnd,
    },
  });
}

async function handleSubscriptionCreated(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId ?? null;
  const subItem = sub.items.data[0];
  if (!subItem) return;
  const priceId = subItem.price.id;
  const plan = getPlanFromPriceId(priceId);
  const status = mapStripeStatus(sub.status);
  const periodEnd = getPeriodEnd(sub);

  if (userId) {
    // checkout.session.completed より先に届いた場合に備えて upsert
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: sub.customer as string,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        plan,
        status,
        currentPeriodEnd: periodEnd,
      },
      update: {
        stripeCustomerId: sub.customer as string,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        plan,
        status,
        currentPeriodEnd: periodEnd,
      },
    });
  } else {
    // metadata に userId がない場合は既存行を更新するだけ
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: { plan, status, stripePriceId: priceId, currentPeriodEnd: periodEnd },
    });
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const subItem = sub.items.data[0];
  if (!subItem) return;
  const priceId = subItem.price.id;
  const plan = getPlanFromPriceId(priceId);
  const status = mapStripeStatus(sub.status);
  const periodEnd = getPeriodEnd(sub);

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: {
      plan,
      status,
      stripePriceId: priceId,
      currentPeriodEnd: periodEnd,
    },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: {
      plan: "FREE",
      status: "CANCELED",
      stripeSubscriptionId: null,
      stripePriceId: null,
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: { status: "PAST_DUE" },
  });
}

function getPlanFromPriceId(priceId: string) {
  const map: Record<string, "LITE" | "STANDARD" | "PRO"> = {};
  if (process.env.STRIPE_LITE_PRICE_ID) map[process.env.STRIPE_LITE_PRICE_ID] = "LITE";
  if (process.env.STRIPE_STANDARD_PRICE_ID) map[process.env.STRIPE_STANDARD_PRICE_ID] = "STANDARD";
  if (process.env.STRIPE_PRO_PRICE_ID) map[process.env.STRIPE_PRO_PRICE_ID] = "PRO";
  const plan = map[priceId];
  if (!plan) throw new Error(`Unknown priceId: ${priceId}`);
  return plan;
}

function mapStripeStatus(status: Stripe.Subscription.Status) {
  const map: Record<string, "ACTIVE" | "INACTIVE" | "CANCELED" | "PAST_DUE" | "TRIALING"> = {
    active: "ACTIVE",
    trialing: "TRIALING",
    canceled: "CANCELED",
    incomplete: "INACTIVE",
    incomplete_expired: "INACTIVE",
    past_due: "PAST_DUE",
    unpaid: "PAST_DUE",
    paused: "INACTIVE",
  };
  return map[status] ?? "INACTIVE";
}
