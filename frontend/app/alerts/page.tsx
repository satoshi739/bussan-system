"use client";

import { useEffect, useState } from "react";
import { getPriceChangeAlerts, type PriceAlert } from "@/lib/api";

const card: React.CSSProperties = { background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, padding: "20px 24px" };

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
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", marginBottom: 6 }}>価格変動アラート</h1>
      <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 24 }}>
        相場検索で取得した価格履歴をもとに、大きな変動があった商品を表示します（変動率5%以上・過去7日間）
      </div>

      {loading ? (
        <div style={{ ...card, textAlign: "center", padding: 60, color: "#8A8278" }}>読み込み中...</div>
      ) : error ? (
        <div style={{ ...card, textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ color: "#ff9966", fontWeight: 700, marginBottom: 8 }}>サーバーに接続できませんでした</div>
          <div style={{ color: "#8A8278", fontSize: 13, lineHeight: 1.8 }}>
            バックエンドが起動中の可能性があります。<br />しばらくしてから再読み込みしてください。
          </div>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, background: "transparent", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#D4AF37", padding: "8px 20px", fontSize: 13, cursor: "pointer" }}>
            再読み込み
          </button>
        </div>
      ) : alerts.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
          <div style={{ color: "#8A8278", lineHeight: 1.8 }}>
            現在アラートはありません
            <span style={{ fontSize: 12, display: "block", marginTop: 8 }}>
              「相場検索」でキーワードを繰り返し検索すると<br />
              価格変動を自動で記録・検出します
            </span>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {alerts.map((a) => (
            <div key={a.keyword} style={{
              ...card,
              borderColor: a.direction === "down" ? "rgba(212,175,55,0.35)" : "rgba(255,100,100,0.35)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#F5F0E8", fontSize: 15 }}>{a.keyword}</div>
                  <div style={{ fontSize: 12, color: "#8A8278", marginTop: 3, display: "flex", alignItems: "center", gap: 8 }}>
                    {a.source} · {a.recent_count}件
                    {a.in_watchlist && (
                      <span style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 10, padding: "1px 7px", fontSize: 11, color: "#D4AF37" }}>
                        ウォッチ中
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: a.direction === "down" ? "#D4AF37" : "#ff6666" }}>
                    {a.direction === "down" ? "▼" : "▲"} {Math.abs(a.change_rate)}%
                  </div>
                  <div style={{ fontSize: 12, color: "#8A8278", marginTop: 2 }}>
                    ¥{a.old_avg.toLocaleString()} → ¥{a.recent_avg.toLocaleString()}
                  </div>
                  {a.recent_min !== null && a.recent_min < a.recent_avg && (
                    <div style={{ fontSize: 11, color: "#D4AF37", marginTop: 2 }}>
                      最安値 ¥{a.recent_min.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: "#8A8278", background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "6px 12px" }}>
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
