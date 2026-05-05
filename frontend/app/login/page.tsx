"use client";

import { useState, useTransition, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Mail, Loader, Lock, Play, Heart, MessageCircle, Music2 } from "lucide-react";
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
  const [callbackUrl, setCallbackUrl] = useState("/");
  const [mode, setMode] = useState<"magic" | "password">("magic");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCallbackUrl(params.get("callbackUrl") ?? "/");
  }, []);

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const [pwEmail, setPwEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleMagicLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await signIn("resend", { email, redirect: false, callbackUrl });
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

  if (sent) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#07101f" }}>
        <div style={card}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(201,169,107,0.25)", borderRadius: 16, padding: 18 }}>
                <Mail size={32} color="#c9a96b" />
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#f5f1e8", marginBottom: 10 }}>
              メールを送信しました
            </div>
            <div style={{ fontSize: 14, color: "#8a9ab8", lineHeight: 1.8 }}>
              <strong style={{ color: "#c9a96b" }}>{email}</strong> へ<br />
              ログインリンクを送りました。<br />
              メールのリンクをクリックしてください。
            </div>
            <div style={{ marginTop: 24, fontSize: 12, color: "#8a9ab8" }}>
              メールが届かない場合はスパムフォルダをご確認ください
            </div>
            <button
              onClick={() => { setSent(false); }}
              style={{ marginTop: 20, background: "transparent", border: "none", color: "#8a9ab8", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
            >
              別のメールアドレスで再送する
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        <div
          className="tt-col"
          style={{ display: "flex", alignItems: "center" }}
        >
          <TikTokCard t={TIKTOKS[0]} />
        </div>

        {/* 中央：ログインフォーム */}
        <div style={card}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#c9a96b", fontFamily: "monospace", marginBottom: 8 }}>
              物販チェッカー
            </div>
          </div>

          {/* タブ */}
          <div style={{ display: "flex", gap: 0, marginBottom: 28, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(201,169,107,0.20)" }}>
            {([["magic", "メールリンク", <Mail key="m" size={13} />], ["password", "パスワード", <Lock key="p" size={13} />]] as const).map(([m, label, icon]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                style={{ flex: 1, padding: "10px", background: mode === m ? "rgba(212,175,55,0.12)" : "transparent", border: "none", color: mode === m ? "#c9a96b" : "#8a9ab8", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, borderRight: m === "magic" ? "1px solid rgba(201,169,107,0.20)" : "none" }}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {mode === "magic" ? (
            <form onSubmit={handleMagicLink}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, color: "#8a9ab8", marginBottom: 8, fontWeight: 600 }}>メールアドレス</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inp} />
              </div>
              {error && <div style={{ fontSize: 13, color: "#ff6666", marginBottom: 14, padding: "10px 14px", background: "rgba(255,80,50,0.08)", border: "1px solid rgba(255,80,50,0.2)", borderRadius: 8 }}>{error}</div>}
              <button type="submit" disabled={isPending || !email} style={{ width: "100%", background: "linear-gradient(135deg,#0a1530,#111e44)", border: "1px solid rgba(201,169,107,0.40)", borderRadius: 10, color: "#c9a96b", padding: "13px", fontSize: 15, fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isPending ? 0.7 : 1 }}>
                {isPending ? <Loader size={16} /> : <Mail size={16} />}
                {isPending ? "送信中..." : "ログインリンクを送る"}
              </button>
              <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: "#4d6080" }}>
                登録したメールアドレスにリンクが届きます。スパムフォルダもご確認ください。
              </div>
            </form>
          ) : (
            <form onSubmit={handlePassword}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 13, color: "#8a9ab8", marginBottom: 8, fontWeight: 600 }}>メールアドレス</label>
                <input type="email" value={pwEmail} onChange={e => setPwEmail(e.target.value)} placeholder="you@example.com" required style={inp} autoFocus />
              </div>
              <div style={{ marginBottom: 4 }}>
                <label style={{ display: "block", fontSize: 13, color: "#8a9ab8", marginBottom: 8, fontWeight: 600 }}>パスワード</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inp} onKeyDown={e => e.key === "Enter" && handlePassword(e)} />
              </div>
              <div style={{ textAlign: "right", marginBottom: 16 }}>
                <Link href="/login/forgot" style={{ fontSize: 12, color: "#4d6080", textDecoration: "none" }}>
                  パスワードを忘れた方はこちら
                </Link>
              </div>
              {error && <div style={{ fontSize: 13, color: "#ff6666", marginBottom: 14, padding: "10px 14px", background: "rgba(255,80,50,0.08)", border: "1px solid rgba(255,80,50,0.2)", borderRadius: 8 }}>{error}</div>}
              <button type="submit" disabled={isPending || !pwEmail || !password} style={{ width: "100%", background: "linear-gradient(135deg,#0a1530,#111e44)", border: "1px solid rgba(201,169,107,0.40)", borderRadius: 10, color: "#c9a96b", padding: "13px", fontSize: 15, fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isPending ? 0.7 : 1 }}>
                {isPending ? <Loader size={16} /> : <Lock size={16} />}
                {isPending ? "ログイン中..." : "ログイン"}
              </button>
            </form>
          )}

          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(212,175,55,0.1)", textAlign: "center" }}>
            <div style={{ background: "rgba(201,169,107,0.06)", border: "1px solid rgba(201,169,107,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#c9a96b", lineHeight: 1.6 }}>
              🎁 初めての方も<strong>メールアドレスを入力するだけ</strong>で無料登録できます
            </div>
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
        <div
          className="tt-col"
          style={{ display: "flex", alignItems: "center" }}
        >
          <TikTokCard t={TIKTOKS[1]} />
        </div>
      </div>
    </>
  );
}
