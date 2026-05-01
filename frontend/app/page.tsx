"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getDashboard, getStalePurchases, getPurchases, getGoal, setGoal, type Dashboard, type Purchase } from "@/lib/api";
import { TrendingUp, ShoppingCart, Package, Banknote, Target, Pencil, Check, RefreshCw, AlertTriangle, Zap, ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Award, Tag, ExternalLink, Play, Star, Brain } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { OnboardingChecklist } from "@/components/OnboardingModal";

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

  // text — WCAG AA準拠のコントラスト比 4.5:1以上
  t1:   "#F5F0E8",   // primary warm white (14.2:1)
  t2:   "#D4CCBC",   // secondary (8.1:1) ← 改善
  t3:   "#A09488",   // muted (4.6:1) ← 改善
  t4:   "#5A5248",   // faint decorative (2.4:1) ← 改善（更新時刻等）

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

const SAMPLE_PROFIT_CANDIDATES = [
  { id: 1, name: "セイコー 5 SNXS79 自動巻き 中古", buy: 4200,  sell: 12800, profit: 7800, rate: 61, stars: 5 },
  { id: 2, name: "ポケモンカード 旧裏面 まとめ 16枚", buy: 2800, sell: 6500,  profit: 3200, rate: 49, stars: 4 },
  { id: 3, name: "レゴ テクニック 42083 中古",        buy: 8500, sell: 18900, profit: 9200, rate: 49, stars: 4 },
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
      borderTop: `3px solid ${accent}`,
      borderRadius: 12,
      padding: "16px 18px 18px",
      height: "100%",
      cursor: href ? "pointer" : "default",
      transition: "border-color 0.2s, box-shadow 0.2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.t3, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {label}
        </span>
        <div style={{ background: `${accent}18`, border: `1px solid ${accent}30`, borderRadius: 7, padding: "5px 6px" }}>
          <Icon size={13} color={accent} />
        </div>
      </div>
      {loading ? (
        <><Sk h={32} w="65%" /><div style={{ marginTop: 10 }}><Sk h={12} w="48%" /></div></>
      ) : (
        <>
          <div style={{ fontSize: 28, fontWeight: 900, color: accent, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 10 }}>
            {value}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {diff !== undefined && <DiffBadge val={diff} />}
            {sub && <span style={{ fontSize: 12, color: C.t3 }}>{sub}</span>}
          </div>
        </>
      )}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none", display: "block", height: "100%" }}>{inner}</Link> : inner;
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

// ── Stars ─────────────────────────────────────────────────
function Stars({ n }: { n: number }) {
  return <span style={{ color: C.gold, fontSize: 14, letterSpacing: "0.08em" }}>{Array.from({ length: 5 }, (_, i) => i < n ? "★" : "☆").join("")}</span>;
}

// ── Profit Candidate Card ─────────────────────────────────
function ProfitCandidateCard({ name, buy, sell, profit, rate, stars }: typeof SAMPLE_PROFIT_CANDIDATES[0]) {
  return (
    <div style={{ background: C.bg1, border: `1px solid ${C.bd}`, borderTop: `3px solid ${C.gold}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, marginBottom: 14, lineHeight: 1.5, minHeight: 36 }}>{name}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {([
          { label: "仕入れ",   val: `¥${buy.toLocaleString()}`,     col: C.t2      },
          { label: "販売",     val: `¥${sell.toLocaleString()}`,    col: "#66aaff" },
          { label: "想定利益", val: `+¥${profit.toLocaleString()}`, col: C.up      },
          { label: "利益率",   val: `${rate}%`,                     col: C.gold    },
        ] as { label: string; val: string; col: string }[]).map(({ label, val, col }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.t3 }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: col, fontFamily: "ui-monospace, 'SF Mono', monospace" }}>{val}</span>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${C.bdSub}`, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: C.t3 }}>おすすめ度</span>
          <Stars n={stars} />
        </div>
      </div>
    </div>
  );
}

// ── AI CEO Hero ──────────────────────────────────────────
function AICEOHero() {
  return (
    <div style={{
      background: `linear-gradient(135deg, #0c0a04, #1c1408, #0c0a04)`,
      border: `1px solid ${C.gold}55`,
      borderTop: `3px solid ${C.gold}`,
      borderRadius: 14,
      padding: "22px 28px",
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      gap: 20,
      flexWrap: "wrap",
      boxShadow: `0 0 40px ${C.gold}10`,
    }}>
      <div style={{
        background: `${C.gold}20`,
        border: `1px solid ${C.gold}40`,
        borderRadius: 12,
        padding: "14px 16px",
        flexShrink: 0,
      }}>
        <Brain size={32} color={C.gold} />
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: C.t1, marginBottom: 6, letterSpacing: "-0.02em" }}>
          AI CEO が仕入れ戦略を全自動で立案します
        </div>
        <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.7 }}>
          ゴールを入力するだけ。スキャン・分析・候補リストアップを自動実行。初心者でも即日スタート。
        </div>
      </div>
      <Link href="/agents" style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: `linear-gradient(135deg, #1E1608, #2A1E08)`,
        border: `1px solid ${C.gold}80`,
        borderRadius: 10,
        color: C.gold,
        padding: "15px 32px",
        fontSize: 15,
        fontWeight: 800,
        textDecoration: "none",
        letterSpacing: "0.04em",
        boxShadow: `0 0 28px ${C.gold}28`,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}>
        <Brain size={16} /> AI CEO を起動する →
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { status } = useSession();
  const [data,      setData]       = useState<Dashboard | null>(null);
  const [stale,     setStale]      = useState<Purchase[]>([]);
  const [recent,    setRecent]     = useState<Purchase[]>([]);
  const [goal,      setGoalData]   = useState<{ month: string; goal: number; current_profit: number } | null>(null);
  const [editGoal,  setEditGoal]   = useState(false);
  const [goalInput, setGoalInput]  = useState("");
  const [error,     setError]      = useState(false);
  const [loading,   setLoading]    = useState(true);
  const [sample,    setSample]     = useState(false);
  const [updated,   setUpdated]    = useState<Date | null>(null);
  const [showAllActions, setShowAllActions] = useState(false);

  const isGuest = status === "unauthenticated";

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

  useEffect(() => {
    if (status === "loading") return;
    if (isGuest) { setLoading(false); return; }
    loadAll();
  }, [status, isGuest, loadAll]);

  const saveGoal = async () => {
    const goalNum = Number(goalInput);
    if (!goalInput || isNaN(goalNum) || goalNum <= 0) return;
    try {
      await setGoal(goalNum);
      setGoalData(prev => prev
        ? { ...prev, goal: goalNum }
        : { month: "", goal: goalNum, current_profit: 0 }
      );
      setEditGoal(false);
    } catch (err) {
      console.error("[goal] setGoal failed:", err);
      // TODO: ユーザーへのエラー通知 (toast 等)
    }
  };

  // data wiring
  const useSample = isGuest || sample || error || (data?.stats.total_purchases === 0 && !loading);
  const showGuestBanner = isGuest;
  const showEmptyBanner = !isGuest && !loading && useSample;
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
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @media(max-width:768px){
          .kg{display:none!important}
          .mobile-hero{display:block!important}
          .mg{grid-template-columns:1fr!important}
          .dash-header{flex-direction:column!important; gap:12px!important}
          .dash-actions{width:100%!important; justify-content:stretch!important}
          .dash-actions a, .dash-actions button{flex:1!important; justify-content:center!important; min-height:44px!important}
          .step-grid{grid-template-columns:1fr!important}
          .onboard-cta{flex-direction:column!important}
          .onboard-cta a, .onboard-cta button{width:100%!important; justify-content:center!important; min-height:48px!important; text-align:center!important}
          .chart-meta{display:none!important}
          .action-overflow{display:none!important}
          .action-expand{display:flex!important}
          .side-secondary{display:none!important}
        }
        .action-expand{display:none}
        .kcard:hover { border-color: ${C.bdSt} !important; box-shadow: 0 4px 24px rgba(0,0,0,.4) !important; }
        .kcard { min-height: 44px; }
        .arow:hover  { border-color: ${C.bdSt} !important; background: rgba(217,169,60,0.04) !important; }
        .abtn:hover  { background: rgba(217,169,60,0.22) !important; }
        .abtn { min-height: 36px; }
        .slink:hover { background: rgba(217,169,60,0.07) !important; }
        .btn-primary:hover { background: linear-gradient(135deg,#2A1E08,#3A2A0A) !important; border-color: ${C.gold}88 !important; }
        .btn-secondary:hover { background: rgba(212,175,55,0.08) !important; }
      `}</style>

      {/* AI CEO Hero — ゲスト・空データ時にトップ表示 */}
      {useSample && <AICEOHero />}

      {/* Guest banner — 未ログイン訪問者向け */}
      {showGuestBanner && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: `linear-gradient(135deg,#1A1408,#201808)`, border: `1px solid ${C.gold}40`, borderLeft: `3px solid ${C.gold}`, borderRadius: 8, padding: "12px 18px", marginBottom: 16 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
          <span style={{ fontSize: 13, color: C.t2, flex: 1 }}>
            これは<span style={{ color: C.gold, fontWeight: 700 }}>サンプルデータ</span>です。実際の物販データで管理を始めるには無料で登録してください。
          </span>
          <Link
            href="/scanner"
            style={{ display: "flex", alignItems: "center", gap: 6, background: `linear-gradient(135deg,#1E1608,#2A1E08)`, border: `1px solid ${C.gold}70`, borderRadius: 8, color: C.gold, padding: "9px 18px", fontSize: 13, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap", letterSpacing: "0.03em", boxShadow: `0 0 16px ${C.gold}20` }}
          >
            今すぐ利益を調べる →
          </Link>
        </div>
      )}

      {/* Empty-data banner — ログイン済み・データ0件 */}
      {showEmptyBanner && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: `linear-gradient(135deg, #0f0d05, #181408)`, border: `1px dashed ${C.gold}35`, borderRadius: 10, padding: "14px 20px", marginBottom: 16 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🚀</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, marginBottom: 2 }}>仕入れを登録すると、このダッシュボードに実データが反映されます</div>
            <div style={{ fontSize: 11, color: C.t3 }}>今は月商¥98,400・利益率31.5%のサンプルを表示中。データを入れると自動で切り替わります。</div>
          </div>
          <Link
            href="/purchases"
            style={{ display: "flex", alignItems: "center", gap: 5, background: `linear-gradient(135deg, #1E1608, #2A1E08)`, border: `1px solid ${C.gold}60`, borderRadius: 8, color: C.gold, padding: "9px 18px", fontSize: 12, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap", boxShadow: `0 0 12px ${C.gold}15` }}
          >
            仕入れを登録する →
          </Link>
        </div>
      )}


      {/* まずこれを試す + おすすめ仕入れTOP3 — ゲスト・空データ時 */}
      {useSample && (
        <div style={{ marginBottom: 24 }}>

          {/* ── まずこれを試す ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
              まずこれを試す
            </div>
            <div className="step-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {([
                {
                  emoji: "🔍",
                  label: "利益スキャナー",
                  desc: "商品名を入れるだけ。仕入れ価格・利益率・需要を瞬時に判定。",
                  cta: "今すぐ試す →",
                  href: "/scanner",
                  accent: C.gold,
                },
                {
                  emoji: "🤖",
                  label: "AI CEO に指示する",
                  desc: "「利益率30%の商品を探して」と入力するだけで全自動スキャン開始。",
                  cta: "起動する →",
                  href: "/agents",
                  accent: "#66aaff",
                },
                {
                  emoji: "📦",
                  label: "仕入れを登録する",
                  desc: "商品・価格を記録するとダッシュボードに利益・在庫が自動反映。",
                  cta: "登録する →",
                  href: "/purchases",
                  accent: C.up,
                },
              ] as { emoji: string; label: string; desc: string; cta: string; href: string; accent: string }[]).map(({ emoji, label, desc, cta, href, accent }) => (
                <Link key={label} href={href} style={{ textDecoration: "none", display: "block" }}>
                  <div style={{
                    background: C.bg1,
                    border: `1px solid ${C.bd}`,
                    borderTop: `3px solid ${accent}`,
                    borderRadius: 12,
                    padding: "18px 18px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 7,
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    height: "100%",
                    cursor: "pointer",
                  }}>
                    <div style={{ fontSize: 26, lineHeight: 1 }}>{emoji}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.t1 }}>{label}</div>
                    <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.65, flex: 1 }}>{desc}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: accent, display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                      {cta}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── 今日のおすすめ仕入れ TOP3 ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 18 }}>🔥</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: C.t1, letterSpacing: "-0.01em" }}>今日のおすすめ仕入れTOP3</span>
              </div>
              <div style={{ fontSize: 11, color: C.t3 }}>利益率・想定利益・仕入れ判断をAIがまとめて表示します。初心者でも即判断できます</div>
            </div>
            <span style={{ fontSize: 10, color: C.t4, background: `${C.gold}12`, border: `1px solid ${C.gold}22`, borderRadius: 5, padding: "2px 8px", letterSpacing: "0.06em" }}>SAMPLE</span>
          </div>
          <div className="step-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {SAMPLE_PROFIT_CANDIDATES.map((c, idx) => (
              <div key={c.id} style={{ position: "relative" }}>
                {idx === 0 && (
                  <div style={{
                    position: "absolute",
                    top: -10,
                    left: 14,
                    background: `linear-gradient(135deg, ${C.gold}, ${C.goldLt})`,
                    color: C.bg0,
                    fontSize: 10,
                    fontWeight: 900,
                    padding: "2px 10px",
                    borderRadius: 20,
                    letterSpacing: "0.06em",
                    zIndex: 1,
                  }}>
                    ★ NO.1
                  </div>
                )}
                <ProfitCandidateCard {...c} />
              </div>
            ))}
          </div>

          {/* /pricing CTA — デモ閲覧後の導線 */}
          <div style={{ marginTop: 16, background: `linear-gradient(135deg,#141208,#1A1608)`, border: `1px solid ${C.gold}35`, borderRadius: 12, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.t1, marginBottom: 4 }}>気になる商品が見つかりましたか？</div>
              <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.6 }}>Standardプラン（月額¥9,800）でリアルタイムスキャン・全商品の詳細分析が使えます。7日間無料トライアル付き。</div>
            </div>
            <Link
              href="/pricing"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `linear-gradient(135deg,#1E1608,#2A1E08)`, border: `1px solid ${C.gold}70`, borderRadius: 9, color: C.gold, padding: "11px 22px", fontSize: 13, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap", letterSpacing: "0.03em", boxShadow: `0 0 16px ${C.gold}18`, flexShrink: 0 }}
            >
              料金プランを見る →
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="dash-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: C.t1, margin: 0, letterSpacing: "-0.02em" }}>収益ダッシュボード</h1>
            {useSample && (
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: C.gold, background: `${C.gold}18`, border: `1px solid ${C.gold}35`, borderRadius: 5, padding: "2px 8px" }}>DEMO</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <p style={{ fontSize: 13, color: C.t3, margin: 0 }}>事業全体の収益状況と今日の要対応事項を一元管理</p>
            {updated && !error && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.t4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.up, display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
                {updated.getHours()}:{String(updated.getMinutes()).padStart(2,"0")} 更新
              </span>
            )}
          </div>
        </div>
        <div className="dash-actions" style={{ display: "flex", gap: 8 }}>
          {useSample && sample && (
            <button onClick={() => setSample(false)} className="btn-secondary" style={{ fontSize: 12, background: "none", border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t3, padding: "10px 14px", cursor: "pointer", minHeight: 40 }}>実データを表示</button>
          )}
          <Link href="/calculator" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 5, background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t2, padding: "10px 16px", fontSize: 13, textDecoration: "none", fontWeight: 600, minHeight: 40 }}>
            利益計算
          </Link>
          <Link href="/scanner" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, background: `linear-gradient(135deg,#1E1608,#2A1E08)`, border: `1px solid ${C.gold}70`, borderRadius: 8, color: C.gold, padding: "10px 22px", fontSize: 14, textDecoration: "none", fontWeight: 800, letterSpacing: "0.04em", minHeight: 40, boxShadow: `0 0 20px ${C.gold}18` }}>
            今すぐ利益を調べる
          </Link>
        </div>
      </div>

      {/* Onboarding */}
      {isEmpty && (
        <div style={{ background: `linear-gradient(135deg,${C.bg1},#161208)`, border: `1px solid ${C.gold}30`, borderTop: `3px solid ${C.gold}`, borderRadius: 14, padding: "32px 32px 28px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ background: `${C.gold}18`, border: `1px solid ${C.gold}35`, borderRadius: 10, padding: "8px 10px" }}>
              <Star size={18} color={C.gold} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.t1, letterSpacing: "-0.02em" }}>はじめましょう</div>
              <div style={{ fontSize: 13, color: C.t3, marginTop: 2 }}>仕入れ情報を登録するだけで、利益・在庫・売上がすべて自動管理されます</div>
            </div>
          </div>
          <div className="step-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, margin: "20px 0" }}>
            {([
              ["01","仕入れ登録","商品名・仕入れ価格を入力","仕入れ管理へ","/purchases"],
              ["02","出品・価格設定","販売価格を記録して利益を確認","出品管理へ","/listings"],
              ["03","収益を確認","ダッシュボードで利益が自動算出","このページ","#"],
            ] as [string,string,string,string,string][]).map(([s,l,d,btn,href]) => (
              <div key={s} style={{ background: C.bg0, borderRadius: 10, padding: "16px 18px", border: `1px solid ${C.bdSub}`, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 10, color: C.gold, fontWeight: 800, letterSpacing: "0.14em" }}>STEP {s}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.t1 }}>{l}</div>
                <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.6, flex: 1 }}>{d}</div>
                <Link href={href} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: C.gold, textDecoration: "none", fontWeight: 700, marginTop: 4 }}>
                  {btn} <ChevronRight size={11} />
                </Link>
              </div>
            ))}
          </div>
          <div className="onboard-cta" style={{ display: "flex", gap: 10 }}>
            <Link href="/purchases" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: `linear-gradient(135deg,#1E1608,#2A1E08)`, border: `1px solid ${C.gold}70`, borderRadius: 10, color: C.gold, padding: "13px 28px", fontWeight: 800, fontSize: 14, textDecoration: "none", letterSpacing: "0.03em", boxShadow: `0 0 24px ${C.gold}20` }}>
              仕入れを登録する →
            </Link>
            <button onClick={() => setSample(true)} className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: `1px solid ${C.bd}`, borderRadius: 10, color: C.t2, padding: "13px 20px", fontSize: 13, cursor: "pointer" }}>
              <Play size={13} /> デモデータで確認
            </button>
          </div>
        </div>
      )}

      {/* Onboarding Checklist */}
      {!isEmpty && <OnboardingChecklist />}

      {/* Mobile Hero — スマホのみ表示 */}
      <div className="mobile-hero" style={{ display: "none", marginBottom: 16 }}>
        <div style={{ background: `linear-gradient(135deg,${C.bg1},#161208)`, border: `1px solid ${C.gold}30`, borderTop: `3px solid ${C.gold}`, borderRadius: 14, padding: "20px 20px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 6 }}>今月の純利益</div>
          {loading ? <Sk h={40} w="55%" /> : (
            <div style={{ fontSize: 38, fontWeight: 900, color: thisM >= 0 ? C.gold : C.dn, fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", letterSpacing: "-0.04em", lineHeight: 1 }}>
              ¥{Math.round(thisM).toLocaleString()}
            </div>
          )}
          {!loading && <div style={{ marginTop: 8 }}><DiffBadge val={pDiff} /></div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 16 }}>
            {[
              { label: "利益率",  val: `${rate.toFixed(1)}%`, col: health.color },
              { label: "在庫",    val: `${inStock}件`,        col: inStock > 10 ? C.warn : C.t2 },
              { label: "要対応",  val: `${actions.length}件`, col: actions.length > 0 ? C.dn : C.t3 },
            ].map(({ label, val, col }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.t3, marginBottom: 3, letterSpacing: "0.06em" }}>{label}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: col, fontFamily: "ui-monospace,'SF Mono',monospace" }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Grid — デスクトップ表示 */}
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
            {actions.map((a, i) => (
              <div key={a.id} className={`arow${i >= 2 && !showAllActions ? " action-overflow" : ""}`} style={{ display: "flex", alignItems: "center", gap: 14, background: `${AL[a.type]}07`, border: `1px solid ${AL[a.type]}20`, borderRadius: 9, padding: "11px 16px", transition: "all .15s" }}>
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
            {actions.length > 2 && (
              <button
                className="action-expand"
                onClick={() => setShowAllActions(v => !v)}
                style={{ alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t3, padding: "10px 16px", fontSize: 12, cursor: "pointer", width: "100%", minHeight: 40 }}
              >
                {showAllActions ? "折りたたむ" : `残り ${actions.length - 2} 件を表示`}
              </button>
            )}
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
                <div className="chart-meta" style={{ display: "flex", gap: 20 }}>
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

          {/* Status breakdown — モバイルでは省略 */}
          <div className="side-secondary" style={card()}>
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
