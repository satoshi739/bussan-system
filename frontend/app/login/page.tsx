"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Mail, Loader } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    startTransition(async () => {
      try {
        const result = await signIn("resend", {
          email,
          redirect: false,
          callbackUrl: "/",
        });
        if (result?.error) {
          setError("送信に失敗しました。メールアドレスを確認してください。");
        } else {
          setSent(true);
        }
      } catch {
        setError("エラーが発生しました。もう一度お試しください。");
      }
    });
  };

  const card: React.CSSProperties = {
    background: "rgba(20,20,22,0.95)",
    border: "1px solid rgba(212,175,55,0.2)",
    borderRadius: 18,
    padding: "48px 44px",
    maxWidth: 420,
    width: "100%",
  };

  if (sent) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0a0a0b" }}>
        <div style={card}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 16, padding: 18 }}>
                <Mail size={32} color="#D4AF37" />
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#F5F0E8", marginBottom: 10 }}>
              メールを送信しました
            </div>
            <div style={{ fontSize: 14, color: "#8A8278", lineHeight: 1.8 }}>
              <strong style={{ color: "#D4AF37" }}>{email}</strong> へ<br />
              ログインリンクを送りました。<br />
              メールのリンクをクリックしてください。
            </div>
            <div style={{ marginTop: 24, fontSize: 12, color: "#8A8278" }}>
              メールが届かない場合はスパムフォルダをご確認ください
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0a0a0b" }}>
      <div style={card}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#D4AF37", fontFamily: "monospace", marginBottom: 8 }}>
            物販チェッカー
          </div>
          <div style={{ fontSize: 14, color: "#8A8278" }}>
            メールアドレスでサインイン
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, color: "#8A8278", marginBottom: 8, fontWeight: 600 }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: "100%",
                background: "rgba(10,10,11,0.9)",
                border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: 10,
                color: "#F5F0E8",
                padding: "12px 16px",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: "#ff6666", marginBottom: 14, padding: "10px 14px", background: "rgba(255,80,50,0.08)", border: "1px solid rgba(255,80,50,0.2)", borderRadius: 8 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !email}
            style={{
              width: "100%",
              background: "linear-gradient(135deg,#1e1608,#2a1e08)",
              border: "1px solid rgba(212,175,55,0.4)",
              borderRadius: 10,
              color: "#D4AF37",
              padding: "13px",
              fontSize: 15,
              fontWeight: 700,
              cursor: isPending ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? <Loader size={16} /> : <Mail size={16} />}
            {isPending ? "送信中..." : "ログインリンクを送る"}
          </button>
        </form>

        <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(212,175,55,0.1)", textAlign: "center" }}>
          <Link href="/pricing" style={{ fontSize: 13, color: "#8A8278", textDecoration: "none" }}>
            プランを確認する →
          </Link>
        </div>
      </div>
    </div>
  );
}
