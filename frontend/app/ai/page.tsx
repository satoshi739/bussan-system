"use client";

import { useState, useRef, useEffect } from "react";
import { aiResearch } from "@/lib/api";

const card: React.CSSProperties = { background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, padding: "20px 24px" };
const inp: React.CSSProperties = { background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#F5F0E8", padding: "10px 12px", fontSize: 14, width: "100%", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 };

interface Message { role: "user" | "assistant"; text: string; }

const SUGGESTIONS = [
  "最近の売上データからみて、どのジャンルを強化すべきですか？",
  "eBayとメルカリ、どちらに注力すると利益が出やすいですか？",
  "利益率を上げるための具体的な方法を教えてください",
  "売れ残り商品を減らすにはどうすればいいですか？",
  "初心者が最初に仕入れるべきジャンルは何ですか？",
];

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setError("");
    const next = [...messages, { role: "user" as const, text: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await aiResearch(msg);
      setMessages([...next, { role: "assistant", text: res.response }]);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : "不明なエラー";
      setError(err.includes("APIキー") ? "Anthropic APIキーが未設定です。設定ページで登録してください。" : `エラー: ${err}`);
      setMessages(next.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", marginBottom: 6 }}>AIリサーチアシスタント</h1>
        <div style={{ fontSize: 12, color: "#8A8278" }}>
          あなたの売上データをもとに、物販戦略・仕入れ判断・価格設定をAIがアドバイスします
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 ? (
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 14 }}>よくある質問</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 8, padding: "11px 14px", color: "#8A8278", fontSize: 13, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "82%",
                background: m.role === "user" ? "rgba(30,25,10,0.9)" : "rgba(20,20,22,0.95)",
                border: m.role === "user" ? "1px solid rgba(212,175,55,0.3)" : "1px solid rgba(212,175,55,0.15)",
                borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                padding: "12px 16px",
                fontSize: 14,
                color: "#F5F0E8",
                lineHeight: 1.75,
                whiteSpace: "pre-wrap",
              }}>
                {m.role === "assistant" && (
                  <div style={{ fontSize: 11, color: "#D4AF37", marginBottom: 6, fontWeight: 700 }}>AI アシスタント</div>
                )}
                {m.text}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: "rgba(20,20,22,0.95)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: "12px 12px 12px 4px", padding: "12px 18px", color: "#8A8278", fontSize: 14 }}>
              考えています...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div style={{ ...card, borderColor: "rgba(255,100,100,0.35)", color: "#ff9966", fontSize: 13 }}>{error}</div>
      )}

      <div style={card}>
        <textarea
          style={{ ...inp, minHeight: 72 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="物販について何でも質問できます... (Enter で送信 / Shift+Enter で改行)"
          disabled={loading}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              style={{ background: "transparent", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 8, color: "#8A8278", padding: "8px 14px", fontSize: 12, cursor: "pointer" }}
            >
              会話をリセット
            </button>
          )}
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              marginLeft: "auto",
              background: input.trim() && !loading ? "linear-gradient(135deg,#1e1608,#2a1e08)" : "rgba(20,18,8,0.6)",
              border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: 8,
              color: input.trim() && !loading ? "#D4AF37" : "#8A8278",
              padding: "10px 28px",
              fontSize: 14,
              fontWeight: 700,
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            }}
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
