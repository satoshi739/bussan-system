"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Mail, Loader, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

const C = {
  bg0:  "#0a0a0b",
  bg1:  "rgba(20,20,22,0.95)",
  t1:   "#F5F0E8",
  t2:   "#D4CCBC",
  t3:   "#8A8278",
  t4:   "#6A6058",
  gold: "#D4AF37",
  bd:   "rgba(212,175,55,0.2)",
  bdSt: "rgba(212,175,55,0.4)",
  err:  "#ff6666",
};

export default function ForgotPage() {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");
  const [isPending, start]    = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError("");
    start(async () => {
      try {
        const result = await signIn("resend", { email, redirect: false, callbackUrl: "/" });
        if (result?.error) {
          setError("送信に失敗しました。メールアドレスをご確認ください。");
        } else {
          setSent(true);
        }
      } catch {
        setError("エラーが発生しました。もう一度お試しください。");
      }
    });
  };

  const card: React.CSSProperties = {
    background: C.bg1,
    border: `1px solid ${C.bd}`,
    borderRadius: 18,
    padding: "48px 44px",
    maxWidth: 420,
    width: "100%",
  };

  const inp: React.CSSProperties = {
    width: "100%",
    background: "rgba(10,10,11,0.9)",
    border: `1px solid ${C.bd}`,
    borderRadius: 10,
    color: C.t1,
    padding: "12px 16px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  if (sent) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: C.bg0 }}>
        <div style={card}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 16, padding: 18 }}>
                <CheckCircle size={32} color="#22c55e" />
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.t1, marginBottom: 12 }}>
              メールを送信しました
            </div>
            <div style={{ fontSize: 14, color: C.t3, lineHeight: 1.9, marginBottom: 8 }}>
              <strong style={{ color: C.gold }}>{email}</strong> へ<br />
              ログインリンクを送りました。
            </div>
            <div style={{ fontSize: 13, color: C.t4, lineHeight: 1.7, marginBottom: 28, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.bd}`, borderRadius: 10, padding: "14px 16px" }}>
              メールが届かない場合は<br />
              迷惑メール・スパムフォルダをご確認ください。<br />
              数分経っても届かない場合は<br />
              別のメールアドレスで再送してください。
            </div>
            <Link
              href="/login"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: C.gold, textDecoration: "none", fontWeight: 700 }}
            >
              <ArrowLeft size={13} /> ログインページへ戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: C.bg0 }}>
      <div style={card}>
        {/* ヘッダー */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <div style={{ background: `${C.gold}10`, border: `1px solid ${C.bd}`, borderRadius: 14, padding: 16 }}>
              <Mail size={28} color={C.gold} />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.t1, marginBottom: 10, letterSpacing: "-0.02em" }}>
            ログインでお困りですか？
          </div>
          <div style={{ fontSize: 13, color: C.t3, lineHeight: 1.8 }}>
            登録したメールアドレスを入力してください。<br />
            ログインリンクをお送りします。
          </div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, color: C.t3, marginBottom: 8, fontWeight: 600 }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              style={inp}
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: C.err, marginBottom: 14, padding: "10px 14px", background: "rgba(255,80,50,0.08)", border: "1px solid rgba(255,80,50,0.2)", borderRadius: 8 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !email}
            style={{
              width: "100%",
              background: "linear-gradient(135deg,#1e1608,#2a1e08)",
              border: `1px solid ${C.bdSt}`,
              borderRadius: 10,
              color: C.gold,
              padding: "13px",
              fontSize: 15,
              fontWeight: 700,
              cursor: isPending || !email ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: isPending || !email ? 0.7 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {isPending ? <Loader size={16} /> : <Mail size={16} />}
            {isPending ? "送信中..." : "ログインリンクを送る"}
          </button>
        </form>

        {/* フッター */}
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${C.bd}`, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <Link
            href="/login"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: C.t4, textDecoration: "none" }}
          >
            <ArrowLeft size={12} /> ログインページへ戻る
          </Link>
          <div style={{ fontSize: 12, color: C.t4, textAlign: "center", lineHeight: 1.7 }}>
            それでもログインできない場合は<br />
            <a href="mailto:satoshi6667s@gmail.com" style={{ color: C.gold, textDecoration: "none" }}>
              サポートへお問い合わせください
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
