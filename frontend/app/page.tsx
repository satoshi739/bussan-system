"use client";

import { useEffect, useState, useSyncExternalStore, lazy, Suspense } from "react";
import { useSession } from "next-auth/react";
import { getDashboard, getStalePurchases, getPurchases, getGoal, setGoal, getTodayCounts, type Dashboard, type Purchase, type TodayCounts } from "@/lib/api";
import { TrendingUp, ShoppingCart, Package, Banknote, Target, Pencil, Check, AlertTriangle, Zap, ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Award, Tag, ExternalLink, Play, Star, Search, Bot, Camera, Lightbulb, Flame, Truck, MessageCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import OnboardingModal, { OnboardingChecklist, useOnboarding } from "@/components/OnboardingModal";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";

// recharts を遅延ロード — 初回 JS バンドルから除外（約300KB削減）
const LazyChart = lazy(() => import("@/components/ProfitBarChart"));

// ─────────────────────────────────────────────────────────
//  Design System — Light Mode: Cool White × iOS Blue
// ─────────────────────────────────────────────────────────
const C = {
  // backgrounds — light, airy
  bg0:  "var(--bg)",   // page base
  bg1:  "var(--surface)",   // card surface
  bg2:  "var(--surface-2)",   // elevated / input fill
  bg3:  "var(--surface-2)",   // tooltips, dropdowns

  // text — dark on light (improved contrast)
  t1:   "var(--text)",
  t2:   "var(--text-2)",
  t3:   "var(--text-3)",
  t4:   "var(--text-4)",

  // Blue (primary accent — deepened for contrast)
  gold:   "var(--blue)",
  goldLt: "var(--blue-lt)",
  goldDm: "var(--blue-dm)",

  // secondary accent (sky blue)
  azure:     "var(--blue-lt)",
  azureGlow: "#60BFEF",

  // signal colors
  up:    "#1E9C3C",   // green
  dn:    "#E02E24",   // red
  warn:  "#E88500",   // orange
  info:  "var(--blue)",   // blue

  // borders — more visible on white
  bd:    "var(--border)",
  bdSt:  "var(--border-strong)",
  bdSub: "var(--border-sub)",
};

// iOS Light card — white with soft shadow
const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: C.bg1,
  border: `1px solid ${C.bd}`,
  borderRadius: 28,
  padding: "20px 20px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
  ...extra,
});

// ── Sample data ──────────────────────────────────────────
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

// ── Simple Start — おばちゃんでも分かる「まずはこれから」カード ────
const SIMPLE_START_KEY = "bcg_simple_start_dismissed";
const noop = () => () => {};
function SimpleStartCard() {
  // SSR時は表示せず、CSR時のみlocalStorage確認 — React 19のuseSyncExternalStore で
  const hidden = useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined") return noop();
      window.addEventListener("storage", cb);
      return () => window.removeEventListener("storage", cb);
    },
    () => (typeof window === "undefined" ? true : localStorage.getItem(SIMPLE_START_KEY) === "1"),
    () => true,
  );
  const [forceHidden, setForceHidden] = useState(false);
  const dismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(SIMPLE_START_KEY, "1");
      // 別タブにも通知する用（同一タブにはstorageイベントが飛ばないのでforce）
      window.dispatchEvent(new StorageEvent("storage", { key: SIMPLE_START_KEY }));
    }
    setForceHidden(true);
  };
  if (hidden || forceHidden) return null;
  return (
    <div style={{
      position: "relative",
      background: `linear-gradient(135deg, ${C.gold} 0%, ${C.azure} 100%)`,
      borderRadius: 28,
      padding: "32px 28px 28px",
      marginBottom: 20,
      boxShadow: "0 10px 28px rgba(0,111,230,0.22)",
      color: "#fff",
      overflow: "hidden",
    }}>
      <button
        onClick={dismiss}
        aria-label="このご案内を閉じる"
        style={{
          position: "absolute", top: 14, right: 14,
          width: 34, height: 34, borderRadius: 17,
          background: "rgba(255,255,255,0.20)",
          border: "none", color: "#fff",
          cursor: "pointer", fontSize: 20, lineHeight: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >×</button>

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", opacity: 0.92, marginBottom: 10 }}>
        ✨ まずはこれから
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 10, letterSpacing: "-0.02em", lineHeight: 1.3 }}>
        商品を1つだけ、<br />調べてみましょう
      </div>
      <div style={{ fontSize: 14, opacity: 0.95, marginBottom: 22, lineHeight: 1.7 }}>
        商品の名前を入れるだけ。<br />
        <b>概算利益</b>を45秒で確認できます。
      </div>

      <Link href="/scanner" style={{ textDecoration: "none", display: "inline-block" }}>
        <span style={{
          background: "#fff", color: C.gold,
          borderRadius: 20,
          padding: "20px 36px",
          fontSize: 18, fontWeight: 800,
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,0.14)",
          display: "inline-flex", alignItems: "center", gap: 10,
          letterSpacing: "-0.01em",
        }}>
          <Search size={20} /> 商品を1つ調べる
        </span>
      </Link>

      <div style={{ fontSize: 11, opacity: 0.78, marginTop: 16 }}>
        ※ 困ったときは、左メニューの「困ったとき」を押してください
      </div>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────
