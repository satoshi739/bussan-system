import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProjectForm from "../_components/ProjectForm";
import { T } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/monetize/new");
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 760, margin: "0 auto" }}>
      <Link href="/monetize" style={{ fontSize: 13, color: T.gold, textDecoration: "none" }}>
        ← プロジェクト一覧に戻る
      </Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: T.t1, marginTop: 12, marginBottom: 4 }}>
        新規プロジェクト作成
      </h1>
      <p style={{ fontSize: 13, color: T.t3, marginTop: 0, marginBottom: 24 }}>
        案件情報を入力してください。AI分析の精度を上げるため、メモにも商品の特徴・差別化点を入力するのがおすすめです。
      </p>

      <div style={{
        background: T.bg1,
        border: `1px solid ${T.bd}`,
        borderRadius: 14,
        padding: 24,
      }}>
        <ProjectForm mode="create" />
      </div>
    </div>
  );
}
