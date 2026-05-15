import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOnboardingDay1, sendOnboardingDay6 } from "@/lib/email";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Kind = "day1" | "day6";

async function findCandidates(kind: Kind) {
  const now = Date.now();
  // Day1: 22〜26時間前に登録（毎日09:00 JSTにcronが回る前提・前日24h±2hに登録した人を捕捉）
  // Day6: 5.5〜6.5日前に登録
  const range =
    kind === "day1"
      ? { gte: new Date(now - 26 * HOUR), lt: new Date(now - 22 * HOUR) }
      : { gte: new Date(now - 6.5 * DAY), lt: new Date(now - 5.5 * DAY) };

  return prisma.user.findMany({
    where: { createdAt: range, email: { not: "" } },
    select: { id: true, email: true, name: true },
  });
}

async function sendIfNotSent(
  user: { id: string; email: string; name: string | null },
  kind: Kind,
): Promise<"sent" | "skipped" | "failed"> {
  const already = await prisma.onboardingEmailLog.findUnique({
    where: { userId_kind: { userId: user.id, kind } },
  });
  if (already) return "skipped";

  try {
    if (kind === "day1") {
      await sendOnboardingDay1({ to: user.email, userName: user.name });
    } else {
      await sendOnboardingDay6({ to: user.email, userName: user.name });
    }
    await prisma.onboardingEmailLog.create({
      data: { userId: user.id, kind },
    });
    return "sent";
  } catch (error) {
    console.error(`[onboarding-emails] ${kind} send failed for ${user.id}:`, error);
    return "failed";
  }
}

export async function GET(req: NextRequest) {
  // Fail-Closed: シークレット未設定なら一律拒否（"Bearer undefined" 攻撃を防ぐ）
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/onboarding-emails] CRON_SECRET is not set");
    return NextResponse.json({ error: "Cron secret is not configured" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = { day1: { sent: 0, skipped: 0, failed: 0 }, day6: { sent: 0, skipped: 0, failed: 0 } };

  for (const kind of ["day1", "day6"] as const) {
    const candidates = await findCandidates(kind);
    for (const user of candidates) {
      const result = await sendIfNotSent(user, kind);
      stats[kind][result] += 1;
    }
  }

  return NextResponse.json({ ok: true, ...stats });
}
