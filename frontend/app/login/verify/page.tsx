import { Mail } from "lucide-react";

export default function VerifyPage() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0a0a0b" }}>
      <div style={{
        background: "rgba(20,20,22,0.95)",
        border: "1px solid rgba(212,175,55,0.2)",
        borderRadius: 18,
        padding: "48px 44px",
        maxWidth: 420,
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 16, padding: 18 }}>
            <Mail size={32} color="#D4AF37" />
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#F5F0E8", marginBottom: 12 }}>
          メールを確認してください
        </div>
        <div style={{ fontSize: 14, color: "#8A8278", lineHeight: 1.9 }}>
          ログインリンクをメールで送信しました。<br />
          メール内のリンクをクリックして<br />
          ログインしてください。
        </div>
        <div style={{ marginTop: 24, fontSize: 12, color: "#8A8278" }}>
          メールが届かない場合はスパムフォルダをご確認ください
        </div>
        <a
          href="/login"
          style={{
            display: "inline-block",
            marginTop: 24,
            fontSize: 13,
            color: "#8A8278",
            textDecoration: "none",
            border: "1px solid rgba(212,175,55,0.1)",
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
