import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserSubscription, hasAccess } from "@/lib/subscription";
import { issueShippingLabel } from "@/lib/shipping-carriers/service";
import {
  ShippingLabelInputSchema,
  ShippingError,
} from "@/lib/shipping-carriers/types";

export const runtime = "nodejs";

const TIER_FORBIDDEN = NextResponse.json(
  {
    error: "配送ラベルは Standard 以上のプランでご利用いただけます",
    code: "FORBIDDEN_TIER",
  },
  { status: 403 },
);

async function requireStandardUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "ログインが必要です" }, { status: 401 }),
    };
  }
  const sub = await getUserSubscription();
  if (!sub || !sub.isActive || !hasAccess(sub.plan, "STANDARD")) {
    return { error: TIER_FORBIDDEN };
  }
  return { userId: sub.userId };
}

export async function POST(req: NextRequest) {
  const guard = await requireStandardUser();
  if (guard.error) return guard.error;
  const userId = guard.userId!;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON が解析できません" }, { status: 400 });
  }

  const parsed = ShippingLabelInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力データが不正です", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  try {
    const result = await issueShippingLabel(input.carrier, input);
    const record = await prisma.shippingLabel.create({
      data: {
        userId,
        externalOrderId: input.externalOrderId,
        carrier: input.carrier,
        status: result.status,
        recipientName: input.recipientName,
        recipientPostalCode: input.recipientPostalCode,
        recipientAddress: input.recipientAddress,
        recipientPhone: input.recipientPhone,
        packageName: input.packageName,
        trackingNumber: result.trackingNumber,
        trackingUrl: result.trackingUrl,
        labelIssueId: result.labelIssueId,
      },
    });
    return NextResponse.json({ shippingLabel: record }, { status: 201 });
  } catch (err) {
    Sentry.captureException(err, { tags: { context: "shipping_label" } });
    if (err instanceof ShippingError) {
      // 失敗ログを残す (発行失敗もユーザーが確認できるように)
      try {
        await prisma.shippingLabel.create({
          data: {
            userId,
            externalOrderId: input.externalOrderId,
            carrier: input.carrier,
            status: "failed",
            recipientName: input.recipientName,
            recipientPostalCode: input.recipientPostalCode,
            recipientAddress: input.recipientAddress,
            recipientPhone: input.recipientPhone,
            packageName: input.packageName,
            errorMessage: err.message,
          },
        });
      } catch {
        // 記録失敗は握りつぶす
      }
      const status =
        err.code === "VALIDATION" ? 400 : err.code === "NOT_IMPLEMENTED" ? 501 : 500;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    return NextResponse.json(
      { error: "配送ラベルの発行に失敗しました。しばらく経ってから再度お試しください。" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const guard = await requireStandardUser();
  if (guard.error) return guard.error;
  const userId = guard.userId!;

  const { searchParams } = new URL(req.url);
  const externalOrderId = searchParams.get("externalOrderId");

  const labels = await prisma.shippingLabel.findMany({
    where: {
      userId,
      ...(externalOrderId ? { externalOrderId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ shippingLabels: labels });
}
