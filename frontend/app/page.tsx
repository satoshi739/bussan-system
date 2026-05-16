"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { useSession } from "next-auth/react";
import { getDashboard, getStalePurchases, getPurchases, getGoal, setGoal, type Dashboard, type Purchase } from "@/lib/api";
import {
  TrendingUp, ShoppingCart, Package, Banknote, Target, Pencil, Check,
  AlertTriangle, Zap, ArrowUpRight, ArrowDownRight, ChevronRight,
  Award, Tag, ExternalLink, Search, Sparkles, Wand2, Megaphone, LayoutDashboard, Radar,
} from "lucide-react";
import Link from "next/link";
import { OnboardingChecklist } from "@/components/OnboardingModal";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";

// recharts を遅延ロード — 初回 JS バンドルから除外
const LazyChart = lazy(() => import("@/components/ProfitBarChart"));

// ─────────────────────────────────────────────────────────
//  Design tokens
// ─────────────────────────────────────────────────────────
const C = {
  bg0:  "var(--bg)",
  bg1:  "var(--surface)",
  bg2:  "var(--surface-2)",
  t1:   "var(--text)",
  t2:   "var(--text-2)",
  t3:   "var(--text-3)",
  t4:   "var(--text-4)",
  gold:   "var(--blue)",
  goldLt: "var(--blue-lt)",
  azure:  "var(--blue-lt)",
  up:    "#1E9C3C",
  dn:    "#E02E24",
  warn:  "#E88500",
  info:  "var(--blue)",
  purple:"#7C5BD9",
  teal:  "#11A097",
  pink:  "#D9357A",
  bd:    "var(--border)",
  bdSt:  "var(--border-strong)",
  bdSub: "var(--border-sub)",
};

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: C.bg1,
  border: `1px solid ${C.bd}`,
  borderRadius: 28,
  padding: "20px 20px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
  ...extra,
});

// ── サンプルデータ（ゲスト・空データ時の見映え用） ──────────
const SAMPLE: Dashboard = {
  stats: { total_purchases: 47, total_invested: 312000, total_sold: 39, total_profit: 98400, roi: 31.5, avg_holding_days: 12.4, active_inventory_count: 8, active_inventory_value: 52000 },
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
  return <div style={{ width: w, height: h, borderRadius: r, background: `rgba(0,0,0,0.07)`, animation: "sk 1.6s ease-in-out infinite" }} />;
}

// ── 健全性 ────────────────────────────────────────────────
function healthGrade(r: number) {
  if (r >= 30) return { g: "S", color: C.up,   label: "超優良" };
  if (r >= 20) return { g: "A", color: C.gold, label: "優良"   };
  if (r >= 10) return { g: "B", color: C.warn, label: "標準"   };
  return              { g: "C", color: C.dn,   label: "要改善" };
}

const SL: Record<string, string> = { purchased: "仕入済", listed: "出品中", sold: "売却済", cancelled: "取消" };
const SC: Record<string, string> = { purchased: C.warn, listed: C.gold, sold: C.up, cancelled: C.t3 };
const AL: Record<string, string> = { danger: C.dn, warning: C.warn, info: C.info };

