"use client";

import Link from "next/link";
import { TrendingUp, ArrowUpRight, Star, Zap } from "lucide-react";

const C = {
  bg0:    "#0a0a0b",
  bg1:    "#141414",
  bg2:    "#1c1c1e",
  t1:     "#F5F0E8",
  t2:     "#D4CCBC",
  t3:     "#A09488",
  t4:     "#5A5248",
  gold:   "#D4AF37",
  goldLt: "#F0D060",
  up:     "#4ade80",
  bd:     "rgba(212,175,55,0.18)",
  bdSt:   "rgba(212,175,55,0.38)",
};

const CASES = [
  {
    rank: 1,
    emoji: "🎮",
    product: "ゲームボーイソフト まとめ 20本セット",
    source: "ヤフオク",
    dest: "eBay",
    buy: 3800,
    sell: 18200,
    profit: 12400,
    rate: 68,
    days: 4,
    comment: "国内では「まとめ売り」で安く出ていたものを、海外需要の高いeBayでバラ売り。送料込みでも利益率68%を達成。",
  },
  {
    rank: 2,
    emoji: "🧩",
    product: "レゴ テクニック 42083 ブガッティ 箱付き中古",
    source: "メルカリ",
    dest: "Amazon",
    buy: 8500,
    sell: 23800,
    profit: 12300,
    rate: 52,
    days: 9,
    comment: "廃番品は値上がりしやすい。メルカリで状態良好品を仕入れ、Amazonマーケットプレイスで定価以上で即売れ。",
  },
  {
    rank: 3,
    emoji: "⌚",
    product: "セイコー 5 SNXS79 自動巻き メンズウォッチ",
    source: "ヤフオク",
    dest: "eBay",
    buy: 4200,
    sell: 12800,
    profit: 7100,
    rate: 56,
    days: 6,
    comment: "セイコー5は海外人気が高く、国内相場の2〜3倍で売れることがある。利益スキャナーで即座に価格差を発見。",
  },
];

