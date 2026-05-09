"use client";

import { useEffect, useState } from "react";
import { getPriceChangeAlerts, type PriceAlert } from "@/lib/api";
import { Bell } from "lucide-react";

const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" };

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    getPriceChangeAlerts(7, 5)
      .then(r => { setAlerts(r.alerts); setCheckedAt(r.checked_at); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <style>{`
        @keyframes sk { 0%,100%{opacity:.9} 50%{opacity:.4} }
        .alert-row:hover { border-color: rgba(212,175,55,0.38) !important; }
        .alert-row { transition: border-color 0.15s; }
        @media (max-width: 768px) {
          .alert-item-row { flex-direction: column !important; align-items: flex-start !important; gap: 8px; }
        }
      `}</style>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", margin: 0 }}>価格変動アラート</h1>
      <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 24, marginTop: 3 }}>
        相場検索で取得した価格履歴をもとに、大きな変動があった商品を表示します（変動率5%以上・過去7日間）
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ ...card, padding: "18px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ width: "45%", height: 15, borderRadius: 6, background: "rgba(212,175,55,0.07)", animation: "sk 1.6s ease-in-out infinite" }} />
                  <div style={{ width: "30%", height: 11, borderRadius: 6, background: "rgba(212,175,55,0.07)", animation: "sk 1.6s ease-in-out infinite" }} />
                </div>
                <div style={{ width: 80, height: 32, borderRadius: 6, background: "rgba(212,175,55,0.07)", animation: "sk 1.6s ease-in-out infinite" }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div style={{ ...card, textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ color: "#ff9966", fontWeight: 700, marginBottom: 8 }}>サーバーに接続できませんでした</div>
          <div style={{ color: "var(--text-3)", fontSize: 13, lineHeight: 1.8 }}>
            バックエンドが起動中の可能性があります。<br />しばらくしてから再読み込みしてください。
          </div>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, background: "transparent", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "var(--blue)", padding: "8px 20px", fontSize: 13, cursor: "pointer" }}>
            再読み込み
          </button>
        </div>
      ) : alerts.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 48 }}>
          <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 50, width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Bell size={28} color="rgba(212,175,55,0.5)" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#C8C0B0", marginBottom: 8 }}>現在アラートはありません</div>
          <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.8 }}>
            「相場検索」でキーワードを繰り返し検索すると<br />
            価格変動を自動で記録・検出します
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {alerts.map((a) => (
            <div key={a.keyword} className="alert-row" style={{
              ...card,
              borderColor: a.direction === "down" ? "rgba(212,175,55,0.35)" : "rgba(255,100,100,0.35)",
            }}>
              <div className="alert-item-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 15 }}>{a.keyword}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3, display: "flex", alignItems: "center", gap: 8 }}>
                    {a.source} · {a.recent_count}件
                    {a.in_watchlist && (
                      <span style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 10, padding: "1px 7px", fontSize: 11, color: "var(--blue)" }}>
                        ウォッチ中
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: a.direction === "down" ? "#D4AF37" : "#ff6666" }}>
                    {a.direction === "down" ? "▼" : "▲"} {Math.abs(a.change_rate)}%
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                    ¥{a.old_avg.toLocaleString()} → ¥{a.recent_avg.toLocaleString()}
                  </div>
                  {a.recent_min !== null && a.recent_min < a.recent_avg && (
                    <div style={{ fontSize: 11, color: "var(--blue)", marginTop: 2 }}>
                      最安値 ¥{a.recent_min.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-3)", background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "6px 12px" }}>
                {a.direction === "down"
                  ? `仕入れチャンス！前回比 ${Math.abs(a.change_rate)}% 値下がりしています`
                  : `価格が上昇中。売り時かもしれません（前回比 +${a.change_rate}%）`}
              </div>
            </div>
          ))}
        </div>
      )}

      {checkedAt && (
        <div style={{ fontSize: 11, color: "#2a5a3a", marginTop: 16, textAlign: "right" }}>
          最終確認: {new Date(checkedAt).toLocaleString("ja-JP")}
        </div>
      )}
    </div>
  );
}
