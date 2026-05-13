import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateMonetizeContent } from "@/lib/monetize/ai";
import type { ProjectInputSnapshot } from "@/lib/monetize/types";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

// Vercel Functions の最大実行時間を延長（Opus 4.7 で7カテゴリ生成は数十秒〜1分弱）
export const maxDuration = 300;

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const project = await prisma.monetizeProject.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!project) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  // 多重生成防止: ただし Vercel maxDuration=300s を超えて「固まった」状態は
  // 永遠に解除されないため、startedAt から 5 分以上経過した PROCESSING 履歴は
  // タイムアウト失敗とみなして再生成を許可する。
  if (project.status === "GENERATING") {
    const STUCK_THRESHOLD_MS = 5 * 60 * 1000;
    const lastHistory = await prisma.generationHistory.findFirst({
      where: { projectId: project.id, status: "PROCESSING" },
      orderBy: { startedAt: "desc" },
    });
    const isStuck =
      !!lastHistory &&
      Date.now() - lastHistory.startedAt.getTime() > STUCK_THRESHOLD_MS;

    if (!isStuck) {
      return NextResponse.json(
        { error: "AI生成が実行中です。完了をお待ちください" },
        { status: 409 },
      );
    }

    // 固まった履歴を TIMEOUT として記録（整合性維持）
    if (lastHistory) {
      await prisma.generationHistory.update({
        where: { id: lastHistory.id },
        data: {
          status: "FAILED",
          errorCode: "TIMEOUT",
          errorMessage: "Vercel関数のタイムアウトにより生成が中断されました",
          completedAt: new Date(),
        },
      });
    }
  }

  const snapshot: ProjectInputSnapshot = {
    name: project.name,
    genre: project.genre,
    target: project.target,
    product_url: project.productUrl,
    lp_url: project.lpUrl,
    blog_url: project.blogUrl,
    affiliate_link: project.affiliateLink,
    memo: project.memo,
  };

  const startedAt = new Date();
  const history = await prisma.generationHistory.create({
    data: {
      projectId: project.id,
      inputSnapshotJson: snapshot as object,
      status: "PROCESSING",
      promptVersion: "mvp_v1",
      startedAt,
    },
  });

  await prisma.monetizeProject.update({
    where: { id: project.id },
    data: { status: "GENERATING" },
  });

  const outcome = await generateMonetizeContent(snapshot);

  if (!outcome.ok) {
    await prisma.$transaction([
      prisma.generationHistory.update({
        where: { id: history.id },
        data: {
          status: "FAILED",
          errorCode: outcome.errorCode,
          errorMessage: outcome.errorMessage,
          completedAt: new Date(),
        },
      }),
      prisma.monetizeProject.update({
        where: { id: project.id },
        data: { status: "ERROR" },
      }),
    ]);

    console.error("[monetize.generate] failed", {
      projectId: project.id,
      historyId: history.id,
      code: outcome.errorCode,
      message: outcome.errorMessage,
    });

    return NextResponse.json(
      {
        ok: false,
        historyId: history.id,
        errorCode: outcome.errorCode,
        errorMessage: outcome.errorMessage,
      },
      { status: 500 },
    );
  }

  const result = await prisma.generationResult.create({
    data: {
      projectId: project.id,
      analysisJson: outcome.output.analysis as object,
      articleJson: outcome.output.article as object,
      snsJson: outcome.output.sns as object,
      reelJson: outcome.output.reel as object,
      lineJson: outcome.output.line as object,
      ctaJson: outcome.output.cta as object,
      complianceJson: outcome.output.compliance as object,
      rawOutputJson: outcome.output as object,
      promptVersion: outcome.promptVersion,
    },
  });

  const completedAt = new Date();
  await prisma.$transaction([
    prisma.generationHistory.update({
      where: { id: history.id },
      data: {
        status: "SUCCESS",
        generationResultId: result.id,
        completedAt,
      },
    }),
    prisma.monetizeProject.update({
      where: { id: project.id },
      data: {
        status: "GENERATED",
        latestGenerationResultId: result.id,
        latestGeneratedAt: completedAt,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    historyId: history.id,
    resultId: result.id,
    result: outcome.output,
  });
}
