import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserSubscription, hasAccess } from "@/lib/subscription";
import { downloadLabelPdf } from "@/lib/shipping-carriers/service";
import { ShippingError } from "@/lib/shipping-carriers/types";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const sub = await getUserSubscription();
  if (!sub || !sub.isActive || !hasAccess(sub.plan, "STANDARD")) {
    return NextResponse.json(
      {
        error: "配送ラベルは Standard 以上のプランでご利用いただけます",
        code: "FORBIDDEN_TIER",
      },
      { status: 403 },
    );
  }

  const label = await prisma.shippingLabel.findFirst({
    where: { id, userId: sub.userId },
  });
  if (!label) {
    return NextResponse.json(
      { error: "配送ラベルが見つかりません" },
      { status: 404 },
    );
  }
  if (!label.labelIssueId) {
    return NextResponse.json(
      { error: "ラベル未発行のためPDFを取得できません" },
      { status: 409 },
    );
  }

  try {
    const pdf = await downloadLabelPdf(label.carrier, label.labelIssueId);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="shipping-label-${id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { context: "shipping_label" } });
    if (err instanceof ShippingError) {
      const status = err.code === "NOT_IMPLEMENTED" ? 501 : 500;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    return NextResponse.json(
      { error: "PDFの取得に失敗しました" },
      { status: 500 },
    );
  }
}
