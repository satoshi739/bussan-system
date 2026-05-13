import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ProjectForm from "../../_components/ProjectForm";
import { T } from "@/lib/tokens";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: RouteProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const { id } = await params;

  const project = await prisma.monetizeProject.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!project) notFound();

  return (
    <div style={{ padding: "24px 28px", maxWidth: 760, margin: "0 auto" }}>
      <Link href={`/monetize/${id}`} style={{ fontSize: 13, color: T.gold, textDecoration: "none" }}>
        ← 詳細画面に戻る
      </Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: T.t1, marginTop: 12, marginBottom: 4 }}>
        プロジェクト編集
      </h1>
      <p style={{ fontSize: 13, color: T.t3, marginTop: 0, marginBottom: 24 }}>
        編集後の内容は次回のAI生成から使われます。過去の生成履歴は保持されます。
      </p>

      <div style={{
        background: T.bg1,
        border: `1px solid ${T.bd}`,
        borderRadius: 14,
        padding: 24,
      }}>
        <ProjectForm
          mode="edit"
          projectId={id}
          initial={{
            name: project.name,
            genre: project.genre,
            target: project.target,
            product_url: project.productUrl ?? "",
            lp_url: project.lpUrl ?? "",
            blog_url: project.blogUrl ?? "",
            affiliate_link: project.affiliateLink ?? "",
            memo: project.memo ?? "",
          }}
        />
      </div>
    </div>
  );
}
