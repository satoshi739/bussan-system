"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Loader, Lock, Play, Heart, MessageCircle, Music2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TIKTOKS = [
  {
    id: 1,
    emoji: "📦",
    title: "仕入れ判断10秒に短縮",
    hook: "物販の利益計算、まだ電卓でやってる？やばいよそれ",
    tag: "#物販チェッカー #副業 #せどり",
    likes: "2.3K",
    comments: "147",
    accent: "rgba(201,169,107,0.15)",
  },
  {
    id: 2,
    emoji: "💰",
    title: "eBay月5万の現実",
    hook: "eBayで月5万稼ぐって難しいと思ってない？全然そんなことない",
    tag: "#ebay #副業物販 #海外転売",
    likes: "4.1K",
    comments: "203",
    accent: "rgba(80,200,120,0.12)",
  },
  {
    id: 3,
    emoji: "🔥",
    title: "副業物販を選んだ理由",
    hook: "会社員のまま副業で月10万稼いでるけど、なんで物販を選んだか話す",
    tag: "#副業 #会社員副業 #物販初心者",
    likes: "8.7K",
    comments: "412",
    accent: "rgba(255,100,80,0.12)",
  },
];

function TikTokCard({ t }: { t: (typeof TIKTOKS)[number] }) {
  return (
    <div
      style={{
        width: 190,
        background: "#111114",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* 動画エリア */}
      <div
        style={{
          height: 320,
          background: `radial-gradient(ellipse at 50% 40%, ${t.accent} 0%, #07101f 70%)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          padding: "20px 16px 16px",
        }}
      >
        {/* 再生ボタン */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
            border: "2px solid rgba(255,255,255,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Play size={20} color="#fff" fill="#fff" />
        </div>

        {/* フックテキスト */}
        <div
          style={{
            fontSize: 11.5,
            color: "#f5f1e8",
            textAlign: "center",
            lineHeight: 1.6,
            fontWeight: 600,
          }}
        >
          {t.hook}
        </div>

        {/* タグ */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 12,
            fontSize: 9.5,
            color: "rgba(212,175,55,0.7)",
            fontWeight: 600,
          }}
        >
          {t.tag}
        </div>
      </div>

      {/* 下部UI */}
      <div style={{ padding: "10px 12px 12px" }}>
        <div
          style={{
            fontSize: 11,
            color: "#f5f1e8",
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          {t.emoji} {t.title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 10,
                color: "#8a9ab8",
              }}
            >
              <Heart size={10} color="#ff6b6b" fill="#ff6b6b" />
              {t.likes}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 10,
                color: "#8a9ab8",
              }}
            >
              <MessageCircle size={10} />
              {t.comments}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontSize: 9,
              color: "#4d6080",
            }}
          >
            <Music2 size={9} />
            original sound
          </div>
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 9,
            color: "#4d6080",
            textAlign: "center",
          }}
        >
          @bussan_checker
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [callbackUrl] = useState(() => {
    if (typeof window === "undefined") return "/";
    return new URLSearchParams(window.location.search).get("callbackUrl") ?? "/";
  });
  const [pwSubMode, setPwSubMode] = useState<"login" | "register">("login");

  const [pwEmail, setPwEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwEmail || !password) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await signIn("admin-password", {
          email: pwEmail,
          password,
          redirect: false,
          callbackUrl,
        });
        if (result?.error) {
          setError("メールアドレスまたはパスワードが間違っています。");
        } else {
          router.push(result?.url ?? "/");
        }
      } catch {
        setError("エラーが発生しました。もう一度お試しください。");
      }
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwEmail || !password) return;
    setError("");
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: pwEmail, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "登録に失敗しました");
          return;
        }
        // 登録成功 → そのままログイン
        const result = await signIn("admin-password", {
          email: pwEmail,
          password,
          redirect: false,
          callbackUrl,
        });
        if (result?.error) {
          setError("登録しましたが、ログインに失敗しました。パスワードタブからログインしてください。");
        } else {
          router.push(result?.url ?? "/");
        }
      } catch {
        setError("エラーが発生しました。もう一度お試しください。");
      }
    });
  };

  const card: React.CSSProperties = {
    background: "rgba(10,21,48,0.97)",
    border: "1px solid rgba(201,169,107,0.20)",
    borderRadius: 18,
    padding: "48px 44px",
    maxWidth: 420,
    width: "100%",
    flexShrink: 0,
  };

  const inp: React.CSSProperties = {
    width: "100%",
    background: "rgba(10,10,11,0.9)",
    border: "1px solid rgba(201,169,107,0.25)",
    borderRadius: 10,
    color: "#f5f1e8",
    padding: "12px 16px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <>
      <style>{`
        @media (max-width: 1100px) { .tt-col { display: none !important; } }
      `}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#07101f",
          gap: 40,
          padding: "24px 16px",
        }}
      >
        {/* 左 */}
        <div className="tt-col" style={{ display: "flex", alignItems: "center" }}>
          <TikTokCard t={TIKTOKS[0]} />
        </div>

        {/* 中央：ログインフォーム */}
        <div style={card}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#c9a96b", fontFamily: "monospace", marginBottom: 8 }}>
              物販チェッカー
            </div>
          </div>

          <>
              {/* ログイン / 新規登録 サブタブ */}
              <div style={{ display: "flex", gap: 0, marginBottom: 20, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
                {([["login", "ログイン"], ["register", "新規登録（無料）"]] as const).map(([sub, label], i) => (
                  <button
                    key={sub}
                    onClick={() => { setPwSubMode(sub); setError(""); }}
                    style={{ flex: 1, padding: "9px", background: pwSubMode === sub ? "rgba(212,175,55,0.15)" : "transparent", border: "none", color: pwSubMode === sub ? "#c9a96b" : "#8a9ab8", fontWeight: 700, fontSize: 13, cursor: "pointer", borderRight: i === 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <form onSubmit={pwSubMode === "login" ? handlePassword : handleRegister}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#8a9ab8", marginBottom: 8, fontWeight: 600 }}>メールアドレス</label>
                  <input type="email" value={pwEmail} onChange={e => setPwEmail(e.target.value)} placeholder="you@example.com" required style={inp} autoFocus />
                </div>
                <div style={{ marginBottom: pwSubMode === "login" ? 4 : 16 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#8a9ab8", marginBottom: 8, fontWeight: 600 }}>パスワード{pwSubMode === "register" && "（6文字以上）"}</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inp} />
                </div>
                {pwSubMode === "login" && (
                  <div style={{ textAlign: "right", marginBottom: 16 }}>
                    <Link href="/login/forgot" style={{ fontSize: 12, color: "#4d6080", textDecoration: "none" }}>
                      パスワードを忘れた方
                    </Link>
                  </div>
                )}
                {error && <div style={{ fontSize: 13, color: "#ff6666", marginBottom: 14, padding: "10px 14px", background: "rgba(255,80,50,0.08)", border: "1px solid rgba(255,80,50,0.2)", borderRadius: 8 }}>{error}</div>}
                <button type="submit" disabled={isPending || !pwEmail || !password} style={{ width: "100%", background: pwSubMode === "register" ? "linear-gradient(135deg,#0a2a18,#0d3d24)" : "linear-gradient(135deg,#0a1530,#111e44)", border: `1px solid ${pwSubMode === "register" ? "rgba(74,222,128,0.40)" : "rgba(201,169,107,0.40)"}`, borderRadius: 10, color: pwSubMode === "register" ? "#4ade80" : "#c9a96b", padding: "13px", fontSize: 15, fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isPending ? 0.7 : 1 }}>
                  {isPending ? <Loader size={16} /> : <Lock size={16} />}
                  {isPending ? (pwSubMode === "register" ? "登録中..." : "ログイン中...") : (pwSubMode === "register" ? "無料で新規登録する" : "ログイン")}
                </button>
                {pwSubMode === "register" && (
                  <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, color: "#4d6080" }}>
                    登録後すぐに無料プランでご利用いただけます
                  </div>
                )}
              </form>
            </>

          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(212,175,55,0.1)", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
              <Link href="/login/forgot" style={{ fontSize: 13, color: "#4d6080", textDecoration: "none" }}>
                ログインできない方
              </Link>
              <Link href="/pricing" style={{ fontSize: 13, color: "#8a9ab8", textDecoration: "none" }}>
                プランを確認する →
              </Link>
            </div>
          </div>
        </div>

        {/* 右 */}
        <div className="tt-col" style={{ display: "flex", alignItems: "center" }}>
          <TikTokCard t={TIKTOKS[1]} />
        </div>
      </div>
    </>
  );
}
