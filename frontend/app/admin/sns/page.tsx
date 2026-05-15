"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Sparkles, RefreshCw, Copy, Check, Clock, Hash } from "lucide-react";

type Scene = { narrator: string; text: string };
type TikTokScript = { scenes: Scene[]; caption: string; hashtags: string[] };
type XScript = { tweet: string; thread?: string[] };

interface HistoryItem {
  id: string;
  platform: string; // sns_daily_tiktok | sns_daily_x
  theme: string;
  title: string;
  body: string; // JSON
  status: string;
  publishedAt: string | null;
  createdAt: string;
}

interface TodayScript {
  theme: string;
  themeWhy: string;
  tiktok: { id: string } & TikTokScript;
  x: { id: string } & XScript;
}

const NARRATOR_LABEL: Record<string, string> = {
  kasukabe_tsumugi: "👧 春日部つむぎ",
  kurono_takehiro: "👨 玄野武宏",
};

export default function SnsAdminPage() {
  const [generating, setGenerating] = useState(false);
  const [today, setToday] = useState<TodayScript | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState<string>("");

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/admin/sns/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.items ?? []);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sns/generate-daily", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "生成に失敗しました");
        return;
      }
      setToday(data);
      await fetchHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  // 履歴アイテムから日付ごとにグルーピング
  const grouped = history.reduce<Record<string, HistoryItem[]>>((acc, it) => {
    const date = it.createdAt.slice(0, 10);
    (acc[date] = acc[date] ?? []).push(it);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 0 80px" }}>
      <Link
        href="/admin"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-3)", textDecoration: "none", fontSize: 13, marginBottom: 20 }}
      >
        <ChevronLeft size={14} /> 管理者ダッシュボードに戻る
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={22} color="#D4AF37" /> SNSで発信
          </h1>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>
            Claude が今日のテーマを自動決定し、TikTok と X 用の台本を生成します
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: generating ? "var(--surface-2)" : "linear-gradient(135deg,#1e1608,#2a1e08)",
            border: "1px solid rgba(212,175,55,0.4)",
            borderRadius: 12, color: "#D4AF37",
            padding: "12px 22px", fontSize: 14, fontWeight: 800,
            cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? <RefreshCw size={15} className="spin" /> : <Sparkles size={15} />}
          {generating ? "Claude が考え中..." : "今日の台本を生成"}
        </button>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>

      {error && (
        <div style={{ background: "rgba(255,80,50,0.08)", border: "1px solid rgba(255,80,50,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#ff9977", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* 今日の台本 */}
      {today && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ background: "var(--surface)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 16, padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#D4AF37", fontWeight: 700, letterSpacing: "0.1em" }}>今日のテーマ</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginTop: 6 }}>{today.theme}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6, lineHeight: 1.6 }}>{today.themeWhy}</div>
          </div>

          {/* TikTok 台本 */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>📱 TikTok 台本</div>
              <button
                onClick={() => copyToClipboard("tiktok-caption", `${today.tiktok.caption}\n\n${today.tiktok.hashtags.join(" ")}`)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-2)", padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
              >
                {copied === "tiktok-caption" ? <Check size={12} /> : <Copy size={12} />}
                {copied === "tiktok-caption" ? "コピー済" : "キャプション+ハッシュタグをコピー"}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {today.tiktok.scenes.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--text-3)", minWidth: 28, fontWeight: 700 }}>{i + 1}.</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3 }}>{NARRATOR_LABEL[s.narrator] ?? s.narrator}</div>
                    <div style={{ fontSize: 14, color: "var(--text)" }}>{s.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6, fontWeight: 700 }}>キャプション</div>
            <div style={{ fontSize: 13, color: "var(--text)", padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10, marginBottom: 10, whiteSpace: "pre-wrap" }}>{today.tiktok.caption}</div>

            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <Hash size={11} /> ハッシュタグ
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {today.tiktok.hashtags.map((tag, i) => (
                <span key={i} style={{ fontSize: 11, color: "#66aaff", background: "rgba(102,170,255,0.08)", border: "1px solid rgba(102,170,255,0.2)", borderRadius: 6, padding: "3px 8px" }}>{tag}</span>
              ))}
            </div>
          </div>

          {/* X 台本 */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>🐦 X (Twitter) 台本</div>
              <button
                onClick={() => copyToClipboard("x-tweet", today.x.tweet)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-2)", padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
              >
                {copied === "x-tweet" ? <Check size={12} /> : <Copy size={12} />}
                {copied === "x-tweet" ? "コピー済" : "ツイートをコピー"}
              </button>
            </div>

            <div style={{ fontSize: 13, color: "var(--text)", padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10, whiteSpace: "pre-wrap", marginBottom: today.x.thread?.length ? 12 : 0 }}>
              {today.x.tweet}
            </div>

            {today.x.thread && today.x.thread.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6, fontWeight: 700 }}>スレッド続き</div>
                {today.x.thread.map((t, i) => (
                  <div key={i} style={{ fontSize: 13, color: "var(--text)", padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10, marginBottom: 6, whiteSpace: "pre-wrap" }}>
                    <span style={{ fontSize: 11, color: "var(--text-3)", marginRight: 6 }}>{i + 2}/</span>{t}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* 履歴 */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Clock size={16} color="var(--text-3)" />
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", margin: 0 }}>過去30日の投稿履歴</h2>
        </div>

        {historyLoading ? (
          <div style={{ color: "var(--text-3)", fontSize: 13 }}>読み込み中...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div style={{ background: "var(--surface-2)", border: "1px dashed var(--border)", borderRadius: 12, padding: "32px 20px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            まだ生成履歴がありません。上の「今日の台本を生成」を押して始めてください。
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} style={{ marginBottom: 16, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{date}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>{items[0].theme}</div>
              </div>
              <div style={{ padding: "10px 16px" }}>
                {items.map((it) => (
                  <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: it.platform.endsWith("tiktok") ? "#ff4f81" : "#66aaff", background: it.platform.endsWith("tiktok") ? "rgba(255,79,129,0.1)" : "rgba(102,170,255,0.1)", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                        {it.platform.endsWith("tiktok") ? "TikTok" : "X"}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-2)" }}>{it.title.replace(`${date} `, "").replace(/^(TikTok|X): /, "")}</span>
                    </div>
                    <span style={{ fontSize: 11, color: it.status === "published" ? "#4ade80" : "var(--text-3)" }}>
                      {it.status === "published" ? "✓ 投稿済" : "下書き"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
