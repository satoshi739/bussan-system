import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

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

  try {
    // イベントの重複チェック
    const existing = await prisma.stripeEvent.findUnique({
      where: { eventId: event.id },
    });
    if (existing) {
      return NextResponse.json({ received: true });
    }
    await prisma.stripeEvent.create({ data: { eventId: event.id } });

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
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Stripe のリトライを防ぐため、ビジネスロジックエラーは 200 を返す
    return NextResponse.json({ received: true, warning: "Handler error logged" });
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
  const periodEnd = getPeriodEnd(stripeSub);

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: stripeSubId,
      stripePriceId: priceId,
      plan,
      status: "ACTIVE",
      currentPeriodEnd: periodEnd,
    },
    update: {
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: stripeSubId,
      stripePriceId: priceId,
      plan,
      status: "ACTIVE",
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
  if (!process.env.STRIPE_STANDARD_PRICE_ID || !process.env.STRIPE_PRO_PRICE_ID) {
    throw new Error("Stripe Price IDs not configured");
  }
  if (priceId === process.env.STRIPE_STANDARD_PRICE_ID) return "STANDARD" as const;
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "PRO" as const;
  throw new Error(`Unknown priceId: ${priceId}`);
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
