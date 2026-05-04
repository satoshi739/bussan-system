"use client";

import RequirePlan from "@/components/RequirePlan";
import { useEffect, useState } from "react";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";
import {
  getAnalyticsByPlatform, getAnalyticsByBuyPlatform, getBestProducts,
  getSalesTrends, getMonthlyReport, sendMonthlyReportLine, getRouteMatrix,
  type MonthlyReport, type SalesTrends, type RouteMatrixRow,
} from "@/lib/api";

const card: React.CSSProperties = { background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, padding: "20px 24px" };
type Tab = "analytics" | "trends" | "monthly" | "route";

type BestProduct = { product_name: string; buy_platform: string; selling_platform: string; purchase_price: number; sale_price: number; net_profit: number; sale_date: string; profit_rate: number };

function ReportPageContent() {
  const [tab, setTab] = useState<Tab>("analytics");

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", marginBottom: 6 }}>レポート</h1>
      <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 20 }}>売上分析・トレンド予測・月次レポートを確認できます</div>

      {/* タブ */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "rgba(0,10,3,0.8)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 12, padding: 5, width: "fit-content", flexWrap: "wrap" }}>
        {([
          { id: "analytics", label: "📊 売上分析" },
          { id: "trends",    label: "📈 トレンド予測" },
          { id: "monthly",   label: "📋 月次レポート" },
          { id: "route",     label: "🗺 ルート分析" },
        ] as { id: Tab; label: string }[]).map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: tab === id ? "linear-gradient(135deg,#1e1608,#2a1e08)" : "transparent", color: tab === id ? "#D4AF37" : "#7aaa8a", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "analytics" && <AnalyticsTab />}
      {tab === "trends"    && <TrendsTab />}
      {tab === "monthly"   && <MonthlyTab />}
      {tab === "route"     && <RouteMatrixTab />}
    </div>
  );
}

