"use client";

import { useState } from "react";
import { getCompetitionAnalysis, type CompetitionResult } from "@/lib/api";

const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" };

const STATUS_CONFIG = {
  high:         { label: "価格が高め",   color: "#ff9966", bg: "rgba(255,100,50,0.07)",  border: "rgba(255,100,50,0.3)"  },
  competitive:  { label: "競争力あり",   color: "var(--blue)", bg: "rgba(212,175,55,0.06)",    border: "rgba(212,175,55,0.25)"   },
  low:          { label: "価格が低め",   color: "#66ccff", bg: "rgba(100,180,255,0.06)", border: "rgba(100,180,255,0.25)" },
};

export default function CompetitionPage() {
  const [results, setResults] = useState<CompetitionResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const r = await getCompetitionAnalysis();
      setResults(r.results);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "分析に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <style>{`
        .comp-row:hover { border-color: rgba(212,175,55,0.38) !important; }
        .comp-row { transition: border-color 0.15s; }
        @media (max-width: 768px) {
          .comp-summary { grid-template-columns: 1fr !important; }
          .comp-detail-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", margin: 0 }}>競合セラー分析</h1>
      <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 24, marginTop: 3 }}>
        出品中の商品の市場相場をリアルタイムで取得して、あなたの価格の競争力を診断します
      </div>

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 16, lineHeight: 1.8 }}>
          現在「アクティブ」な出品（最大10件）の市場相場を自動で検索・比較します。<br />
          取得に30〜60秒程度かかります。
        </div>
        <button
          onClick={analyze}
          disabled={loading}
          style={{
            background: loading ? "rgba(20,18,8,0.6)" : "linear-gradient(135deg,#1e1608,#2a1e08)",
            border: "1px solid rgba(212,175,55,0.4)",
            borderRadius: 10,
            color: loading ? "#8A8278" : "#D4AF37",
            padding: "13px 32px",
            fontSize: 14,
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "相場を取得中... しばらくお待ちください" : "競合分析を開始"}
        </button>
      </div>

      {error && (
        <div style={{ ...card, marginBottom: 16, borderColor: "rgba(255,100,100,0.35)", color: "#ff9966", fontSize: 13 }}>
          {error}
        </div>
      )}

      {results !== null && results.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#C8C0B0", marginBottom: 8 }}>分析結果がありません</div>
          <div style={{ color: "var(--text-3)", fontSize: 13 }}>
            アクティブな出品がないか、相場データを取得できませんでした
          </div>
        </div>
      )}

      {results !== null && results.length > 0 && (
        <>
          {/* サマリーバー */}
          <div className="comp-summary" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
            {(["high", "competitive", "low"] as const).map(s => {
              const count = results.filter(r => r.status === s).length;
              const cfg = STATUS_CONFIG[s];
              return (
                <div key={s} style={{ ...card, background: cfg.bg, borderColor: cfg.border, textAlign: "center", padding: "16px 20px" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: cfg.color, fontFamily: "monospace" }}>{count}</div>
                  <div style={{ fontSize: 12, color: cfg.color, marginTop: 4 }}>{cfg.label}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {results.map((r, i) => {
              const cfg = STATUS_CONFIG[r.status];
              const margin = r.your_price - r.cost;
              return (
                <div key={i} style={{ ...card, background: cfg.bg, borderColor: cfg.border }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 15 }}>{r.product_name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
                        {r.selling_platform} · 市場 {r.market_items} 件
                      </div>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "4px 14px", fontSize: 12, fontWeight: 700, color: cfg.color, whiteSpace: "nowrap" }}>
                      {cfg.label}
                    </div>
                  </div>

                  <div className="comp-detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 14 }}>
                    {[
                      { label: "自分の価格",   value: `¥${r.your_price.toLocaleString()}`,             color: "var(--text)" },
                      { label: "市場平均",     value: `¥${r.market_avg.toLocaleString()}`,             color: "#66ccff" },
                      { label: "市場最安",     value: `¥${r.market_min.toLocaleString()}`,             color: "#ffcc44" },
                      { label: "平均比",       value: `${r.diff_pct > 0 ? "+" : ""}${r.diff_pct}%`,   color: cfg.color },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
                        <div style={{ fontFamily: "monospace", fontWeight: 700, color, fontSize: 15 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {r.status === "high" && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "#ff9966", background: "rgba(255,80,0,0.06)", borderRadius: 8, padding: "6px 12px" }}>
                      市場平均より {r.diff_pct}% 高め。¥{r.market_avg.toLocaleString()} 前後への値下げを検討してみましょう
                    </div>
                  )}
                  {r.status === "low" && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "#66ccff", background: "rgba(100,180,255,0.06)", borderRadius: 8, padding: "6px 12px" }}>
                      市場平均より {Math.abs(r.diff_pct)}% 安め。利益マージン: ¥{margin.toLocaleString()} ／ 値上げ余地があります
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
