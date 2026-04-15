import { Mail } from "lucide-react";

export default function VerifyPage() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#060f08" }}>
      <div style={{
        background: "rgba(0,14,5,0.95)",
        border: "1px solid rgba(0,255,80,0.2)",
        borderRadius: 18,
        padding: "48px 44px",
        maxWidth: 420,
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ background: "rgba(0,255,80,0.08)", border: "1px solid rgba(0,255,80,0.25)", borderRadius: 16, padding: 18 }}>
            <Mail size={32} color="#00ff80" />
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#e8f5eb", marginBottom: 12 }}>
          メールを確認してください
        </div>
        <div style={{ fontSize: 14, color: "#8ab89a", lineHeight: 1.9 }}>
          ログインリンクをメールで送信しました。<br />
          メール内のリンクをクリックして<br />
          ログインしてください。
        </div>
        <div style={{ marginTop: 24, fontSize: 12, color: "#4a8a5a" }}>
          メールが届かない場合はスパムフォルダをご確認ください
        </div>
        <a
          href="/login"
          style={{
            display: "inline-block",
            marginTop: 24,
            fontSize: 13,
            color: "#4a8a5a",
            textDecoration: "none",
            border: "1px solid rgba(0,255,80,0.1)",
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
