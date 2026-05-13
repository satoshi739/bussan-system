import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import GenerateView from "../_components/GenerateView";
import type { RawOutputJson } from "@/lib/monetize/types";
import { T } from "@/lib/tokens";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: RouteProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const { id } = await params;

  const project = await prisma.monetizeProject.findFirst({
    where: { id, userId: session.user.id },
    include: { latestResult: true },
  });

  if (!project) notFound();

  const initialResult = project.latestResult
    ? (project.latestResult.rawOutputJson as unknown as RawOutputJson)
    : null;
  const initialResultCreatedAt = project.latestResult?.createdAt.toISOString() ?? null;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/monetize" style={{ fontSize: 13, color: T.gold, textDecoration: "none" }}>
        ← プロジェクト一覧に戻る
      </Link>
      <div style={{ marginTop: 16 }}>
        <GenerateView
          project={{
            id: project.id,
            name: project.name,
            genre: project.genre,
            target: project.target,
            status: project.status,
            latestGeneratedAt: project.latestGeneratedAt?.toISOString() ?? null,
            latestGenerationResultId: project.latestGenerationResultId ?? null,
          }}
          initialResult={initialResult}
          initialResultCreatedAt={initialResultCreatedAt}
        />
      </div>
    </div>
  );
}