/* ── 既存の売上分析タブ ── */
function AnalyticsTab() {
  const [byPlatform, setByPlatform] = useState<{ selling_platform: string; count: number; total_profit: number; avg_profit: number; avg_rate: number }[]>([]);
  const [byBuy, setByBuy] = useState<{ platform: string; count: number; total_profit: number; avg_profit: number }[]>([]);
  const [bestProducts, setBestProducts] = useState<BestProduct[]>([]);
  const [apiError, setApiError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAnalyticsByPlatform(),
      getAnalyticsByBuyPlatform(),
      getBestProducts(10),
    ])
      .then(([p, b, bp]) => { setByPlatform(p); setByBuy(b); setBestProducts(bp); })
      .catch(() => setApiError(true))
      .finally(() => setLoading(false));
  }, []);

  const maxProfit = Math.max(...byPlatform.map(r => r.total_profit), 1);
  const maxBuy = Math.max(...byBuy.map(r => r.total_profit), 1);
  const noData = byPlatform.length === 0 && byBuy.length === 0 && bestProducts.length === 0;

  if (loading) return <div style={{ ...card, textAlign: "center", padding: 60, color: "#8A8278" }}>読み込み中...</div>;

  if (apiError) {
    return (
      <div style={{ ...card, textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ color: "#ff9966", fontWeight: 700, marginBottom: 8 }}>サーバーに接続できませんでした</div>
        <div style={{ color: "#8A8278", fontSize: 13 }}>しばらくしてから再読み込みしてください。</div>
        <button onClick={() => window.location.reload()} style={{ marginTop: 16, background: "transparent", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#D4AF37", padding: "8px 20px", fontSize: 13, cursor: "pointer" }}>再読み込み</button>
      </div>
    );
  }

  if (noData) {
    return (
      <div style={{ ...card, textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div style={{ color: "#8A8278" }}>売上データが溜まると<br />ここに分析が表示されます</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {bestProducts.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#C8C0B0", marginBottom: 4 }}>🏆 ベスト商品ランキング（利益額順）</div>
          <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 16 }}>また仕入れるべき商品がわかります</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {bestProducts.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: i === 0 ? "rgba(212,175,55,0.06)" : "transparent", borderRadius: 10, border: i === 0 ? "1px solid rgba(212,175,55,0.2)" : "1px solid transparent" }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: i === 0 ? "#D4AF37" : i === 1 ? "#aaa" : i === 2 ? "#cc8844" : "#8A8278", width: 24, textAlign: "center", flexShrink: 0 }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#F5F0E8", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.product_name}</div>
                  <div style={{ fontSize: 11, color: "#8A8278" }}>{p.buy_platform} → {p.selling_platform} · {p.sale_date}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "monospace", fontWeight: 800, color: "#D4AF37", fontSize: 15 }}>+¥{Math.round(p.net_profit).toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: "#9A7D25" }}>利益率 {p.profit_rate?.toFixed(1) ?? "-"}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#C8C0B0", marginBottom: 16 }}>📤 販売プラットフォーム別利益</div>
          {byPlatform.length === 0 ? (
            <div style={{ color: "#8A8278", textAlign: "center", padding: 40 }}>データなし</div>
          ) : byPlatform.map(row => (
            <div key={row.selling_platform} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: "#F5F0E8", fontWeight: 600 }}>{row.selling_platform}</span>
                <span style={{ fontSize: 13, color: "#D4AF37", fontFamily: "monospace", fontWeight: 700 }}>¥{Math.round(row.total_profit).toLocaleString()}</span>
              </div>
              <div style={{ background: "rgba(212,175,55,0.06)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(row.total_profit / maxProfit) * 100}%`, background: "linear-gradient(90deg,#1e1608,#D4AF37)", borderRadius: 4 }} />
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 11, color: "#8A8278" }}>
                <span>{row.count}件</span>
                <span>平均利益 ¥{Math.round(row.avg_profit).toLocaleString()}</span>
                <span>平均利益率 {row.avg_rate?.toFixed(1) ?? "-"}%</span>
              </div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#C8C0B0", marginBottom: 16 }}>📥 仕入れ元別利益</div>
          {byBuy.length === 0 ? (
            <div style={{ color: "#8A8278", textAlign: "center", padding: 40 }}>データなし</div>
          ) : byBuy.map(row => (
            <div key={row.platform} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: "#F5F0E8", fontWeight: 600 }}>{row.platform}</span>
                <span style={{ fontSize: 13, color: "#66ccff", fontFamily: "monospace", fontWeight: 700 }}>¥{Math.round(row.total_profit).toLocaleString()}</span>
              </div>
              <div style={{ background: "rgba(100,200,255,0.06)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(row.total_profit / maxBuy) * 100}%`, background: "linear-gradient(90deg,#003050,#66ccff)", borderRadius: 4 }} />
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 11, color: "#8A8278" }}>
                <span>{row.count}件</span>
                <span>平均利益 ¥{Math.round(row.avg_profit).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 売れ筋トレンド予測タブ ── */
function TrendsTab() {
  const [data, setData] = useState<SalesTrends | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSalesTrends(6)
      .then(setData)
      .catch(e => toast(errMsg(e), "error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ ...card, textAlign: "center", padding: 60, color: "#8A8278" }}>読み込み中...</div>;
  if (!data || (data.monthly_totals.length === 0 && data.trending_products.length === 0)) {
    return (
      <div style={{ ...card, textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
        <div style={{ color: "#8A8278" }}>売上データが溜まるとトレンドが表示されます</div>
      </div>
    );
  }

  // 月別推移グラフ用
  const maxMonthlyProfit = Math.max(...data.monthly_totals.map(r => r.profit), 1);

  // プラットフォーム×月のヒートマップ用データ
  const platforms = [...new Set(data.monthly_by_platform.map(r => r.selling_platform))];
  const months = [...new Set(data.monthly_by_platform.map(r => r.month))].sort();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 月別利益推移 */}
      {data.monthly_totals.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#C8C0B0", marginBottom: 4 }}>📅 月別利益推移（過去6ヶ月）</div>
          <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 16 }}>利益の増減トレンドを確認できます</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
            {data.monthly_totals.map((r, i) => {
              const h = maxMonthlyProfit > 0 ? Math.max(8, (r.profit / maxMonthlyProfit) * 100) : 8;
              const prev = data.monthly_totals[i - 1];
              const growth = prev && prev.profit > 0 ? ((r.profit - prev.profit) / prev.profit * 100).toFixed(1) : null;
              return (
                <div key={r.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 11, color: growth !== null ? (Number(growth) >= 0 ? "#D4AF37" : "#ff6666") : "#8A8278", fontWeight: 700, height: 16 }}>
                    {growth !== null ? `${Number(growth) >= 0 ? "+" : ""}${growth}%` : ""}
                  </div>
                  <div style={{ width: "100%", height: `${h}px`, background: "linear-gradient(180deg,#D4AF37,#1e1608)", borderRadius: "4px 4px 0 0", minHeight: 8 }} />
                  <div style={{ fontSize: 10, color: "#8A8278", textAlign: "center" }}>{r.month.slice(5)}月</div>
                  <div style={{ fontSize: 11, color: "#D4AF37", fontFamily: "monospace", fontWeight: 700 }}>¥{Math.round(r.profit / 1000)}k</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 売れ筋商品ランキング */}
      {data.trending_products.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#C8C0B0", marginBottom: 4 }}>🔥 売れ筋商品ランキング（過去6ヶ月）</div>
          <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 16 }}>繰り返し仕入れるべき商品がわかります</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.trending_products.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: i < 3 ? "rgba(212,175,55,0.04)" : "transparent", borderRadius: 10, border: "1px solid rgba(212,175,55,0.08)" }}>
                <div style={{ fontSize: 15, width: 28, textAlign: "center", flexShrink: 0, color: i === 0 ? "#D4AF37" : i === 1 ? "#aaa" : i === 2 ? "#cc8844" : "#8A8278", fontWeight: 900 }}>
                  {i === 0 ? "🔥" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#F5F0E8", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.product_name}</div>
                  <div style={{ fontSize: 11, color: "#8A8278" }}>最終: {p.last_sold} · 平均利益率 {p.avg_rate}%</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "monospace", fontWeight: 800, color: "#D4AF37", fontSize: 14 }}>¥{p.total_profit.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: "#8A8278" }}>{p.sale_count}回販売</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* プラットフォーム×月 */}
      {months.length > 0 && platforms.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#C8C0B0", marginBottom: 16 }}>🗓️ プラットフォーム別月次推移</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", color: "#8A8278", padding: "6px 10px", fontWeight: 600 }}>プラットフォーム</th>
                  {months.map(m => <th key={m} style={{ color: "#8A8278", padding: "6px 10px", fontWeight: 600 }}>{m.slice(5)}月</th>)}
                </tr>
              </thead>
              <tbody>
                {platforms.map(pf => (
                  <tr key={pf}>
                    <td style={{ color: "#F5F0E8", padding: "8px 10px", fontWeight: 600 }}>{pf}</td>
                    {months.map(m => {
                      const cell = data.monthly_by_platform.find(r => r.selling_platform === pf && r.month === m);
                      return (
                        <td key={m} style={{ textAlign: "center", padding: "8px 10px" }}>
                          {cell ? (
                            <div>
                              <div style={{ fontFamily: "monospace", color: "#D4AF37", fontWeight: 700 }}>¥{Math.round(cell.total_profit / 1000)}k</div>
                              <div style={{ color: "#8A8278", fontSize: 10 }}>{cell.count}件</div>
                            </div>
                          ) : <span style={{ color: "#2a4a3a" }}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function _getDefaultMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/* ── 月次レポートタブ ── */
function MonthlyTab() {
  const now = new Date();
  const currentMonth = _getDefaultMonth();
  const [month, setMonth] = useState(currentMonth);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState("");

  const load = (m: string) => {
    setLoading(true);
    setReport(null);
    getMonthlyReport(m)
      .then(setReport)
      .catch(e => toast(errMsg(e), "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(currentMonth); }, [currentMonth]);

  const sendLine = async () => {
    setSending(true);
    setSentMsg("");
    try {
      await sendMonthlyReportLine(month);
      setSentMsg("LINEに送信しました！");
    } catch (e: unknown) {
      setSentMsg(e instanceof Error ? e.message : "送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  // 月選択: 過去12ヶ月
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* コントロールバー */}
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 12, color: "#8A8278", display: "block", marginBottom: 4 }}>対象月</label>
          <select
            value={month}
            onChange={e => { setMonth(e.target.value); load(e.target.value); }}
            style={{ background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#F5F0E8", padding: "8px 12px", fontSize: 14, outline: "none" }}
          >
            {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {sentMsg && <span style={{ fontSize: 12, color: sentMsg.includes("失敗") ? "#ff9966" : "#D4AF37" }}>{sentMsg}</span>}
          <button
            onClick={sendLine}
            disabled={sending || !report}
            style={{ background: "transparent", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 8, color: "#4a9a5a", padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            {sending ? "送信中..." : "📱 LINEに送る"}
          </button>
        </div>
      </div>

      {loading && <div style={{ ...card, textAlign: "center", padding: 60, color: "#8A8278" }}>読み込み中...</div>}

      {report && !loading && (
        <>
          {/* KPIカード */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "総利益",     value: `¥${report.summary.total_profit.toLocaleString()}`,  color: "#D4AF37",  sub: report.profit_growth ? `前月比 ${report.profit_growth > 0 ? "+" : ""}${report.profit_growth}%` : "前月データなし" },
              { label: "販売件数",   value: `${report.summary.sale_count}件`,                     color: "#66ccff",  sub: `前月: ${report.prev_month.sale_count}件` },
              { label: "平均利益率", value: `${report.summary.avg_rate}%`,                        color: "#ffcc44",  sub: `平均利益 ¥${report.summary.avg_profit.toLocaleString()}` },
              { label: "仕入れ投資", value: `¥${report.purchases.invested.toLocaleString()}`,     color: "#ff9966",  sub: `${report.purchases.count}件仕入れ` },
            ].map(({ label, value, color, sub }) => (
              <div key={label} style={{ ...card }}>
                <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: "monospace" }}>{value}</div>
                <div style={{ fontSize: 11, color: "#8A8278", marginTop: 4 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* 目標達成率 */}
          {report.goal > 0 && (
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#C8C0B0" }}>🎯 月次目標達成率</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#D4AF37", fontFamily: "monospace" }}>
                  {report.goal_achievement ?? 0}%
                </div>
              </div>
              <div style={{ background: "rgba(212,175,55,0.06)", borderRadius: 6, height: 12, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, report.goal_achievement ?? 0)}%`, background: "linear-gradient(90deg,#1e1608,#D4AF37)", borderRadius: 6, transition: "width 0.5s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "#8A8278" }}>
                <span>¥{report.summary.total_profit.toLocaleString()}</span>
                <span>目標 ¥{report.goal.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* プラットフォーム別 */}
          {report.by_platform.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#C8C0B0", marginBottom: 16 }}>📤 プラットフォーム別実績</div>
              {report.by_platform.map((p, i) => {
                const maxP = Math.max(...report.by_platform.map(x => x.profit), 1);
                return (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: "#F5F0E8", fontWeight: 600 }}>{p.selling_platform}</span>
                      <span style={{ fontSize: 13, color: "#D4AF37", fontFamily: "monospace" }}>¥{p.profit.toLocaleString()}</span>
                    </div>
                    <div style={{ background: "rgba(212,175,55,0.06)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(p.profit / maxP) * 100}%`, background: "linear-gradient(90deg,#1e1608,#D4AF37)", borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#8A8278", marginTop: 3 }}>{p.count}件 · 平均利益率 {p.avg_rate}%</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ベスト商品 */}
          {report.best_products.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#C8C0B0", marginBottom: 16 }}>🏆 今月のベスト商品</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {report.best_products.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: i === 0 ? "rgba(212,175,55,0.05)" : "transparent", borderRadius: 10, border: "1px solid rgba(212,175,55,0.08)" }}>
                    <div style={{ fontSize: 14, width: 24, textAlign: "center", color: i === 0 ? "#D4AF37" : i === 1 ? "#aaa" : "#cc8844" }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#F5F0E8", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.product_name}</div>
                      <div style={{ fontSize: 11, color: "#8A8278" }}>{p.buy_platform} → {p.selling_platform}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "monospace", fontWeight: 800, color: "#D4AF37" }}>¥{p.net_profit.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: "#9A7D25" }}>{p.profit_rate}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.summary.sale_count === 0 && (
            <div style={{ ...card, textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ color: "#8A8278" }}>{month} の売上データはありません</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── 仕入れルート × 販売先 マトリクス分析 ── */
function RouteMatrixTab() {
  const [rows, setRows] = useState<RouteMatrixRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRouteMatrix()
      .then(setRows)
      .catch(e => toast(errMsg(e), "error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ ...card, textAlign: "center", padding: 60, color: "#8A8278" }}>読み込み中...</div>;

  if (rows.length === 0) {
    return (
      <div style={{ ...card, textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🗺</div>
        <div style={{ color: "#8A8278" }}>売上データが溜まると<br />仕入れ先×販売先の収益マトリクスが表示されます</div>
      </div>
    );
  }

  const maxProfit = Math.max(...rows.map(r => r.total_profit), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#C8C0B0", marginBottom: 4 }}>🗺 仕入れ先 × 販売先 ルート分析</div>
        <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 20 }}>どのルートが最も利益を生んでいるかを可視化します</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(212,175,55,0.12)" }}>
                {[
                  { label: "仕入れ元",   align: "left"  as const },
                  { label: "販売先",     align: "left"  as const },
                  { label: "件数",       align: "right" as const },
                  { label: "総利益",     align: "right" as const },
                  { label: "平均利益",   align: "right" as const },
                  { label: "平均利益率", align: "right" as const },
                  { label: "平均日数",   align: "right" as const },
                  { label: "利益シェア", align: "left"  as const },
                ].map(({ label, align }) => (
                  <th key={label} style={{ padding: "8px 12px", color: "#8A8278", fontWeight: 600, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.07em", textAlign: align }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const share = (r.total_profit / maxProfit) * 100;
                const rateCol = r.avg_rate >= 25 ? "#D4AF37" : r.avg_rate >= 15 ? "#ffcc44" : r.avg_rate >= 5 ? "#66ccff" : "#ff9966";
                return (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,175,55,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 12px", color: "#F5F0E8", fontWeight: 600 }}>{r.buy_platform}</td>
                    <td style={{ padding: "12px 12px", color: "#C8C0B0" }}>{r.sell_platform}</td>
                    <td style={{ padding: "12px 12px", textAlign: "right", color: "#8A8278", fontFamily: "monospace" }}>{r.count}</td>
                    <td style={{ padding: "12px 12px", textAlign: "right", color: "#D4AF37", fontFamily: "monospace", fontWeight: 700 }}>
                      ¥{Math.round(r.total_profit).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 12px", textAlign: "right", color: "#C8C0B0", fontFamily: "monospace" }}>
                      ¥{Math.round(r.avg_profit).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 12px", textAlign: "right", color: rateCol, fontFamily: "monospace", fontWeight: 700 }}>
                      {r.avg_rate.toFixed(1)}%
                    </td>
                    <td style={{ padding: "12px 12px", textAlign: "right", color: "#8A8278", fontFamily: "monospace" }}>
                      {r.avg_days.toFixed(1)}日
                    </td>
                    <td style={{ padding: "12px 20px 12px 12px", minWidth: 120 }}>
                      <div style={{ background: "rgba(212,175,55,0.06)", borderRadius: 3, height: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${share}%`, background: "linear-gradient(90deg,#1e1608,#D4AF37)", borderRadius: 3 }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* サマリーカード */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          {
            label: "最高利益ルート",
            value: `${rows[0]?.buy_platform} → ${rows[0]?.sell_platform}`,
            sub: `¥${Math.round(rows[0]?.total_profit ?? 0).toLocaleString()} 総利益`,
            col: "#D4AF37",
          },
          {
            label: "最高利益率ルート",
            value: (() => { const r = [...rows].sort((a,b) => b.avg_rate - a.avg_rate)[0]; return r ? `${r.buy_platform} → ${r.sell_platform}` : "—"; })(),
            sub: (() => { const r = [...rows].sort((a,b) => b.avg_rate - a.avg_rate)[0]; return r ? `平均 ${r.avg_rate.toFixed(1)}% 利益率` : ""; })(),
            col: "#ffcc44",
          },
          {
            label: "最速回転ルート",
            value: (() => { const r = [...rows].filter(x => x.count >= 2).sort((a,b) => a.avg_days - b.avg_days)[0]; return r ? `${r.buy_platform} → ${r.sell_platform}` : "—"; })(),
            sub: (() => { const r = [...rows].filter(x => x.count >= 2).sort((a,b) => a.avg_days - b.avg_days)[0]; return r ? `平均 ${r.avg_days.toFixed(1)} 日で売却` : "2件以上のルートで算出"; })(),
            col: "#66ccff",
          },
        ].map(({ label, value, sub, col }) => (
          <div key={label} style={{ ...card, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8A8278", letterSpacing: "0.07em", textTransform: "uppercase" as const, marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: col, marginBottom: 4, lineHeight: 1.3 }}>{value}</div>
            <div style={{ fontSize: 11, color: "#8A8278" }}>{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <RequirePlan requiredPlan="STANDARD" featureName="レポート・分析">
      <ReportPageContent />
    </RequirePlan>
  );
}
