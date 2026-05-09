"use client";

import { useEffect, useState } from "react";
import {
  getAnalyticsByPlatform,
  getAnalyticsByBuyPlatform,
  getBestProducts,
} from "@/lib/api";
import { errMsg } from "@/lib/errors";
import { toast } from "@/components/Toast";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { TrendingUp, ShoppingCart, Award, AlertCircle } from "lucide-react";

// ─── スタイル定数 ──────────────────────────────────────────

const C = {
  gold:  "var(--blue)",
  goldD: "var(--blue-dm)",
  t1:    "var(--text)",
  t2:    "var(--text-2)",
  t3:    "var(--text-3)",
  t4:    "var(--text-4)",
  bg1:   "var(--surface)",
  bd:    "var(--border)",
  up:    "#1E9C3C",
  dn:    "#E02E24",
  ok:    "#E88500",
  info:  "var(--blue-lt)",
};

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "20px 24px",
};

const th: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  color: C.t3,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderBottom: `1px solid ${C.bd}`,
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "12px 12px",
  fontSize: 13,
  color: C.t2,
  borderBottom: `1px solid rgba(212,175,55,0.06)`,
  whiteSpace: "nowrap",
};

// ─── 型定義 ────────────────────────────────────────────────

interface PlatformRow {
  selling_platform: string;
  count: number;
  total_profit: number;
  avg_profit: number;
  avg_rate: number;
}

interface BuyPlatformRow {
  platform: string;
  count: number;
  total_profit: number;
  avg_profit: number;
}

interface BestProduct {
  product_name: string;
  buy_platform: string;
  selling_platform: string;
  purchase_price: number;
  sale_price: number;
  net_profit: number;
  sale_date: string;
  profit_rate: number;
}

// ─── ヘルパー ──────────────────────────────────────────────

function fmt(n: number) { return Math.round(n).toLocaleString(); }

const PLATFORM_EMOJI: Record<string, string> = {
  "Amazon": "📦", "メルカリ": "🏪", "ラクマ": "🛍️", "Yahoo!オークション": "🔨",
  "eBay": "🌏", "eBay（輸出）": "🌏", "Etsy（輸出）": "🎨",
  "PayPayフリマ": "💛", "Amazon.com（米国）": "🇺🇸",
};
function emoji(name: string) { return PLATFORM_EMOJI[name] ?? "🛒"; }

// 利益率から色を返す
function rateColor(r: number) {
  if (r >= 30) return C.gold;
  if (r >= 20) return "#F0D060";
  if (r >= 10) return C.ok;
  if (r >= 0)  return C.t2;
  return C.dn;
}

// ─── KPIカード ─────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 11, color: C.t3, fontWeight: 600, letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: color ?? C.t1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.t3 }}>{sub}</div>}
    </div>
  );
}

// ─── カスタム tooltip ──────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(12,12,14,0.97)", border: `1px solid ${C.bd}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: C.t3, marginBottom: 4 }}>{label}</div>
      <div style={{ color: C.gold, fontWeight: 700 }}>¥{fmt(payload[0].value)}</div>
    </div>
  );
}

// ─── メインページ ──────────────────────────────────────────

