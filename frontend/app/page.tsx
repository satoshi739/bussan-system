"use client";

import { useEffect, useState, useCallback } from "react";
import { getDashboard, getStalePurchases, getPurchases, getGoal, setGoal, type Dashboard, type Purchase } from "@/lib/api";
import { TrendingUp, ShoppingCart, Package, Banknote, Target, Pencil, Check, RefreshCw, WifiOff, AlertTriangle, Zap, ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Award, Tag, ExternalLink, Play, Star } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

// ─────────────────────────────────────────────────────────
//  Design System — Premium Dark × Real Gold
//  bg must be clearly darker than card; gold must LOOK gold
// ─────────────────────────────────────────────────────────
const C = {
  // backgrounds — 3-step lift
  bg0:  "#0a0a0b",   // page base (deep black)
  bg1:  "#141414",   // card surface
  bg2:  "#1c1c1e",   // elevated / header tint
  bg3:  "#242424",   // tooltips, dropdowns

  // text
  t1:   "#F5F0E8",   // primary warm white
  t2:   "#C8C0B0",   // secondary
  t3:   "#8A8278",   // muted
  t4:   "#3A3830",   // faint decorative

  // accent — gold
  gold:   "#D4AF37",   // classic gold
  goldLt: "#F0D060",   // bright gold highlight
  goldDm: "#9A7D25",   // dim gold for borders

  // signal colors
  up:    "#4ade80",   // profit positive (green)
  dn:    "#f87171",   // profit negative (red)
  warn:  "#fbbf24",   // amber warning
  info:  "#D4AF37",   // gold info

  // borders
  bd:    "rgba(212,175,55,0.18)",
  bdSt:  "rgba(212,175,55,0.38)",
  bdSub: "rgba(212,175,55,0.09)",
};

// Card style — clean solid, no grain noise
const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: C.bg1,
  border: `1px solid ${C.bd}`,
  borderRadius: 12,
  padding: "22px 24px",
  ...extra,
});

// ── Sample data ──────────────────────────────────────────
const SAMPLE: Dashboard = {
  stats: { total_purchases: 47, total_invested: 312000, total_sold: 39, total_profit: 98400 },
  monthly_profit: [
    { month: "04月", profit: 98400, sales_count: 12 },
    { month: "03月", profit: 83100, sales_count: 10 },
    { month: "02月", profit: 71200, sales_count: 9 },
    { month: "01月", profit: 58900, sales_count: 7 },
    { month: "12月", profit: 92000, sales_count: 14 },
    { month: "11月", profit: 64300, sales_count: 8 },
  ],
  status_breakdown: [
    { status: "purchased", count: 8 },
    { status: "listed",    count: 12 },
    { status: "sold",      count: 39 },
    { status: "cancelled", count: 2 },
  ],
  platform_breakdown: [
    { platform: "Amazon",  count: 22 },
    { platform: "メルカリ", count: 17 },
    { platform: "eBay",    count: 8 },
  ],
};
const SAMPLE_STALE: Purchase[] = [
  { id: 1, product_name: "ゲームボーイソフト まとめ", platform: "ヤフオク", purchase_price: 3200, purchase_shipping: 0, purchase_date: "2026-03-28", status: "purchased", created_at: "2026-03-28T00:00:00Z" },
  { id: 2, product_name: "レゴ クラシック 10698",     platform: "メルカリ", purchase_price: 4800, purchase_shipping: 0, purchase_date: "2026-03-25", status: "purchased", created_at: "2026-03-25T00:00:00Z" },
];

// ── Skeleton ─────────────────────────────────────────────
function Sk({ w = "100%", h = 16, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: `rgba(217,169,60,0.07)`, animation: "sk 1.6s ease-in-out infinite" }} />;
}

// ── Diff Badge ───────────────────────────────────────────
function DiffBadge({ val, unit = "%" }: { val: number; unit?: string }) {
  if (Math.abs(val) < 0.5) return (
    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: C.t3 }}>
      <Minus size={10} /> 前月比 横ばい
    </span>
  );
  const up = val > 0;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: up ? C.up : C.dn }}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      前月比 {up ? "+" : ""}{val.toFixed(1)}{unit}
    </span>
  );
}

