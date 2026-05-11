"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, RefreshCw, ExternalLink, TrendingUp, ShoppingCart } from "lucide-react";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";

const BASE = "/api/proxy";

type TopItem = {
  name: string;
  buy_price: number;
  buy_url: string;
  buy_image?: string;
  buy_source: string;
  sell_platform: string;
  sell_platform_name?: string;
  net_profit_jpy: number;
  profit_rate: number;
  roi: number;
  score: number;
  rating: string;
  genre_label?: string;
};

const RATING_COLOR: Record<string, string> = {
  excellent: "#D4AF37",
  good:      "#F0D060",
  ok:        "#ffcc44",
  marginal:  "#ff9944",
  loss:      "#ff4444",
};

const RATING_LABEL: Record<string, string> = {
  excellent: "強くおすすめ",
  good:      "おすすめ",
  ok:        "普通",
  marginal:  "様子見",
  loss:      "見送り",
};

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={44} height={44} style={{ display: "block", flexShrink: 0 }}>
      <circle cx={22} cy={22} r={r} fill="none" stroke="rgba(212,175,55,0.08)" strokeWidth={4} />
      <circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
      <text x={22} y={26} textAnchor="middle" fontSize={11} fontWeight={800} fill={color}>
        {Math.round(score)}
      </text>
    </svg>
  );
}

export default function DiscoverPage() {
  const [items, setItems] = useState<TopItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "pending" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/top-today`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.items ?? []);
      setUpdatedAt(data.updated_at ?? null);
      setStatus(data.items?.length > 0 ? "ready" : "pending");
    } catch (e) {
      setStatus("error");
      toast(errMsg(e), "error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${BASE}/api/top-today/refresh`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      toast("スキャン完了！最新データを読み込みます", "success");
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")} 更新`;
  };

  return (
    <div style={{ padding: "24px 20px", maxWidth: 860, margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={22} color="#D4AF37" />
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>
              今日のおすすめ商品
            </h1>
            <span style={{ fontSize: 11, background: "rgba(212,175,55,0.15)", color: "#D4AF37", borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>
              毎朝6時更新
            </span>
          </div>
          {updatedAt && (
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, marginLeft: 32 }}>
              {formatDate(updatedAt)}
            </div>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)",
            borderRadius: 8, padding: "8px 14px", color: "#D4AF37",
            fontSize: 13, fontWeight: 700, cursor: refreshing ? "not-allowed" : "pointer", opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          {refreshing ? "スキャン中..." : "今すぐスキャン"}
        </button>
      </div>

      {/* 説明 */}
      <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>
        <TrendingUp size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
        人気10ジャンルを毎朝自動スキャン。スコア順に並んでいます。気になる商品はリンクから仕入れ先を確認してください。
      </div>

      {/* ローディング */}
      {status === "loading" && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-3)", fontSize: 14 }}>
          読み込み中...
        </div>
      )}

      {/* 準備中 */}
      {status === "pending" && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Sparkles size={40} color="rgba(212,175,55,0.3)" style={{ margin: "0 auto 16px" }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-2)", marginBottom: 8 }}>
            まだスキャンが実行されていません
          </div>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
            毎朝6時に自動実行されます。今すぐ確認したい場合は「今すぐスキャン」を押してください。
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ background: "#D4AF37", border: "none", borderRadius: 8, padding: "10px 20px", color: "#000", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
          >
            {refreshing ? "スキャン中..." : "今すぐスキャン"}
          </button>
        </div>
      )}

      {/* 商品リスト */}
      {status === "ready" && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item, i) => {
            const color = RATING_COLOR[item.rating] ?? "#D4AF37";
            return (
              <div key={i} style={{
                background: "var(--surface)",
                border: `1px solid ${i === 0 ? "rgba(212,175,55,0.4)" : "var(--border)"}`,
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                position: "relative",
              }}>
                {/* 順位 */}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: i < 3 ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 900, color: i < 3 ? "#D4AF37" : "var(--text-3)",
                }}>
                  {i + 1}
                </div>

                {/* スコアリング */}
                <ScoreRing score={item.score} color={color} />

                {/* 商品情報 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    {item.genre_label && (
                      <span style={{ fontSize: 10, background: "rgba(255,255,255,0.05)", color: "var(--text-3)", borderRadius: 4, padding: "1px 6px", flexShrink: 0 }}>
                        {item.genre_label}
                      </span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.name}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "var(--text-2)", flexWrap: "wrap" }}>
                    <span>
                      <ShoppingCart size={11} style={{ display: "inline", marginRight: 3, verticalAlign: "middle" }} />
                      仕入 <strong style={{ color: "var(--text)" }}>¥{item.buy_price.toLocaleString()}</strong>
                      <span style={{ color: "var(--text-3)", margin: "0 4px" }}>@{item.buy_source}</span>
                    </span>
                    <span>
                      利益 <strong style={{ color }}> ¥{Math.round(item.net_profit_jpy).toLocaleString()}</strong>
                    </span>
                    <span style={{ color: "var(--text-3)" }}>
                      利益率 {item.profit_rate.toFixed(0)}% / ROI {item.roi.toFixed(0)}%
                    </span>
                  </div>
                  {/* 利益バー */}
                  <div style={{ height: 3, background: "rgba(212,175,55,0.08)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, item.profit_rate))}%`, background: color, borderRadius: 2, transition: "width 0.5s ease" }} />
                  </div>
                </div>

                {/* レーティング + リンク */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color, background: `${color}18`, borderRadius: 5, padding: "2px 8px" }}>
                    {RATING_LABEL[item.rating] ?? item.rating}
                  </span>
                  {item.buy_url && (
                    <a
                      href={item.buy_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-3)", textDecoration: "none" }}
                    >
                      <ExternalLink size={12} />
                      仕入れ先
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