export default function PlatformAnalysisPage() {
  const [sellData,  setSellData]  = useState<PlatformRow[]>([]);
  const [buyData,   setBuyData]   = useState<BuyPlatformRow[]>([]);
  const [best,      setBest]      = useState<BestProduct[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [noData,    setNoData]    = useState(false);

  useEffect(() => {
    Promise.all([
      getAnalyticsByPlatform(),
      getAnalyticsByBuyPlatform(),
      getBestProducts(8),
    ])
      .then(([s, b, p]) => {
        setSellData(s);
        setBuyData(b);
        setBest(p);
        setNoData(s.length === 0 && b.length === 0);
      })
      .catch(err => toast(errMsg(err), "error"))
      .finally(() => setLoading(false));
  }, []);

  // KPI集計
  const totalProfit = sellData.reduce((s, r) => s + r.total_profit, 0);
  const totalSales  = sellData.reduce((s, r) => s + r.count, 0);
  const bestPlatform = sellData[0];
  const avgRate = totalSales > 0
    ? sellData.reduce((s, r) => s + r.avg_rate * r.count, 0) / totalSales
    : 0;

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.t1, marginBottom: 24 }}>プラットフォーム別分析</h1>
        <div className="rg-4" style={{ marginBottom: 20 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ ...card, height: 88, animation: "sk 1.6s ease-in-out infinite" }} />
          ))}
        </div>
        <div style={{ ...card, height: 300, animation: "sk 1.6s ease-in-out infinite" }} />
      </div>
    );
  }

  if (noData) {
    return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.t1, marginBottom: 24 }}>プラットフォーム別分析</h1>
        <div style={{ ...card, textAlign: "center", padding: "60px 24px" }}>
          <AlertCircle size={40} color={C.t4} style={{ marginBottom: 16 }} />
          <div style={{ color: C.t3, fontSize: 15 }}>まだ売上データがありません</div>
          <div style={{ color: C.t4, fontSize: 12, marginTop: 8 }}>
            仕入れ管理から「売れた」を記録すると、ここにデータが表示されます
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: C.t1, marginBottom: 24 }}>
        プラットフォーム別分析
      </h1>

      {/* ── KPI ─────────────────────────────────────────── */}
      <div className="rg-4" style={{ marginBottom: 20 }}>
        <KpiCard
          label="総利益"
          value={`¥${fmt(totalProfit)}`}
          sub={`${totalSales}件の販売`}
          color={totalProfit >= 0 ? C.gold : C.dn}
        />
        <KpiCard
          label="最高利益プラットフォーム"
          value={bestPlatform ? `${emoji(bestPlatform.selling_platform)} ${bestPlatform.selling_platform}` : "—"}
          sub={bestPlatform ? `¥${fmt(bestPlatform.total_profit)} / ${bestPlatform.count}件` : undefined}
          color={C.gold}
        />
        <KpiCard
          label="平均利益率"
          value={`${avgRate.toFixed(1)}%`}
          sub="全プラットフォーム平均"
          color={rateColor(avgRate)}
        />
        <KpiCard
          label="仕入れ元数"
          value={String(buyData.length)}
          sub="実績ある仕入れ先"
        />
      </div>

      {/* ── 販売プラットフォーム棒グラフ ─────────────────── */}
      <div className="rg-2" style={{ marginBottom: 20 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={14} color={C.gold} />
            販売先別 総利益
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sellData} margin={{ top: 0, right: 8, bottom: 40, left: 8 }}>
              <XAxis
                dataKey="selling_platform"
                tick={{ fill: C.t3, fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fill: C.t3, fontSize: 11 }} tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_profit" radius={[4, 4, 0, 0]}>
                {sellData.map((r) => (
                  <Cell key={r.selling_platform} fill={r.total_profit >= 0 ? C.gold : C.dn} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingCart size={14} color={C.gold} />
            仕入れ先別 総利益
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={buyData} margin={{ top: 0, right: 8, bottom: 40, left: 8 }}>
              <XAxis
                dataKey="platform"
                tick={{ fill: C.t3, fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fill: C.t3, fontSize: 11 }} tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_profit" radius={[4, 4, 0, 0]}>
                {buyData.map((r) => (
                  <Cell key={r.platform} fill={r.total_profit >= 0 ? C.info : C.dn} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 販売プラットフォーム詳細テーブル ─────────────── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, marginBottom: 14 }}>
          販売先 プラットフォーム詳細
        </div>
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>プラットフォーム</th>
                <th style={{ ...th, textAlign: "right" }}>件数</th>
                <th style={{ ...th, textAlign: "right" }}>総利益</th>
                <th style={{ ...th, textAlign: "right" }}>平均利益</th>
                <th style={{ ...th, textAlign: "right" }}>平均利益率</th>
                <th style={{ ...th, textAlign: "left" }}>利益率バー</th>
              </tr>
            </thead>
            <tbody>
              {sellData.map((r, i) => (
                <tr key={r.selling_platform} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.012)" : "transparent" }}>
                  <td style={td}>
                    <span style={{ marginRight: 6 }}>{emoji(r.selling_platform)}</span>
                    <span style={{ fontWeight: 600, color: C.t1 }}>{r.selling_platform}</span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>{r.count}件</td>
                  <td style={{ ...td, textAlign: "right", color: r.total_profit >= 0 ? C.gold : C.dn, fontWeight: 700 }}>
                    ¥{fmt(r.total_profit)}
                  </td>
                  <td style={{ ...td, textAlign: "right", color: r.avg_profit >= 0 ? C.t1 : C.dn }}>
                    ¥{fmt(r.avg_profit)}
                  </td>
                  <td style={{ ...td, textAlign: "right", color: rateColor(r.avg_rate), fontWeight: 700 }}>
                    {r.avg_rate?.toFixed(1) ?? "—"}%
                  </td>
                  <td style={{ ...td, minWidth: 120 }}>
                    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${Math.min(100, Math.max(0, r.avg_rate ?? 0) * 2)}%`,
                        background: rateColor(r.avg_rate),
                        borderRadius: 4,
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 仕入れ先詳細テーブル ─────────────────────────── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, marginBottom: 14 }}>
          仕入れ先 プラットフォーム詳細
        </div>
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>仕入れ先</th>
                <th style={{ ...th, textAlign: "right" }}>件数</th>
                <th style={{ ...th, textAlign: "right" }}>総利益</th>
                <th style={{ ...th, textAlign: "right" }}>平均利益</th>
              </tr>
            </thead>
            <tbody>
              {buyData.map((r, i) => (
                <tr key={r.platform} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.012)" : "transparent" }}>
                  <td style={td}>
                    <span style={{ fontWeight: 600, color: C.t1 }}>{r.platform}</span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>{r.count}件</td>
                  <td style={{ ...td, textAlign: "right", color: r.total_profit >= 0 ? C.gold : C.dn, fontWeight: 700 }}>
                    ¥{fmt(r.total_profit)}
                  </td>
                  <td style={{ ...td, textAlign: "right", color: r.avg_profit >= 0 ? C.t1 : C.dn }}>
                    ¥{fmt(r.avg_profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ベスト商品ランキング ──────────────────────────── */}
      {best.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Award size={14} color={C.gold} />
            高利益商品 TOP {best.length}
          </div>
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, paddingLeft: 8 }}>#</th>
                  <th style={th}>商品名</th>
                  <th style={th}>仕入れ先</th>
                  <th style={th}>販売先</th>
                  <th style={{ ...th, textAlign: "right" }}>仕入れ</th>
                  <th style={{ ...th, textAlign: "right" }}>販売</th>
                  <th style={{ ...th, textAlign: "right" }}>利益</th>
                  <th style={{ ...th, textAlign: "right" }}>利益率</th>
                </tr>
              </thead>
              <tbody>
                {best.map((p, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.012)" : "transparent" }}>
                    <td style={{ ...td, paddingLeft: 8, color: i < 3 ? C.gold : C.t3, fontWeight: 700 }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </td>
                    <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", color: C.t1 }}>
                      {p.product_name}
                    </td>
                    <td style={{ ...td, color: C.t3, fontSize: 12 }}>{p.buy_platform}</td>
                    <td style={td}>
                      {emoji(p.selling_platform)} {p.selling_platform}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>¥{fmt(p.purchase_price)}</td>
                    <td style={{ ...td, textAlign: "right" }}>¥{fmt(p.sale_price)}</td>
                    <td style={{ ...td, textAlign: "right", color: p.net_profit >= 0 ? C.gold : C.dn, fontWeight: 700 }}>
                      ¥{fmt(p.net_profit)}
                    </td>
                    <td style={{ ...td, textAlign: "right", color: rateColor(p.profit_rate), fontWeight: 700 }}>
                      {p.profit_rate?.toFixed(1)}%
                    </td>
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