// ── KPI Card ─────────────────────────────────────────────
function KpiCard({ label, value, diff, sub, icon: Icon, accent, href, loading }: {
  label: string; value: string; diff?: number; sub?: string;
  icon: React.ElementType; accent: string; href?: string; loading?: boolean;
}) {
  const inner = (
    <div style={{
      background: C.bg1,
      border: `1px solid ${C.bd}`,
      borderTop: `2px solid ${accent}`,
      borderRadius: 12,
      padding: "18px 20px",
      height: "100%",
      cursor: href ? "pointer" : "default",
      transition: "border-color 0.2s, box-shadow 0.2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, letterSpacing: "0.10em", textTransform: "uppercase" }}>
          {label}
        </span>
        <div style={{ background: `${accent}18`, border: `1px solid ${accent}30`, borderRadius: 7, padding: "4px 5px" }}>
          <Icon size={12} color={accent} />
        </div>
      </div>
      {loading ? (
        <><Sk h={28} w="60%" /><div style={{ marginTop: 10 }}><Sk h={11} w="44%" /></div></>
      ) : (
        <>
          <div style={{ fontSize: 26, fontWeight: 800, color: accent, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>
            {value}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {diff !== undefined && <DiffBadge val={diff} />}
            {sub && <span style={{ fontSize: 11, color: C.t3 }}>{sub}</span>}
          </div>
        </>
      )}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none", display: "block" }}>{inner}</Link> : inner;
}

// ── Health grade ─────────────────────────────────────────
function healthGrade(r: number) {
  if (r >= 30) return { g: "S", color: C.goldLt, label: "超優良" };
  if (r >= 20) return { g: "A", color: C.gold,   label: "優良"   };
  if (r >= 10) return { g: "B", color: C.warn,   label: "標準"   };
  return              { g: "C", color: C.dn,     label: "要改善" };
}

// ── Status config ────────────────────────────────────────
const SL: Record<string, string> = { purchased: "仕入済", listed: "出品中", sold: "売却済", cancelled: "取消" };
const SC: Record<string, string> = { purchased: C.warn, listed: C.gold, sold: C.up, cancelled: C.t3 };
const AL: Record<string, string> = { danger: C.dn, warning: C.warn, info: C.info };

// ── Rule divider ─────────────────────────────────────────
const Hr = () => <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${C.bd},transparent)`, margin: "14px 0" }} />;

// ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data,      setData]       = useState<Dashboard | null>(null);
  const [stale,     setStale]      = useState<Purchase[]>([]);
  const [recent,    setRecent]     = useState<Purchase[]>([]);
  const [goal,      setGoalData]   = useState<{ month: string; goal: number; current_profit: number } | null>(null);
  const [editGoal,  setEditGoal]   = useState(false);
  const [goalInput, setGoalInput]  = useState("");
  const [error,     setError]      = useState(false);
  const [retry,     setRetry]      = useState(0);
  const [countdown, setCountdown]  = useState(5);
  const [loading,   setLoading]    = useState(true);
  const [sample,    setSample]     = useState(false);
  const [updated,   setUpdated]    = useState<Date | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getDashboard();
      setData(d); setError(false); setUpdated(new Date());
      getStalePurchases(14).then(setStale).catch(() => {});
      getPurchases({ limit: 5 }).then(setRecent).catch(() => {});
      getGoal().then(setGoalData).catch(() => {});
    } catch {
      setError(true);
      setData(p => p ?? { stats: { total_purchases: 0, total_invested: 0, total_sold: 0, total_profit: 0 }, monthly_profit: [], status_breakdown: [], platform_breakdown: [] });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!error) return;
    setCountdown(5);
    const t = setInterval(() => setCountdown(c => { if (c <= 1) { loadAll(); setRetry(r => r + 1); return 5; } return c - 1; }), 1000);
    return () => clearInterval(t);
  }, [error, retry, loadAll]);

  const saveGoal = async () => {
    await setGoal(Number(goalInput));
    const g = await getGoal();
    setGoalData(g); setEditGoal(false);
  };

  // data wiring
  const useSample = sample || (data?.stats.total_purchases === 0 && !loading && !error);
  const d         = useSample ? SAMPLE : data;
  const stales    = useSample ? SAMPLE_STALE : stale;
  const recents   = useSample
    ? SAMPLE.monthly_profit.map((_, i) => ({ id: i, product_name: ["ゲームボーイカセット", "ポケモンカード BOX", "レゴ クラシック", "ニンテンドーDS"][i % 4], platform: "メルカリ", purchase_price: [3200, 12000, 4800, 6500][i % 4], purchase_shipping: 0, purchase_date: "2026-04-10", status: "purchased", created_at: "" } as Purchase))
    : recent;

  const stats   = d?.stats ?? { total_purchases: 0, total_invested: 0, total_sold: 0, total_profit: 0 };
  const monthly = d?.monthly_profit ?? [];
  const sbdown  = d?.status_breakdown ?? [];

  const thisM   = monthly[0]?.profit ?? 0;
  const prevM   = monthly[1]?.profit ?? 0;
  const pDiff   = prevM !== 0 ? ((thisM - prevM) / Math.abs(prevM)) * 100 : 0;
  const rate    = stats.total_invested > 0 ? (stats.total_profit / stats.total_invested) * 100 : 0;
  const inStock = stats.total_purchases - stats.total_sold;
  const avgP    = stats.total_sold > 0 ? stats.total_profit / stats.total_sold : 0;
  const thisSl  = monthly[0]?.sales_count ?? 0;
  const prevSl  = monthly[1]?.sales_count ?? 0;
  const sDiff   = prevSl !== 0 ? ((thisSl - prevSl) / prevSl) * 100 : 0;
  const isEmpty = !loading && !useSample && stats.total_purchases === 0;
  const health  = healthGrade(rate);

  const maxM    = monthly.reduce<typeof monthly[0] | null>((mx, m) => (!mx || m.profit > mx.profit ? m : mx), null);
  const avgM    = monthly.length > 0 ? monthly.reduce((s, m) => s + m.profit, 0) / monthly.length : 0;
  const mDiff   = thisM - prevM;
  const chart   = [...monthly].reverse();

  const actions = [
    ...stales.map(p => {
      const days = Math.floor((Date.now() - new Date(p.purchase_date).getTime()) / 86400000);
      return { id: `s${p.id}`, pid: p.id, type: days > 21 ? "danger" : "warning", title: p.product_name, sub: `${days}日間 未売却  ·  仕入 ¥${p.purchase_price.toLocaleString()}`, status: p.status, action: "出品する", link: "/listings" };
    }),
    ...(inStock > 10 ? [{ id: "stk", pid: null, type: "info", title: `在庫 ${inStock} 件 — 出品の検討を推奨`, sub: "回転率の改善により収益性が向上します", status: "listed", action: "出品管理", link: "/listings" }] : []),
  ].slice(0, 5);

  // ── Render ──────────────────────────────────────────────
  return (
    <div style={{ color: C.t1, minHeight: "100vh" }}>
      <style>{`
        @keyframes sk { 0%,100%{opacity:.9} 50%{opacity:.4} }
        @media(max-width:768px){ .kg{grid-template-columns:repeat(2,1fr)!important} .mg{grid-template-columns:1fr!important} }
        .kcard:hover { border-color: ${C.bdSt} !important; box-shadow: 0 4px 24px rgba(0,0,0,.4) !important; }
        .arow:hover  { border-color: ${C.bdSt} !important; background: rgba(217,169,60,0.04) !important; }
        .abtn:hover  { background: rgba(217,169,60,0.22) !important; }
        .slink:hover { background: rgba(217,169,60,0.07) !important; }
      `}</style>

      {/* Error banner */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: `${C.dn}0D`, border: `1px solid ${C.dn}25`, borderRadius: 8, padding: "10px 18px", marginBottom: 16, fontSize: 12 }}>
          <WifiOff size={13} color={C.dn} />
          <span style={{ color: C.dn, fontWeight: 700 }}>API 未接続</span>
          <span style={{ color: C.t3 }}>— {countdown} 秒後に自動再接続</span>
          <button onClick={() => { setRetry(r => r + 1); loadAll(); }} style={{ marginLeft: "auto", background: "none", border: `1px solid ${C.dn}35`, borderRadius: 6, color: C.dn, padding: "4px 12px", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
            <RefreshCw size={10} /> 再接続
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 21, fontWeight: 800, color: C.t1, margin: 0, letterSpacing: "-0.02em" }}>収益ダッシュボード</h1>
            {useSample && (
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: C.gold, background: `${C.gold}18`, border: `1px solid ${C.gold}35`, borderRadius: 5, padding: "2px 8px" }}>DEMO</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
            <p style={{ fontSize: 12, color: C.t3, margin: 0 }}>事業全体の収益状況と今日の要対応事項を一元管理</p>
            {updated && !error && <span style={{ fontSize: 11, color: C.t4 }}>更新 {updated.getHours()}:{String(updated.getMinutes()).padStart(2,"0")}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {useSample && sample && (
            <button onClick={() => setSample(false)} style={{ fontSize: 12, background: "none", border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t3, padding: "8px 14px", cursor: "pointer" }}>実データを表示</button>
          )}
          <Link href="/calculator" style={{ display: "flex", alignItems: "center", gap: 5, background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t2, padding: "8px 15px", fontSize: 12, textDecoration: "none", fontWeight: 600 }}>
            利益計算
          </Link>
          <Link href="/purchases" style={{ display: "flex", alignItems: "center", gap: 6, background: `linear-gradient(135deg,#1E1608,#2A1E08)`, border: `1px solid ${C.gold}55`, borderRadius: 8, color: C.gold, padding: "8px 20px", fontSize: 13, textDecoration: "none", fontWeight: 700, letterSpacing: "0.04em" }}>
            + 仕入れ登録
          </Link>
        </div>
      </div>

      {/* Onboarding */}
      {isEmpty && (
        <div style={{ background: C.bg1, border: `1px solid ${C.bd}`, borderLeft: `3px solid ${C.gold}`, borderRadius: 12, padding: "28px 30px", marginBottom: 22 }}>
          <div style={{ display: "flex", gap: 22 }}>
            <div style={{ background: `${C.gold}18`, border: `1px solid ${C.gold}30`, borderRadius: 12, padding: 16, flexShrink: 0, alignSelf: "flex-start" }}>
              <Star size={24} color={C.gold} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.t1, marginBottom: 8 }}>最初の仕入れを登録してください</div>
              <div style={{ fontSize: 13, color: C.t3, marginBottom: 20, lineHeight: 1.9 }}>
                仕入れ情報を入力するだけで、利益・利益率・在庫の状態をシステムが自動で管理します。
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
                {[["01","仕入れ登録","商品名・仕入価格を入力"],["02","出品・価格設定","販売価格を記録"],["03","収益を確認","利益が自動算出"]].map(([s,l,d]) => (
                  <div key={s} style={{ background: C.bg0, borderRadius: 9, padding: "12px 14px", border: `1px solid ${C.bdSub}` }}>
                    <div style={{ fontSize: 9, color: C.gold, fontWeight: 800, marginBottom: 5, letterSpacing: "0.10em" }}>STEP {s}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 11, color: C.t3 }}>{d}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Link href="/purchases" style={{ background: `linear-gradient(135deg,#1E1608,#2A1E08)`, border: `1px solid ${C.gold}55`, borderRadius: 9, color: C.gold, padding: "10px 22px", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                  仕入れを登録する →
                </Link>
                <button onClick={() => setSample(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${C.bd}`, borderRadius: 9, color: C.t2, padding: "10px 18px", fontSize: 12, cursor: "pointer" }}>
                  <Play size={12} /> デモデータで確認
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="kg" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 18 }}>
        <div className="kcard" style={{ transition: "border-color .2s, box-shadow .2s" }}>
          <KpiCard label="今月の純利益" value={`¥${Math.round(thisM).toLocaleString()}`} diff={pDiff} sub="当月累計 純利益額" icon={TrendingUp} accent={thisM >= 0 ? C.gold : C.dn} loading={loading} />
        </div>
        <div className="kcard" style={{ transition: "border-color .2s, box-shadow .2s" }}>
          <KpiCard label="累計 利益率" value={`${rate.toFixed(1)}%`} sub={`健全性 ${health.g} — ${health.label}`} icon={Zap} accent={health.color} loading={loading} />
        </div>
        <div className="kcard" style={{ transition: "border-color .2s, box-shadow .2s" }}>
          <KpiCard label="在庫中（未売却）" value={`${inStock} 件`} sub={inStock > 10 ? "出品の検討を推奨" : "適正水準を維持"} icon={Package} accent={inStock > 10 ? C.warn : C.info} href="/purchases" loading={loading} />
        </div>
        <div className="kcard" style={{ transition: "border-color .2s, box-shadow .2s" }}>
          <KpiCard label="今月の売却数" value={`${thisSl} 件`} diff={sDiff} sub="当月 売却確定 件数" icon={ShoppingCart} accent={C.up} href="/sales" loading={loading} />
        </div>
        <div className="kcard" style={{ transition: "border-color .2s, box-shadow .2s" }}>
          <KpiCard label="要対応" value={`${actions.length} 件`} sub={actions.length > 0 ? "早期対応を推奨" : "対応事項なし"} icon={AlertTriangle} accent={actions.length > 0 ? C.dn : C.t3} href="/purchases" loading={loading} />
        </div>
      </div>

      {/* Goal */}
      {goal && goal.goal > 0 && (() => {
        const pct = Math.min(100, (goal.current_profit / goal.goal) * 100);
        const col = pct >= 100 ? C.gold : pct >= 60 ? C.up : pct >= 30 ? C.warn : C.dn;
        return (
          <div style={{ ...card({ marginBottom: 14, padding: "14px 22px" }) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Target size={12} color={C.gold} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.t2, letterSpacing: "0.06em", textTransform: "uppercase" }}>{goal.month} 月次目標</span>
              </div>
              {editGoal ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveGoal()} style={{ background: C.bg0, border: `1px solid ${C.gold}50`, borderRadius: 6, color: C.gold, padding: "3px 10px", fontSize: 13, width: 130, fontFamily: "monospace", outline: "none" }} autoFocus />
                  <button onClick={saveGoal} style={{ background: `${C.gold}18`, border: `1px solid ${C.gold}40`, borderRadius: 6, color: C.gold, padding: "3px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}><Check size={11} /> 保存</button>
                  <button onClick={() => setEditGoal(false)} style={{ background: "none", border: `1px solid ${C.bdSub}`, borderRadius: 6, color: C.t3, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>×</button>
                </div>
              ) : (
                <button onClick={() => { setEditGoal(true); setGoalInput(String(goal.goal)); }} style={{ background: "none", border: `1px solid ${C.bdSub}`, borderRadius: 6, color: C.t3, padding: "3px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                  <Pencil size={10} /> 変更
                </button>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: C.t3 }}>現在 <span style={{ color: col, fontFamily: "monospace", fontWeight: 700 }}>¥{Math.round(goal.current_profit).toLocaleString()}</span></span>
              <span style={{ color: C.t3 }}>目標 <span style={{ color: C.t2, fontFamily: "monospace", fontWeight: 700 }}>¥{goal.goal.toLocaleString()}</span></span>
            </div>
            <div style={{ background: C.bg0, borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${col}80,${col})`, borderRadius: 4, transition: "width 0.6s ease" }} />
            </div>
            <div style={{ textAlign: "right", fontSize: 11, color: col, marginTop: 4, fontWeight: 700 }}>{pct >= 100 ? "目標達成" : `${pct.toFixed(1)}%`}</div>
          </div>
        );
      })()}
      {goal && goal.goal === 0 && (
        <button onClick={() => { setEditGoal(true); setGoalInput(""); }} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: `1px dashed ${C.bd}`, borderRadius: 9, color: C.t3, padding: "11px 20px", fontSize: 12, cursor: "pointer", marginBottom: 14, width: "100%" }}>
          <Target size={12} /> 今月の目標利益を設定する
        </button>
      )}

      {/* Action items */}
      <div style={card({ marginBottom: 18 })}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <AlertTriangle size={13} color={actions.length > 0 ? C.warn : C.t3} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.t2, letterSpacing: "0.03em" }}>今日の要対応</span>
            {actions.length > 0 && (
              <span style={{ background: `${C.dn}18`, border: `1px solid ${C.dn}30`, borderRadius: 20, padding: "1px 9px", fontSize: 10, color: C.dn, fontWeight: 800 }}>{actions.length}</span>
            )}
          </div>
          {actions.length > 0 && (
            <Link href="/purchases" style={{ fontSize: 11, color: C.t3, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>すべて確認 <ChevronRight size={11} /></Link>
          )}
        </div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[1,2].map(i => <Sk key={i} h={50} r={8} />)}</div>
        ) : actions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 13, color: C.t2, fontWeight: 600, marginBottom: 4 }}>現在、対応が必要な事項はありません</div>
            <div style={{ fontSize: 11, color: C.t3 }}>新しいアラートが発生次第、ここに表示されます</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {actions.map(a => (
              <div key={a.id} className="arow" style={{ display: "flex", alignItems: "center", gap: 14, background: `${AL[a.type]}07`, border: `1px solid ${AL[a.type]}20`, borderRadius: 9, padding: "11px 16px", transition: "all .15s" }}>
                <div style={{ width: 2, height: 36, borderRadius: 2, background: AL[a.type], flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: SC[a.status] ?? C.t3, background: `${SC[a.status] ?? C.t3}15`, border: `1px solid ${SC[a.status] ?? C.t3}22`, borderRadius: 4, padding: "1px 6px", flexShrink: 0, letterSpacing: "0.06em" }}>
                      {SL[a.status] ?? a.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: C.t3 }}>{a.sub}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <Link href={a.link} className="abtn" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: C.gold, background: `${C.gold}15`, border: `1px solid ${C.gold}30`, borderRadius: 6, padding: "5px 12px", textDecoration: "none", transition: "background .15s" }}>
                    <Tag size={9} /> {a.action}
                  </Link>
                  {a.pid !== null && (
                    <Link href="/purchases" className="abtn" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.t3, background: "none", border: `1px solid ${C.bdSub}`, borderRadius: 6, padding: "5px 10px", textDecoration: "none", transition: "background .15s" }}>
                      <ExternalLink size={9} /> 詳細
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="mg" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Chart */}
          <div style={card()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, letterSpacing: "0.03em" }}>月次利益推移</div>
                <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>直近12ヶ月</div>
              </div>
              {!loading && monthly.length > 0 && (
                <div style={{ display: "flex", gap: 20 }}>
                  {[
                    { label: "最高月",  val: `¥${(maxM?.profit ?? 0).toLocaleString()}`, col: C.gold },
                    { label: "前月差",  val: `${mDiff >= 0 ? "+" : ""}¥${Math.abs(Math.round(mDiff)).toLocaleString()}`, col: mDiff >= 0 ? C.up : C.dn },
                    { label: "月平均",  val: `¥${Math.round(avgM).toLocaleString()}`, col: C.warn },
                  ].map(({ label, val, col }) => (
                    <div key={label} style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: C.t3, marginBottom: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: col, fontFamily: "monospace" }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Hr />
            {loading ? <Sk h={180} /> : monthly.length === 0 ? (
              <div style={{ color: C.t3, textAlign: "center", padding: "36px 0", fontSize: 13 }}>売上データがありません</div>
            ) : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fill: C.t3, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.t3, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `¥${(v/1000).toFixed(0)}k`} width={44} />
                  <ReferenceLine y={0} stroke={C.bdSub} />
                  <Tooltip contentStyle={{ background: C.bg3, border: `1px solid ${C.bdSt}`, borderRadius: 8, color: C.t1, fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,.7)" }} formatter={v => [`¥${Number(v).toLocaleString()}`, "純利益"]} />
                  <Bar dataKey="profit" radius={[4,4,0,0]}>
                    {chart.map((e, i) => <Cell key={i} fill={e.profit >= 0 ? C.gold : C.dn} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent purchases */}
          {(loading || recents.length > 0) && (
            <div style={card()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, letterSpacing: "0.03em" }}>直近の仕入れ</div>
                <Link href="/purchases" style={{ fontSize: 11, color: C.t3, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>すべて確認 <ChevronRight size={11} /></Link>
              </div>
              <Hr />
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {loading ? [1,2,3].map(i => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between" }}><Sk w="55%" h={13} /><Sk w="18%" h={13} /></div>
                )) : recents.slice(0,5).map(item => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: C.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{item.product_name}</span>
                    <span style={{ fontSize: 13, color: C.gold, fontFamily: "monospace", fontWeight: 700 }}>¥{item.purchase_price.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Business health */}
          <div style={card()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, letterSpacing: "0.03em" }}>事業の健全性</div>
                <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>累計 収益パフォーマンス</div>
              </div>
              {!loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, background: `${health.color}14`, border: `1px solid ${health.color}28`, borderRadius: 8, padding: "5px 10px" }}>
                  <Award size={11} color={health.color} />
                  <span style={{ fontSize: 15, fontWeight: 800, color: health.color, fontFamily: "monospace" }}>{health.g}</span>
                  <span style={{ fontSize: 9, color: health.color, letterSpacing: "0.06em" }}>{health.label}</span>
                </div>
              )}
            </div>
            <Hr />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {loading ? [1,2,3,4,5].map(i => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between" }}><Sk w="48%" h={13} /><Sk w="26%" h={13} /></div>
              )) : [
                { label: "総仕入れ数",  val: `${stats.total_purchases} 件`,                               icon: ShoppingCart, col: C.t2 },
                { label: "総投資額",    val: `¥${Math.round(stats.total_invested).toLocaleString()}`,     icon: Banknote,     col: C.gold },
                { label: "純利益合計",  val: `¥${Math.round(stats.total_profit).toLocaleString()}`,       icon: TrendingUp,   col: stats.total_profit >= 0 ? C.up : C.dn },
                { label: "販売完了数",  val: `${stats.total_sold} 件`,                                    icon: Package,      col: C.t2 },
                { label: "平均利益/件", val: stats.total_sold > 0 ? `¥${Math.round(avgP).toLocaleString()}` : "—", icon: Zap, col: C.warn },
              ].map(({ label, val, icon: Icon, col }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Icon size={11} color={C.t3} />
                    <span style={{ fontSize: 12, color: C.t3 }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: col, fontFamily: "monospace" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status breakdown */}
          <div style={card()}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, marginBottom: 4, letterSpacing: "0.03em" }}>ステータス内訳</div>
            <Hr />
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {loading
                ? [1,2,3].map(i => <div key={i} style={{ display: "flex", justifyContent: "space-between" }}><Sk w="44%" h={13} /><Sk w="20%" h={13} /></div>)
                : sbdown.map(({ status, count }) => (
                    <div key={status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: SC[status] ?? C.t3, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: C.t3 }}>{SL[status] ?? status}</span>
                      </div>
                      <span style={{ background: `${SC[status] ?? C.gold}12`, border: `1px solid ${SC[status] ?? C.gold}22`, borderRadius: 20, padding: "2px 12px", fontWeight: 700, fontSize: 12, color: SC[status] ?? C.gold, fontFamily: "monospace" }}>
                        {count}
                      </span>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
