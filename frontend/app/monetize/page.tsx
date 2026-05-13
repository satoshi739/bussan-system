import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProjectList from "./_components/ProjectList";
import { T } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function MonetizeIndexPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/monetize");
  }

  const projects = await prisma.monetizeProject.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      genre: true,
      target: true,
      status: true,
      latestGeneratedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.t1, margin: 0 }}>コンテンツ生成</h1>
          <p style={{ fontSize: 13, color: T.t3, marginTop: 4, marginBottom: 0 }}>
            案件情報を登録してAI分析。SEO記事・SNS・リール台本・LINE配信文・CTA・注意表現を一括生成
          </p>
        </div>
        <Link
          href="/monetize/new"
          style={{
            background: T.gold,
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          + 新規プロジェクト作成
        </Link>
      </header>

      <ProjectList
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          genre: p.genre,
          target: p.target,
          status: p.status,
          latestGeneratedAt: p.latestGeneratedAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
