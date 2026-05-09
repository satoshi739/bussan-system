import { Mail } from "lucide-react";

type Props = { searchParams: Promise<{ email?: string }> };

export default async function VerifyPage({ searchParams }: Props) {
  const { email } = await searchParams;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        padding: "48px 44px",
        maxWidth: 420,
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ background: "var(--nav-active)", border: "1px solid var(--border-strong)", borderRadius: 16, padding: 18 }}>
            <Mail size={32} color="var(--blue)" />
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", marginBottom: 12 }}>
          メールを確認してください
        </div>
        <div style={{ fontSize: 14, color: "var(--text-3)", lineHeight: 1.9 }}>
          ログインリンクをメールで送信しました。<br />
          {email && (
            <><strong style={{ color: "var(--blue)" }}>{email}</strong><br /></>
          )}
          メール内のリンクをクリックして<br />
          ログインしてください。
        </div>
        <div style={{ marginTop: 24, fontSize: 12, color: "var(--text-3)" }}>
          メールが届かない場合はスパムフォルダをご確認ください
        </div>
        <a
          href="/login"
          style={{
            display: "inline-block",
            marginTop: 24,
            fontSize: 13,
            color: "var(--text-3)",
            textDecoration: "none",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 20px",
          }}
        >
          ← 戻る
        </a>
      </div>
    </div>
  );
}