function CaseCard({ c, idx }: { c: typeof CASES[0]; idx: number }) {
  return (
    <div style={{
      background: C.bg1,
      border: `1px solid ${C.bd}`,
      borderTop: `3px solid ${idx === 0 ? C.goldLt : C.gold}`,
      borderRadius: 16,
      padding: "28px 28px 24px",
      position: "relative",
    }}>
      {idx === 0 && (
        <div style={{
          position: "absolute",
          top: -12,
          left: 24,
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldLt})`,
          color: C.bg0,
          fontSize: 11,
          fontWeight: 900,
          padding: "3px 14px",
          borderRadius: 20,
          letterSpacing: "0.08em",
        }}>
          ★ BEST CASE
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <span style={{ fontSize: 36, lineHeight: 1 }}>{c.emoji}</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.t1, lineHeight: 1.4 }}>{c.product}</div>
          <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>
            {c.source} <span style={{ color: C.t4, margin: "0 4px" }}>→</span> {c.dest}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
        {[
          { label: "仕入れ",   val: `¥${c.buy.toLocaleString()}`,    col: C.t2       },
          { label: "販売価格", val: `¥${c.sell.toLocaleString()}`,   col: "#66aaff"  },
          { label: "純利益",   val: `+¥${c.profit.toLocaleString()}`,col: C.up       },
          { label: "利益率",   val: `${c.rate}%`,                    col: C.gold     },
        ].map(({ label, val, col }) => (
          <div key={label} style={{
            background: C.bg0,
            borderRadius: 10,
            padding: "12px 14px",
            border: `1px solid rgba(212,175,55,0.08)`,
          }}>
            <div style={{ fontSize: 10, color: C.t4, letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: col, fontFamily: "ui-monospace,'SF Mono',Menlo,monospace" }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.8, background: `rgba(212,175,55,0.04)`, borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
        {c.comment}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.t4 }}>
        <Zap size={10} color={C.gold} />
        <span>発見から売却まで <span style={{ color: C.gold, fontWeight: 700 }}>{c.days}日</span> で回収</span>
      </div>
    </div>
  );
}

export default function DealsPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg0, color: C.t1 }}>
      <style>{`
        @media(max-width:768px){
          .cases-grid { grid-template-columns: 1fr !important; }
          .stat-grid  { grid-template-columns: 1fr 1fr !important; }
          .case-row   { grid-template-columns: 1fr 1fr !important; }
        }
        .cta-btn:hover { border-color: ${C.goldLt} !important; box-shadow: 0 0 40px rgba(212,175,55,0.35) !important; }
        .back-link:hover { color: ${C.gold} !important; }
      `}</style>

      {/* Nav */}
      <div style={{
        position: "sticky",
        top: 0,
        background: "rgba(10,10,11,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.bd}`,
        zIndex: 50,
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Link href="/" className="back-link" style={{ fontSize: 13, color: C.t3, textDecoration: "none", transition: "color 0.2s" }}>
          ← 物販チェッカー
        </Link>
        <Link href="/scanner" style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: `linear-gradient(135deg,#1E1608,#2A1E08)`,
          border: `1px solid ${C.gold}70`,
          borderRadius: 8,
          color: C.gold,
          padding: "8px 18px",
          fontSize: 13,
          fontWeight: 800,
          textDecoration: "none",
          letterSpacing: "0.03em",
        }}>
          無料で試す →
        </Link>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "60px 24px 80px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: `${C.gold}14`,
            border: `1px solid ${C.gold}30`,
            borderRadius: 20,
            padding: "4px 16px",
            fontSize: 11,
            fontWeight: 700,
            color: C.gold,
            letterSpacing: "0.1em",
            marginBottom: 24,
          }}>
            <Star size={10} fill={C.gold} /> 実際の利益事例
          </div>
          <h1 style={{
            fontSize: 40,
            fontWeight: 900,
            color: C.t1,
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
            margin: "0 0 20px",
          }}>
            物販チェッカーで発見した<br />
            <span style={{ color: C.gold }}>実際の利益事例 3選</span>
          </h1>
          <p style={{ fontSize: 16, color: C.t3, lineHeight: 1.8, maxWidth: 560, margin: "0 auto 40px" }}>
            「本当に稼げるの？」という疑問にお答えします。<br />
            実際にユーザーが利益スキャナーで発見した商品事例です。
          </p>

          {/* Stats */}
          <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 600, margin: "0 auto" }}>
            {[
              { label: "平均利益率", val: "59%", icon: TrendingUp },
              { label: "平均回収日数", val: "6.3日", icon: Zap },
              { label: "平均純利益", val: "¥10,600", icon: Star },
            ].map(({ label, val, icon: Icon }) => (
              <div key={label} style={{
                background: C.bg1,
                border: `1px solid ${C.bd}`,
                borderRadius: 12,
                padding: "20px 16px",
              }}>
                <Icon size={14} color={C.gold} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 22, fontWeight: 900, color: C.gold, fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", letterSpacing: "-0.02em" }}>{val}</div>
                <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Case Cards */}
        <div id="deals" className="cases-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, marginBottom: 64 }}>
          {CASES.map((c, i) => (
            <CaseCard key={c.rank} c={c} idx={i} />
          ))}
        </div>

        {/* CTA */}
        <div style={{
          background: `linear-gradient(135deg,#141208,#1A1608)`,
          border: `1px solid ${C.gold}40`,
          borderRadius: 20,
          padding: "48px 40px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", marginBottom: 16 }}>あなたも同じ結果を出せます</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: C.t1, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            利益スキャナーを無料で体験する
          </h2>
          <p style={{ fontSize: 14, color: C.t3, lineHeight: 1.8, margin: "0 0 32px" }}>
            商品名を入れるだけ。仕入れ価格・利益率・需要を瞬時に判定します。<br />
            登録不要・完全無料でお試しいただけます。
          </p>
          <Link href="/scanner" className="cta-btn" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: `linear-gradient(135deg,#1E1608,#2A1E08)`,
            border: `1px solid ${C.gold}70`,
            borderRadius: 12,
            color: C.gold,
            padding: "16px 40px",
            fontSize: 16,
            fontWeight: 900,
            textDecoration: "none",
            letterSpacing: "0.04em",
            boxShadow: `0 0 32px rgba(212,175,55,0.22)`,
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}>
            <ArrowUpRight size={18} /> 今すぐ無料でスキャン
          </Link>
          <div style={{ fontSize: 12, color: C.t4, marginTop: 16 }}>クレジットカード不要 · 30秒で始められます</div>
        </div>

      </div>
    </div>
  );
}