const Hr = () => <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${C.bd},transparent)`, margin: "14px 0" }} />;

function Stars({ n }: { n: number }) {
  return <span style={{ color: C.gold, fontSize: 14, letterSpacing: "0.08em" }}>{Array.from({ length: 5 }, (_, i) => i < n ? "★" : "☆").join("")}</span>;
}

// ── おすすめ仕入れカード ──────────────────────────────────
function ProfitCandidateCard({ name, buy, sell, profit, rate, stars }: typeof SAMPLE_PROFIT_CANDIDATES[0]) {
  return (
    <div style={{ background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 24, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
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

// ── 機能カード（本番8機能） ────────────────────────────────
type FeatureItem = {
  href: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  accent: string;
  external?: boolean;
};

const FEATURES: FeatureItem[] = [
  { href: "/scanner",        label: "商品の利益を調べる", desc: "商品名を入れるだけで、仕入れ判断に必要な利益・利益率・需要が分かります。", icon: Radar,         accent: C.gold },
  { href: "/discover",       label: "今日のおすすめ商品", desc: "AIが毎日、利益率の高い仕入れ候補を自動で見つけて提案します。",           icon: Sparkles,      accent: C.azure },
  { href: "/listings/quick", label: "AIで出品文を作る",   desc: "商品情報を入れるだけ。売れるタイトル・説明文・タグをAIが生成します。",     icon: Wand2,         accent: C.purple },
  { href: "/purchases",      label: "買った商品の記録",   desc: "仕入れ価格・送料を入力すると利益・在庫が自動で管理されます。",             icon: ShoppingCart,  accent: C.up },
  { href: "/listings",       label: "出品中の商品",       desc: "今出品している商品を一覧で管理。値下げ判断もここから。",                   icon: Tag,           accent: C.warn },
  { href: "/sales",          label: "売れた商品",         desc: "売却済み商品と利益を月別で確認できます。",                                 icon: TrendingUp,    accent: C.teal },
  { href: "https://upj-auto-marketing.vercel.app/", label: "AI自動マーケ", desc: "SNS集客・コンテンツ生成をAIが自動化します（外部ツール）。", icon: Megaphone, accent: C.pink, external: true },
];

function FeatureCard({ item }: { item: FeatureItem }) {
  const { href, label, desc, icon: Icon, accent, external } = item;
  const inner = (
    <div className="feature-card" style={{
      background: C.bg1,
      border: `1px solid ${C.bd}`,
      borderRadius: 22,
      padding: "18px 18px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      height: "100%",
      cursor: "pointer",
      transition: "transform .15s, border-color .2s, box-shadow .2s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={19} color={accent} />
        </div>
        {external && (
          <span style={{ fontSize: 9, fontWeight: 800, color: accent, background: `${accent}12`, border: `1px solid ${accent}33`, borderRadius: 8, padding: "2px 8px", letterSpacing: "0.05em" }}>
            外部
          </span>
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, letterSpacing: "-0.01em" }}>{label}</div>
      <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.65, flex: 1 }}>{desc}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: accent, display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
        開く <ChevronRight size={12} />
      </div>
    </div>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>{inner}</a>
  ) : (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>{inner}</Link>
  );
}

// ─────────────────────────────────────────────────────────
//  Hero — 実績アピール型
// ─────────────────────────────────────────────────────────
function HeroSection({
  thisM, pDiff, rate, thisSl, inStock, isGuest, useSample, loading, health,
}: {
  thisM: number; pDiff: number; rate: number; thisSl: number; inStock: number;
  isGuest: boolean; useSample: boolean; loading: boolean;
  health: { g: string; color: string; label: string };
}) {
  return (
    <div style={{
      position: "relative",
      background: `linear-gradient(135deg, ${C.gold} 0%, ${C.azure} 100%)`,
      borderRadius: 28,
      padding: "32px 32px 28px",
      marginBottom: 22,
      boxShadow: "0 14px 38px rgba(0,111,230,0.28)",
      color: "#fff",
      overflow: "hidden",
    }}>
      {/* 背景の装飾 */}
      <div aria-hidden style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.10)", filter: "blur(8px)" }} />
      <div aria-hidden style={{ position: "absolute", bottom: -80, left: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)", filter: "blur(10px)" }} />

      <div style={{ position: "relative" }}>
        {/* 上段：タイトル + DEMOバッジ */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <LayoutDashboard size={14} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", opacity: 0.95 }}>
            {isGuest ? "デモダッシュボード" : "あなたの収益ダッシュボード"}
          </span>
          {useSample && (
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", background: "rgba(255,255,255,0.20)", borderRadius: 8, padding: "2px 8px" }}>
              SAMPLE
            </span>
          )}
        </div>

        {/* 大数字：今月の純利益 */}
        <div style={{ fontSize: 13, opacity: 0.92, marginBottom: 4 }}>今月の純利益</div>
        {loading ? (
          <Sk h={56} w="40%" />
        ) : (
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, fontFamily: "ui-monospace,'SF Pro Display',-apple-system,monospace" }}>
              ¥{Math.round(thisM).toLocaleString()}
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, background: "rgba(255,255,255,0.18)", borderRadius: 14, padding: "5px 12px" }}>
              {pDiff >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              前月比 {pDiff >= 0 ? "+" : ""}{pDiff.toFixed(1)}%
            </span>
          </div>
        )}

        {/* KPI 3つ */}
        <div className="hero-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 22, marginBottom: 24 }}>
          {[
            { label: "累計 利益率",  val: `${rate.toFixed(1)}%`,   sub: `健全性 ${health.g}（${health.label}）` },
            { label: "今月の売却",   val: `${thisSl} 件`,          sub: "当月 売却確定" },
            { label: "在庫（未売却）", val: `${inStock} 件`,        sub: inStock > 10 ? "出品検討を推奨" : "適正水準" },
          ].map((k) => (
            <div key={k.label} style={{ background: "rgba(255,255,255,0.14)", borderRadius: 16, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.18)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", opacity: 0.88, textTransform: "uppercase" }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4, letterSpacing: "-0.02em", fontFamily: "ui-monospace,'SF Mono',monospace" }}>
                {loading ? "—" : k.val}
              </div>
              <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* 2大型CTA */}
        <div className="hero-cta" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/scanner" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#fff", color: C.gold,
            borderRadius: 18, padding: "14px 24px",
            fontSize: 14, fontWeight: 800, textDecoration: "none",
            boxShadow: "0 4px 14px rgba(0,0,0,0.16)",
          }}>
            <Search size={16} /> 商品の利益を調べる
          </Link>
          <Link href="/listings/quick" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.18)", color: "#fff",
            borderRadius: 18, padding: "14px 24px",
            fontSize: 14, fontWeight: 700, textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.34)",
          }}>
            <Wand2 size={15} /> AIで出品文を作る
          </Link>
          {isGuest && (
            <Link href="/pricing" style={{
              display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto",
              color: "#fff", opacity: 0.92, padding: "14px 8px",
              fontSize: 13, fontWeight: 600, textDecoration: "underline",
            }}>
              料金プランを見る →
            </Link>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hero-kpis { grid-template-columns: 1fr !important; }
          .hero-cta a { flex: 1 1 100% !important; justify-content: center !important; }
        }
      `}</style>
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
  const [updated,   setUpdated]    = useState<Date | null>(null);
  const [showAllActions, setShowAllActions] = useState(false);

  const isGuest = status === "unauthenticated";

  useEffect(() => {
    if (status === "loading") return;
    if (isGuest) { setLoading(false); return; }
    const doLoad = async () => {
      setLoading(true);
      try {
        const [d, stalePs, recentPs, goalRes] = await Promise.all([
          getDashboard(),
          getStalePurchases(14).catch((): Purchase[] => []),
          getPurchases({ limit: 5 }).catch((): Purchase[] => []),
          getGoal().catch(() => null),
        ]);
        setData(d); setError(false); setUpdated(new Date());
        setStale(stalePs ?? []);
        setRecent(recentPs ?? []);
        if (goalRes) setGoalData(goalRes);
      } catch {
        setError(true);
        setData(p => p ?? { stats: { total_purchases: 0, total_invested: 0, total_sold: 0, total_profit: 0 }, monthly_profit: [], status_breakdown: [], platform_breakdown: [] });
      } finally { setLoading(false); }
    };
    doLoad();
  }, [status, isGuest]);

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
      toast(errMsg(err), "error");
    }
  };

  // データ配線：ゲスト / エラー / 空データはサンプル表示
  const useSample = isGuest || error || (data?.stats.total_purchases === 0 && !loading);
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
    <div className="anim-fadeInUp" style={{ color: C.t1, minHeight: "100vh" }}>
      <style>{`
        @keyframes sk { 0%,100%{opacity:.9} 50%{opacity:.4} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @media(max-width:768px){
          .mg{grid-template-columns:1fr!important}
          .feat-grid{grid-template-columns:repeat(2,1fr)!important}
          .reco-grid{grid-template-columns:1fr!important}
          .side-secondary{display:none!important}
          .action-overflow{display:none!important}
          .action-expand{display:flex!important}
          .chart-meta{display:none!important}
        }
        .action-expand{display:none}
        .feature-card:hover { transform: translateY(-2px); border-color: ${C.bdSt} !important; box-shadow: 0 6px 22px rgba(0,0,0,0.08) !important; }
        .arow:hover  { border-color: ${C.bdSt} !important; background: rgba(0,122,255,0.04) !important; }
        .abtn:hover  { opacity: 0.82 !important; }
        .abtn { min-height: 36px; }
      `}</style>

      {/* ── 接続エラー時の警告（控えめ） ─────────────── */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.30)", borderRadius: 16, padding: "10px 14px", marginBottom: 14 }}>
          <AlertTriangle size={15} color="#ff4444" />
          <span style={{ fontSize: 12, color: "#cc6655" }}>バックエンドに接続できないため、サンプルを表示しています。しばらくしてからリロードしてください。</span>
        </div>
      )}
      {!error && updated && !isGuest && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.t4, marginBottom: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.up, animation: "pulse 2s ease-in-out infinite" }} />
          {updated.getHours()}:{String(updated.getMinutes()).padStart(2,"0")} 更新
        </div>
      )}

      {/* ── ヒーロー（実績アピール） ─────────────── */}
      <HeroSection
        thisM={thisM}
        pDiff={pDiff}
        rate={rate}
        thisSl={thisSl}
        inStock={inStock}
        isGuest={isGuest}
        useSample={useSample}
        loading={loading}
        health={health}
      />

      {/* ── オンボーディングチェックリスト（ログイン済み） ── */}
      {!isGuest && !useSample && <OnboardingChecklist />}

      {/* ── 本番8機能カード（全ユーザー向け） ───────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: C.t1, letterSpacing: "-0.01em" }}>できること</div>
            <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>あなたの物販を、AIがまるごとサポートします</div>
          </div>
        </div>
        <div className="feat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {FEATURES.map((f) => <FeatureCard key={f.href} item={f} />)}
        </div>
      </div>

      {/* ── ゲスト・空データ向け：おすすめ仕入れTOP3 ──── */}
      {useSample && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.t1, letterSpacing: "-0.01em" }}>今日のおすすめ仕入れ TOP3</div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>AIが厳選した、利益率の高い仕入れ候補（最終判断はご自身で）</div>
            </div>
            <span style={{ fontSize: 10, color: C.t4, background: `${C.gold}12`, border: `1px solid ${C.gold}22`, borderRadius: 8, padding: "2px 8px", letterSpacing: "0.06em" }}>SAMPLE</span>
          </div>
          <div className="reco-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {SAMPLE_PROFIT_CANDIDATES.map((c, idx) => (
              <div key={c.id} style={{ position: "relative" }}>
                {idx === 0 && (
                  <div style={{ position: "absolute", top: -10, left: 14, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLt})`, color: "#fff", fontSize: 10, fontWeight: 900, padding: "3px 10px", borderRadius: 28, letterSpacing: "0.06em", zIndex: 1, boxShadow: "0 2px 8px rgba(0,111,230,0.30)" }}>
                    NO.1
                  </div>
                )}
                <ProfitCandidateCard {...c} />
              </div>
            ))}
          </div>

          {/* 料金CTA — デモ閲覧後の導線 */}
          <div style={{ marginTop: 16, background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 24, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 4 }}>気になる商品が見つかりましたか？</div>
              <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.6 }}>
                Standardプラン（月額¥9,800）でリアルタイムスキャン・全商品の詳細分析が使えます。7日間無料トライアル付き。
              </div>
              <div style={{ fontSize: 11, color: C.t4, lineHeight: 1.6, marginTop: 6 }}>
                ※ 無料期間中に解約すれば料金は発生しません。期間終了後は自動的に課金が開始されます。
              </div>
            </div>
            <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.gold, borderRadius: 18, color: "var(--surface)", padding: "12px 24px", fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
              料金プランを見る
            </Link>
          </div>
        </div>
      )}

      {/* ── ログイン済み（実データあり）向け：詳細ダッシュ ── */}
      {!useSample && (
        <>
          {/* 月次目標 */}
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
                      <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveGoal()} style={{ background: C.bg0, border: `1px solid ${C.gold}50`, borderRadius: 10, color: C.gold, padding: "3px 10px", fontSize: 13, width: 130, fontFamily: "monospace", outline: "none" }} autoFocus />
                      <button onClick={saveGoal} style={{ background: `${C.gold}18`, border: `1px solid ${C.gold}40`, borderRadius: 10, color: C.gold, padding: "3px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}><Check size={11} /> 保存</button>
                      <button onClick={() => setEditGoal(false)} style={{ background: "none", border: `1px solid ${C.bdSub}`, borderRadius: 10, color: C.t3, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>×</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditGoal(true); setGoalInput(String(goal.goal)); }} style={{ background: "none", border: `1px solid ${C.bdSub}`, borderRadius: 10, color: C.t3, padding: "3px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                      <Pencil size={10} /> 変更
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: C.t3 }}>現在 <span style={{ color: col, fontFamily: "monospace", fontWeight: 700 }}>¥{Math.round(goal.current_profit).toLocaleString()}</span></span>
                  <span style={{ color: C.t3 }}>目標 <span style={{ color: C.t2, fontFamily: "monospace", fontWeight: 700 }}>¥{goal.goal.toLocaleString()}</span></span>
                </div>
                <div style={{ background: C.bg0, borderRadius: 6, height: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${col}80,${col})`, borderRadius: 6, transition: "width 0.6s ease" }} />
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: col, marginTop: 4, fontWeight: 700 }}>{pct >= 100 ? "目標達成" : `${pct.toFixed(1)}%`}</div>
              </div>
            );
          })()}
          {goal && goal.goal === 0 && (
            <button onClick={() => { setEditGoal(true); setGoalInput(""); }} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: `1px dashed ${C.bd}`, borderRadius: 14, color: C.t3, padding: "11px 20px", fontSize: 12, cursor: "pointer", marginBottom: 14, width: "100%" }}>
              <Target size={12} /> 今月の目標利益を設定する
            </button>
          )}

          {/* 要対応 */}
          <div style={card({ marginBottom: 18 })}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <AlertTriangle size={13} color={actions.length > 0 ? C.warn : C.t3} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.t2, letterSpacing: "0.03em" }}>今日の要対応</span>
                {actions.length > 0 && (
                  <span style={{ background: `${C.dn}18`, border: `1px solid ${C.dn}30`, borderRadius: 28, padding: "1px 9px", fontSize: 10, color: C.dn, fontWeight: 800 }}>{actions.length}</span>
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
                <div style={{ fontSize: 13, color: C.t2, fontWeight: 600, marginBottom: 4 }}>対応が必要な事項はありません</div>
                <div style={{ fontSize: 11, color: C.t3 }}>新しいアラートが発生次第、ここに表示されます</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {actions.map((a, i) => (
                  <div key={a.id} className={`arow${i >= 2 && !showAllActions ? " action-overflow" : ""}`} style={{ display: "flex", alignItems: "center", gap: 14, background: `${AL[a.type]}07`, border: `1px solid ${AL[a.type]}20`, borderRadius: 14, padding: "11px 16px", transition: "all .15s" }}>
                    <div style={{ width: 2, height: 36, borderRadius: 2, background: AL[a.type], flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: SC[a.status] ?? C.t3, background: `${SC[a.status] ?? C.t3}15`, border: `1px solid ${SC[a.status] ?? C.t3}22`, borderRadius: 6, padding: "1px 6px", flexShrink: 0, letterSpacing: "0.06em" }}>
                          {SL[a.status] ?? a.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: C.t3 }}>{a.sub}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <Link href={a.link} className="abtn" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--surface)", background: C.gold, borderRadius: 12, padding: "5px 12px", textDecoration: "none", transition: "opacity .15s" }}>
                        <Tag size={9} /> {a.action}
                      </Link>
                      {a.pid !== null && (
                        <Link href="/purchases" className="abtn" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.t3, background: "none", border: `1px solid ${C.bdSub}`, borderRadius: 10, padding: "5px 10px", textDecoration: "none", transition: "background .15s" }}>
                          <ExternalLink size={9} /> 詳細
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
                {actions.length > 2 && (
                  <button className="action-expand" onClick={() => setShowAllActions(v => !v)} style={{ alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: `1px solid ${C.bd}`, borderRadius: 12, color: C.t3, padding: "10px 16px", fontSize: 12, cursor: "pointer", width: "100%", minHeight: 40 }}>
                    {showAllActions ? "折りたたむ" : `残り ${actions.length - 2} 件を表示`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* メインのグリッド：チャート + 健全性 */}
          <div className="mg" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* チャート */}
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
                  <Suspense fallback={<Sk h={190} />}>
                    <LazyChart data={chart} t1={C.t1} t3={C.t3} bdSub={C.bdSub} up={C.gold} dn={C.dn} bg1={C.bg1} bd={C.bd} />
                  </Suspense>
                )}
              </div>

              {/* 直近の仕入れ */}
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
              {/* 事業の健全性 */}
              <div style={card()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, letterSpacing: "0.03em" }}>事業の健全性</div>
                    <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>累計 収益パフォーマンス</div>
                  </div>
                  {!loading && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, background: `${health.color}14`, border: `1px solid ${health.color}28`, borderRadius: 12, padding: "5px 10px" }}>
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

              {/* ステータス内訳 */}
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
                          <span style={{ background: `${SC[status] ?? C.gold}12`, border: `1px solid ${SC[status] ?? C.gold}22`, borderRadius: 28, padding: "2px 12px", fontWeight: 700, fontSize: 12, color: SC[status] ?? C.gold, fontFamily: "monospace" }}>
                            {count}
                          </span>
                        </div>
                      ))
                  }
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