// ── Morning Briefing — 朝のAI挨拶 + 今日のアクション ────────
function MorningBriefing() {
  const hour = new Date().getHours();
  const greeting =
    hour < 5  ? "おやすみのところ、起きてますね" :
    hour < 11 ? "おはようございます" :
    hour < 17 ? "こんにちは" :
    hour < 22 ? "こんばんは" :
                "夜遅くまで、お疲れさまです";

  const actions = [
    { tag: "OPPORTUNITY", text: "ROI 61% の高利益商品を14件発見しました", href: "/discover", color: C.up },
    { tag: "ATTENTION",   text: "3週間動いていない在庫が2点 → 値下げを検討",  href: "/inventory", color: C.warn },
    { tag: "MILESTONE",   text: "月¥100,000バッジまで あと¥21,600",         href: "/achievements", color: C.gold },
  ];

  return (
    <div style={{
      background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 24,
      padding: "24px 28px", marginBottom: 20,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.gold, letterSpacing: "0.12em" }}>MORNING BRIEFING</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.t1, marginTop: 6, letterSpacing: "-0.01em" }}>{greeting}、Satoshiさん。</div>
          <div style={{ fontSize: 13, color: C.t3, marginTop: 4 }}>今日、AIが見つけたあなたの「やるべき3つ」です。</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {actions.map((a, i) => (
          <Link key={i} href={a.href} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", background: C.bg2, borderRadius: 14,
            textDecoration: "none", border: `1px solid ${C.bdSub}`,
            transition: "transform 0.15s, border-color 0.15s",
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${a.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: a.color }}>{i + 1}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: a.color, letterSpacing: "0.1em", marginBottom: 2 }}>{a.tag}</div>
              <div style={{ fontSize: 13, color: C.t1, fontWeight: 500, letterSpacing: "-0.01em" }}>{a.text}</div>
            </div>
            <ChevronRight size={16} color={C.t3} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function Sk({ w = "100%", h = 16, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: `rgba(0,0,0,0.07)`, animation: "sk 1.6s ease-in-out infinite" }} />;
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
      borderRadius: 28,
      padding: "18px 18px 20px",
      height: "100%",
      cursor: href ? "pointer" : "default",
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{
          background: `${accent}15`,
          borderRadius: 14,
          width: 38,
          height: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 2px 8px ${accent}20`,
        }}>
          <Icon size={16} color={accent} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.t3, letterSpacing: "0.04em" }}>
          {label}
        </span>
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
  if (r >= 30) return { g: "S", color: C.up,   label: "超優良" };
  if (r >= 20) return { g: "A", color: C.gold, label: "優良"   };
  if (r >= 10) return { g: "B", color: C.warn, label: "標準"   };
  return              { g: "C", color: C.dn,   label: "要改善" };
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
    <div style={{ background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 24, padding: "16px 18px" }}>
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

// ── Quick Profit Check ────────────────────────────────────
function QuickProfitCheck() {
  const [buy,  setBuy]  = useState("");
  const [sell, setSell] = useState("");
  const [name, setName] = useState("");

  const buyN  = Number(buy)  || 0;
  const sellN = Number(sell) || 0;
  const fee   = sellN * 0.1;                      // メルカリ10%
  const profit = sellN - fee - buyN;
  const rate   = sellN > 0 ? (profit / sellN) * 100 : 0;
  const hasResult = buyN > 0 && sellN > 0;

  const verdict = rate >= 30
    ? { label: "仕入れをおすすめ",   color: C.gold,  bg: `${C.gold}18`,  icon: "◎" }
    : rate >= 15
    ? { label: "条件次第で検討",     color: C.warn,  bg: `${C.warn}14`,  icon: "△" }
    : { label: "見送りをおすすめ",   color: C.dn,    bg: `${C.dn}12`,    icon: "✕" };

  return (
    <div style={{
      background: C.bg1,
      border: `1px solid ${C.bd}`,
      borderRadius: 28,
      padding: "24px 24px",
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ background: `${C.gold}15`, borderRadius: 14, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 8px ${C.gold}20` }}>
          <Zap size={20} color={C.gold} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: C.t1, letterSpacing: "-0.01em" }}>
            まず1商品の利益を計算してみましょう
          </div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>仕入れ値と販売価格を入れるだけ。30秒で判断できます。</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: C.t3, fontWeight: 600, display: "block", marginBottom: 6 }}>仕入れ値（円）</label>
          <input
            type="number" placeholder="例: 3,000" value={buy}
            onChange={e => setBuy(e.target.value)}
            style={{ width: "100%", background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 18, color: C.t1, padding: "13px 14px", fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "ui-monospace, monospace" }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: C.t3, fontWeight: 600, display: "block", marginBottom: 6 }}>販売価格（円）</label>
          <input
            type="number" placeholder="例: 8,000" value={sell}
            onChange={e => setSell(e.target.value)}
            style={{ width: "100%", background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 18, color: C.t1, padding: "13px 14px", fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "ui-monospace, monospace" }}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 12, color: C.t3, fontWeight: 600, display: "block", marginBottom: 6 }}>商品名（任意）</label>
          <input
            type="text" placeholder="例: セイコー 腕時計 中古" value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: "100%", background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 18, color: C.t1, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>
      </div>

      {hasResult && (
        <div style={{ background: verdict.bg, border: `1px solid ${verdict.color}40`, borderRadius: 18, padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(3,1fr) auto", gap: 16, alignItems: "center", animation: "none" }}>
          {[
            { label: "利益額",  val: `${profit >= 0 ? "+" : ""}¥${Math.round(profit).toLocaleString()}`, col: profit >= 0 ? C.up : C.dn },
            { label: "利益率",  val: `${rate.toFixed(1)}%`,                                              col: rate >= 30 ? C.gold : rate >= 15 ? C.warn : C.dn },
            { label: "販売手数料", val: `¥${Math.round(fee).toLocaleString()}`,                          col: C.t3 },
          ].map(({ label, val, col }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: C.t3, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: col, fontFamily: "ui-monospace, monospace", letterSpacing: "-0.02em" }}>{val}</div>
            </div>
          ))}
          <div style={{ background: verdict.bg, border: `1px solid ${verdict.color}50`, borderRadius: 16, padding: "10px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{verdict.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: verdict.color, whiteSpace: "nowrap" }}>{verdict.label}</div>
          </div>
        </div>
      )}

      {!hasResult && (
        <div style={{ textAlign: "center", padding: "12px 0", color: C.t4, fontSize: 12 }}>
          仕入れ値と販売価格を入力すると判定が表示されます
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <Link href="/calculator" style={{ fontSize: 12, color: C.t3, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
          詳細計算（送料・手数料込み） →
        </Link>
        <Link href="/scanner" style={{ marginLeft: "auto", fontSize: 12, color: C.gold, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
          AI で仕入れ候補を探す →
        </Link>
      </div>
    </div>
  );
}

// ── Mascot Hero ──────────────────────────────────────────
function AICEOHero() {
  return (
    <div style={{
      background: "#FAF4EF",
      border: `1px solid rgba(0,0,0,0.07)`,
      borderRadius: 28,
      overflow: "hidden",
      marginBottom: 16,
    }}>
      <Image
        src="/mascot-banner.png"
        alt="UPJ利益スキャナー — 仕入れ判断をサポートするツール"
        width={800}
        height={200}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
      <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <Link href="/scanner" style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, background: C.gold, borderRadius: 16, color: "var(--surface)",
          padding: "12px 20px", fontSize: 14, fontWeight: 700, textDecoration: "none",
        }}>
          <Zap size={15} /> 今すぐ利益を調べる
        </Link>
        <Link href="/agents" style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "transparent", border: `1px solid ${C.bd}`,
          borderRadius: 16, color: C.t2, padding: "12px 20px",
          fontSize: 13, fontWeight: 600, textDecoration: "none",
        }}>
          <Play size={13} /> AI に任せる
        </Link>
      </div>
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
  const [counts,    setCounts]     = useState<TodayCounts | null>(null);
  const [editGoal,  setEditGoal]   = useState(false);
  const [goalInput, setGoalInput]  = useState("");
  const [error,     setError]      = useState(false);
  const [loading,   setLoading]    = useState(true);
  const [sample,    setSample]     = useState(false);
  const [updated,   setUpdated]    = useState<Date | null>(null);
  const [showAllActions, setShowAllActions] = useState(false);

  const isGuest = status === "unauthenticated";
  const { show: showOnboarding, complete: completeOnboarding } = useOnboarding();

  useEffect(() => {
    if (status === "loading") return;
    if (isGuest) { setLoading(false); return; }
    const doLoad = async () => {
      setLoading(true);
      try {
        // 全APIを並列実行 — 直列より高速
        const [d, stale, recent, goal, counts] = await Promise.all([
          getDashboard(),
          getStalePurchases(14).catch((): Purchase[] => []),
          getPurchases({ limit: 5 }).catch((): Purchase[] => []),
          getGoal().catch(() => null),
          getTodayCounts().catch((): TodayCounts | null => null),
        ]);
        setData(d); setError(false); setUpdated(new Date());
        setStale(stale ?? []);
        setRecent(recent ?? []);
        if (goal) setGoalData(goal);
        if (counts) setCounts(counts);
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
    <div className="anim-fadeInUp" style={{ color: C.t1, minHeight: "100vh" }}>
      {/* Onboarding modal — ログイン済み・初回のみ表示 */}
      {!isGuest && showOnboarding && <OnboardingModal onComplete={completeOnboarding} />}
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
        .kcard:hover { border-color: ${C.gold}50 !important; box-shadow: 0 4px 20px rgba(0,0,0,0.10) !important; }
        .kcard { min-height: 44px; }
        .arow:hover  { border-color: ${C.bdSt} !important; background: rgba(0,122,255,0.04) !important; }
        .abtn:hover  { opacity: 0.82 !important; }
        .abtn { min-height: 36px; }
        .slink:hover { background: rgba(0,111,230,0.07) !important; }
        .btn-primary:hover { opacity: 0.85 !important; }
        .btn-secondary:hover { background: rgba(0,0,0,0.06) !important; }
      `}</style>

      {/* Quick Profit Check — ログイン済み・データなし時に最上部表示 */}
      {!isGuest && useSample && !loading && !error && <QuickProfitCheck />}

      {/* AI CEO Hero — ゲスト・空データ時にトップ表示 */}
      {useSample && <AICEOHero />}

      {/* Guest banner — 未ログイン訪問者向け */}
      {showGuestBanner && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 24, padding: "14px 18px", marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.gold}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Lightbulb size={15} color={C.gold} />
          </div>
          <span style={{ fontSize: 13, color: C.t2, flex: 1 }}>
            これは<span style={{ color: C.gold, fontWeight: 700 }}>サンプルデータ</span>です。実際の物販データで管理を始めるには無料で登録してください。
          </span>
          <Link
            href="/scanner"
            style={{ display: "flex", alignItems: "center", gap: 6, background: C.gold, borderRadius: 16, color: "var(--surface)", padding: "9px 18px", fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}
          >
            今すぐ利益を調べる
          </Link>
        </div>
      )}

      {/* Empty-data banner — ログイン済み・データ0件 or バックエンドエラー */}
      {showEmptyBanner && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: error ? "rgba(255,69,58,0.08)" : C.bg1, border: `1px solid ${error ? "rgba(255,69,58,0.35)" : C.bd}`, borderRadius: 24, padding: "14px 20px", marginBottom: 16 }}>
          {!error ? (
            <Image src="/mascot-cat.png" alt="UPJ" width={52} height={52} style={{ objectFit: "contain", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,69,58,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AlertTriangle size={17} color="#ff4444" />
            </div>
          )}
          <div style={{ flex: 1 }}>
            {error ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ff9988", marginBottom: 2 }}>バックエンドに接続できないため、サンプルデータを表示しています</div>
                <div style={{ fontSize: 11, color: C.t3 }}>しばらく待ってからページをリロードしてください。</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, marginBottom: 2 }}>仕入れを登録すると、このダッシュボードに実データが反映されます</div>
                <div style={{ fontSize: 11, color: C.t3 }}>今は月商¥98,400・利益率31.5%のサンプルを表示中。データを入れると自動で切り替わります。</div>
              </>
            )}
          </div>
          {!error && (
          <Link
            href="/purchases"
            style={{ display: "flex", alignItems: "center", gap: 5, background: C.gold, borderRadius: 16, color: "var(--surface)", padding: "9px 18px", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}
          >
            仕入れを登録する
          </Link>
          )}
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
            <div className="step-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {([
                {
                  icon: Search,
                  label: "利益スキャナー",
                  desc: "商品名を入れるだけ。仕入れ価格・利益率・需要を瞬時に判定。",
                  cta: "今すぐ試す →",
                  href: "/scanner",
                  accent: C.gold,
                },
                {
                  icon: Bot,
                  label: "AI CEO に指示する",
                  desc: "「利益率30%の商品を探して」と入力するだけで全自動スキャン開始。",
                  cta: "起動する →",
                  href: "/agents",
                  accent: "#66aaff",
                },
                {
                  icon: Package,
                  label: "仕入れを登録する",
                  desc: "商品・価格を記録するとダッシュボードに利益・在庫が自動反映。",
                  cta: "登録する →",
                  href: "/purchases",
                  accent: C.up,
                },
                {
                  icon: Camera,
                  label: "バーコードスキャン",
                  desc: "スマホのカメラで商品バーコードを読み取るだけで即座に利益計算。店頭で使える。",
                  cta: "スキャンする →",
                  href: "/barcode",
                  accent: "#44ccaa",
                },
              ] as { icon: React.ElementType; label: string; desc: string; cta: string; href: string; accent: string }[]).map(({ icon: Icon, label, desc, cta, href, accent }) => (
                <Link key={label} href={href} style={{ textDecoration: "none", display: "block" }}>
                  <div style={{
                    background: C.bg1,
                    border: `1px solid ${C.bd}`,
                    borderRadius: 24,
                    padding: "18px 18px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 7,
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    height: "100%",
                    cursor: "pointer",
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={20} color={accent} />
                    </div>
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
                <Flame size={16} color={C.warn} />
                <span style={{ fontSize: 14, fontWeight: 900, color: C.t1, letterSpacing: "-0.01em" }}>今日のおすすめ仕入れTOP3</span>
              </div>
              <div style={{ fontSize: 11, color: C.t3 }}>利益率・想定利益・仕入れ判断の参考情報をAIがまとめて表示します。最終判断はご自身で行ってください</div>
            </div>
            <span style={{ fontSize: 10, color: C.t4, background: `${C.gold}12`, border: `1px solid ${C.gold}22`, borderRadius: 8, padding: "2px 8px", letterSpacing: "0.06em" }}>SAMPLE</span>
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
                    borderRadius: 28,
                    letterSpacing: "0.06em",
                    zIndex: 1,
                  }}>
                    NO.1
                  </div>
                )}
                <ProfitCandidateCard {...c} />
              </div>
            ))}
          </div>

          {/* /pricing CTA — デモ閲覧後の導線 */}
          <div style={{ marginTop: 16, background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 24, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 4 }}>気になる商品が見つかりましたか？</div>
              <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.6 }}>
                Standardプラン（月額¥9,800）でリアルタイムスキャン・全商品の詳細分析が使えます。7日間無料トライアル付き。
              </div>
              <div style={{ fontSize: 11, color: C.t4, lineHeight: 1.6, marginTop: 6 }}>
                ※ 無料期間中に解約すれば料金は発生しません。期間終了後は選択プランに応じて自動的に課金が開始されます。課金開始後の返金は当社が別途認める場合を除き行っておりません。
              </div>
            </div>
            <Link
              href="/pricing"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.gold, borderRadius: 18, color: "var(--surface)", padding: "12px 24px", fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}
            >
              料金プランを見る
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
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: C.gold, background: `${C.gold}18`, border: `1px solid ${C.gold}35`, borderRadius: 8, padding: "2px 8px" }}>DEMO</span>
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
            <button onClick={() => setSample(false)} className="btn-secondary" style={{ fontSize: 12, background: "none", border: `1px solid ${C.bd}`, borderRadius: 12, color: C.t3, padding: "10px 14px", cursor: "pointer", minHeight: 40 }}>実データを表示</button>
          )}
          <Link href="/calculator" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 5, background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 18, color: C.t2, padding: "10px 16px", fontSize: 13, textDecoration: "none", fontWeight: 600, minHeight: 40 }}>
            利益計算
          </Link>
          <Link href="/scanner" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, background: C.gold, borderRadius: 18, color: "var(--surface)", padding: "10px 22px", fontSize: 14, textDecoration: "none", fontWeight: 700, minHeight: 40 }}>
            今すぐ利益を調べる
          </Link>
        </div>
      </div>

      {/* Onboarding */}
      {isEmpty && (
        <div style={{ background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 28, padding: "28px 28px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ background: `${C.gold}15`, borderRadius: 14, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 8px ${C.gold}20` }}>
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
              <div key={s} style={{ background: C.bg0, borderRadius: 16, padding: "16px 18px", border: `1px solid ${C.bdSub}`, display: "flex", flexDirection: "column", gap: 6 }}>
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
            <Link href="/purchases" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: C.gold, borderRadius: 20, color: "var(--surface)", padding: "14px 28px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              仕入れを登録する
            </Link>
            <button onClick={() => setSample(true)} className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 20, color: C.t2, padding: "14px 20px", fontSize: 13, cursor: "pointer" }}>
              <Play size={13} /> デモデータで確認
            </button>
          </div>
        </div>
      )}

      {/* ── まずはこれから（おばちゃん向け超シンプル導線） ───── */}
      {!isGuest && <SimpleStartCard />}

      {/* Onboarding Checklist */}
      {!isEmpty && <OnboardingChecklist />}

      {/* ── 朝のブリーフィング ────────────────────────────── */}
      {!isGuest && <MorningBriefing />}

      {/* ── 自動パイプライン Today（iOS風シンプル） ──────────── */}
      {!isGuest && (
        <Link href="/pipeline" style={{ textDecoration: "none", display: "block", marginBottom: 24 }}>
          <div style={{
            background: C.bg1,
            border: `1px solid ${C.bd}`,
            borderRadius: 24,
            padding: "24px 28px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
            transition: "transform 0.2s, box-shadow 0.2s",
            cursor: "pointer",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.gold, letterSpacing: "0.12em", marginBottom: 6 }}>AUTO PIPELINE</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.t1, lineHeight: 1.3, letterSpacing: "-0.01em" }}>あなたの代わりに、AIが動いています</div>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.gold, fontSize: 13, fontWeight: 600 }}>
                開く <ChevronRight size={16} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0, marginBottom: 20 }}>
              {[
                { label: "発見", v: 14 },
                { label: "出品中", v: 23 },
                { label: "売却", v: 4 },
                { label: "配送", v: 6 },
                { label: "完了", v: 3 },
              ].map((s, i, arr) => (
                <div key={s.label} style={{ textAlign: "center", padding: "0 8px", borderRight: i < arr.length - 1 ? `1px solid ${C.bdSub}` : "none" }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: C.t1, lineHeight: 1, letterSpacing: "-0.03em", fontFamily: "ui-monospace, 'SF Pro Display', -apple-system, monospace" }}>
                    <AnimatedNumber value={s.v} />
                  </div>
                  <div style={{ fontSize: 11, color: C.t3, marginTop: 6, fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: `1px solid ${C.bdSub}`, gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 28 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.t3, fontWeight: 500 }}>今月の自動売上</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.t1, marginTop: 2, fontFamily: "ui-monospace, 'SF Pro Display', monospace" }}>
                    <AnimatedNumber value={482400} prefix="¥" durationMs={1500} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.t3, fontWeight: 500 }}>削減作業時間</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.t1, marginTop: 2, fontFamily: "ui-monospace, 'SF Pro Display', monospace" }}>
                    <AnimatedNumber value={32.5} decimals={1} suffix="h" durationMs={1500} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ── 今日のToDo 5ステージ ──────────────────────────── */}
      {!isGuest && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Flame size={16} color={C.warn} />
            <span style={{ fontSize: 14, fontWeight: 900, color: C.t1, letterSpacing: "-0.01em" }}>今日のToDo</span>
            <span style={{ fontSize: 11, color: C.t3 }}>上から順番にやれば1日が完結します</span>
          </div>
          <div className="todo-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {([
              { n: 1, label: "発見",      sub: "今日のおすすめ", icon: Search,         href: "/discover",    count: counts?.discover ?? 0, accent: C.gold },
              { n: 2, label: "出品",      sub: "出品待ち",       icon: Tag,            href: "/listings",    count: counts?.listing  ?? 0, accent: C.azure },
              { n: 3, label: "発送",      sub: "発送待ち",       icon: Package,        href: "/fulfillment", count: counts?.shipping ?? 0, accent: C.warn },
              { n: 4, label: "到着確認",  sub: "配送中",         icon: Truck,          href: "/inventory",   count: counts?.delivery ?? 0, accent: C.info },
              { n: 5, label: "お礼",      sub: "メッセージ待ち", icon: MessageCircle,  href: "/thanks",      count: counts?.thanks   ?? 0, accent: C.up    },
            ] as { n: number; label: string; sub: string; icon: React.ElementType; href: string; count: number; accent: string }[]).map(({ n, label, sub, icon: Icon, href, count, accent }) => (
              <Link key={n} href={href} style={{ textDecoration: "none", display: "block" }}>
                <div className="todo-card" style={{
                  background: C.bg1,
                  border: `1px solid ${count > 0 ? `${accent}55` : C.bd}`,
                  borderRadius: 20,
                  padding: "14px 14px 12px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  position: "relative",
                  cursor: "pointer",
                  transition: "border-color .2s, transform .15s, box-shadow .2s",
                  boxShadow: count > 0 ? `0 2px 8px ${accent}20` : "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={16} color={accent} />
                    </div>
                    <div style={{
                      minWidth: 26,
                      height: 22,
                      padding: "0 8px",
                      borderRadius: 11,
                      background: count > 0 ? accent : C.bg2,
                      color: count > 0 ? "var(--surface)" : C.t4,
                      fontSize: 12,
                      fontWeight: 900,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "ui-monospace,'SF Mono',monospace",
                    }}>
                      {loading ? "…" : count}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.t4, letterSpacing: "0.08em" }}>STEP {n}</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: C.t1, letterSpacing: "-0.01em" }}>{label}</div>
                  <div style={{ fontSize: 11, color: C.t3, marginTop: -2 }}>{sub}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: accent, marginTop: "auto" }}>
                    {count > 0 ? "対応する" : "確認する"}
                    <ChevronRight size={12} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <style>{`
            @media(max-width:768px){
              .todo-grid{grid-template-columns:repeat(2,1fr)!important}
            }
            .todo-card:hover{transform:translateY(-2px)}
          `}</style>
        </div>
      )}

      {/* Mobile Hero — スマホのみ表示 */}
      <div className="mobile-hero" style={{ display: "none", marginBottom: 16 }}>
        <div style={{ background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 28, padding: "20px 20px 16px" }}>
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
      <div className="kg stagger" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 10 }}>
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

      {/* KPI Sub-row — ROI / 平均保有日数 / 在庫投資額 */}
      <div className="kg" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
        {([
          {
            label: "ROI（投資対効果）",
            value: loading ? "—" : `${(d?.stats.roi ?? rate).toFixed(1)}%`,
            sub: "総利益 ÷ 総投資額",
            col: (d?.stats.roi ?? rate) >= 20 ? C.gold : (d?.stats.roi ?? rate) >= 10 ? C.warn : C.dn,
          },
          {
            label: "平均保有日数",
            value: loading ? "—" : `${(d?.stats.avg_holding_days ?? 0).toFixed(1)} 日`,
            sub: "仕入→売却の平均期間",
            col: (d?.stats.avg_holding_days ?? 0) <= 14 ? C.up : (d?.stats.avg_holding_days ?? 0) <= 30 ? C.warn : C.dn,
          },
          {
            label: "在庫投資額",
            value: loading ? "—" : `¥${Math.round(d?.stats.active_inventory_value ?? 0).toLocaleString()}`,
            sub: `現在 ${d?.stats.active_inventory_count ?? inStock} 件の在庫`,
            col: C.info,
          },
        ] as { label: string; value: string; sub: string; col: string }[]).map(({ label, value, sub, col }) => (
          <div key={label} style={{
            background: C.bg1,
            border: `1px solid ${C.bd}`,
            borderRadius: 16,
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 11, color: C.t4 }}>{sub}</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: col, fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", letterSpacing: "-0.02em" }}>
              {loading ? <Sk h={22} w={80} /> : value}
            </div>
          </div>
        ))}
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

      {/* Action items */}
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
            <div style={{ fontSize: 13, color: C.t2, fontWeight: 600, marginBottom: 4 }}>現在、対応が必要な事項はありません</div>
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
              <button
                className="action-expand"
                onClick={() => setShowAllActions(v => !v)}
                style={{ alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: `1px solid ${C.bd}`, borderRadius: 12, color: C.t3, padding: "10px 16px", fontSize: 12, cursor: "pointer", width: "100%", minHeight: 40 }}
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
              <Suspense fallback={<Sk h={190} />}>
                <LazyChart
                  data={chart}
                  t1={C.t1} t3={C.t3} bdSub={C.bdSub}
                  up={C.gold} dn={C.dn} bg1={C.bg1} bd={C.bd}
                />
              </Suspense>
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
    </div>
  );
}
