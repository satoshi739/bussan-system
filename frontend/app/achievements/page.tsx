"use client";

import { Award, Lock, Sparkles, TrendingUp, ShoppingBag, Package, Star, Zap, Flame, Trophy } from "lucide-react";
import { AnimatedNumber } from "@/components/AnimatedNumber";

const C = {
  bg0: "var(--bg)",
  bg1: "var(--surface)",
  bg2: "var(--surface-2)",
  t1: "var(--text)",
  t2: "var(--text-2)",
  t3: "var(--text-3)",
  t4: "var(--text-4)",
  blue: "var(--blue)",
  gold: "#C9A96B",
  up: "#1E9C3C",
  bd: "var(--border)",
  bdSub: "var(--border-sub)",
};

type Tier = "bronze" | "silver" | "gold" | "platinum";

const TIERS: Record<Tier, { name: string; color: string; bg: string }> = {
  bronze:   { name: "Bronze",   color: "#A6692E", bg: "linear-gradient(135deg, #C8954A, #8B5A2B)" },
  silver:   { name: "Silver",   color: "#8B96A8", bg: "linear-gradient(135deg, #C0C8D4, #7D8696)" },
  gold:     { name: "Gold",     color: "#C9A96B", bg: "linear-gradient(135deg, #F5D687, #B8893E)" },
  platinum: { name: "Platinum", color: "#5F8DBA", bg: "linear-gradient(135deg, #B8D4ED, #4A77A8)" },
};

type Badge = {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  tier: Tier;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: { current: number; target: number };
};

const BADGES: Badge[] = [
  // Bronze (初心者)
  { id: "first-scan",     title: "ファーストスキャン",   desc: "初めての利益スキャンを実行",            icon: Sparkles,    tier: "bronze",   unlocked: true,  unlockedAt: "2026-04-12" },
  { id: "first-purchase", title: "ファースト仕入れ",     desc: "初めての仕入れを登録",                  icon: ShoppingBag, tier: "bronze",   unlocked: true,  unlockedAt: "2026-04-13" },
  { id: "first-sale",     title: "ファースト売却",       desc: "初めての売却を達成",                    icon: TrendingUp,  tier: "bronze",   unlocked: true,  unlockedAt: "2026-04-18" },

  // Silver (中級)
  { id: "ten-sales",      title: "10件売却",             desc: "累計10件の売却を達成",                  icon: Package,     tier: "silver",   unlocked: true,  unlockedAt: "2026-04-26" },
  { id: "profit-100k",    title: "月¥100,000 利益",      desc: "1ヶ月で純利益¥100,000を達成",            icon: TrendingUp,  tier: "silver",   unlocked: false, progress: { current: 78400, target: 100000 } },
  { id: "auto-pipeline",  title: "自動パイプライン稼働", desc: "自動パイプラインで初の売却",            icon: Zap,         tier: "silver",   unlocked: false, progress: { current: 0, target: 1 } },

  // Gold (上級)
  { id: "hundred-sales",  title: "100件売却",            desc: "累計100件の売却を達成",                 icon: Trophy,      tier: "gold",     unlocked: false, progress: { current: 47, target: 100 } },
  { id: "profit-500k",    title: "月¥500,000 利益",      desc: "1ヶ月で純利益¥500,000を達成",            icon: Flame,       tier: "gold",     unlocked: false, progress: { current: 98400, target: 500000 } },
  { id: "roi-50",         title: "ROI 50% 達成",         desc: "月間ROI 50%以上を達成",                 icon: Star,        tier: "gold",     unlocked: false, progress: { current: 31.5, target: 50 } },

  // Platinum (達人)
  { id: "thousand-sales", title: "1,000件売却",          desc: "累計1,000件の売却を達成",                icon: Trophy,      tier: "platinum", unlocked: false, progress: { current: 47, target: 1000 } },
  { id: "profit-million", title: "月¥1,000,000 利益",     desc: "1ヶ月で純利益¥1,000,000を達成",          icon: Flame,       tier: "platinum", unlocked: false, progress: { current: 98400, target: 1000000 } },
  { id: "year-streak",    title: "365日継続",            desc: "365日連続でサービスを利用",             icon: Award,       tier: "platinum", unlocked: false, progress: { current: 28, target: 365 } },
];

export default function AchievementsPage() {
  const unlockedCount = BADGES.filter(b => b.unlocked).length;
  const totalCount = BADGES.length;
  const pct = (unlockedCount / totalCount) * 100;

  return (
    <div style={{ background: C.bg0, minHeight: "100vh", padding: "32px 20px 80px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>

        {/* Hero */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "rgba(201,169,107,0.12)", color: "#8a6d35", border: `1px solid ${C.bd}`, borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 0.4, marginBottom: 10 }}>
            <Award size={12} /> ACHIEVEMENTS
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: C.t1, margin: 0, lineHeight: 1.2, letterSpacing: "-0.02em" }}>達成バッジ</h1>
          <p style={{ color: C.t2, marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
            あなたの物販の歩みを記録するバッジコレクション。続けるほど、特別なバッジが解放されます。
          </p>
        </div>

        {/* Progress Hero */}
        <div style={{
          background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 24,
          padding: "28px 32px", marginBottom: 28,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.t3, letterSpacing: "0.06em" }}>COLLECTION PROGRESS</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: C.t1, marginTop: 6, letterSpacing: "-0.02em", fontFamily: "ui-monospace, 'SF Pro Display', monospace" }}>
                <AnimatedNumber value={unlockedCount} /> <span style={{ fontSize: 18, color: C.t3, fontWeight: 500 }}>/ {totalCount}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.t3 }}>達成率</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.gold, fontFamily: "ui-monospace, 'SF Pro Display', monospace", letterSpacing: "-0.02em" }}>
                <AnimatedNumber value={pct} decimals={0} suffix="%" />
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 8, background: C.bg2, borderRadius: 999, overflow: "hidden", position: "relative" }}>
            <div style={{
              position: "absolute", inset: 0, width: `${pct}%`,
              background: "linear-gradient(90deg, #C9A96B, #E6C87A)",
              borderRadius: 999, transition: "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }} />
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: C.t3, display: "flex", justifyContent: "space-between" }}>
            <span>Bronze {BADGES.filter(b => b.tier === "bronze" && b.unlocked).length}/{BADGES.filter(b => b.tier === "bronze").length}</span>
            <span>Silver {BADGES.filter(b => b.tier === "silver" && b.unlocked).length}/{BADGES.filter(b => b.tier === "silver").length}</span>
            <span>Gold {BADGES.filter(b => b.tier === "gold" && b.unlocked).length}/{BADGES.filter(b => b.tier === "gold").length}</span>
            <span>Platinum {BADGES.filter(b => b.tier === "platinum" && b.unlocked).length}/{BADGES.filter(b => b.tier === "platinum").length}</span>
          </div>
        </div>

        {/* Badge grid grouped by tier */}
        {(["bronze", "silver", "gold", "platinum"] as Tier[]).map(tier => {
          const items = BADGES.filter(b => b.tier === tier);
          const tierInfo = TIERS[tier];
          return (
            <div key={tier} style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: tierInfo.color, letterSpacing: "0.08em" }}>{tierInfo.name.toUpperCase()}</div>
                <div style={{ flex: 1, height: 1, background: C.bdSub }} />
                <div style={{ fontSize: 11, color: C.t3 }}>{items.filter(b => b.unlocked).length} / {items.length}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                {items.map(badge => (
                  <BadgeCard key={badge.id} badge={badge} tierBg={tierInfo.bg} tierColor={tierInfo.color} />
                ))}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}

function BadgeCard({ badge, tierBg, tierColor }: { badge: Badge; tierBg: string; tierColor: string }) {
  const Icon = badge.icon;
  const progressPct = badge.progress ? Math.min(100, (badge.progress.current / badge.progress.target) * 100) : 0;
  return (
    <div style={{
      background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 18,
      padding: "20px 18px",
      opacity: badge.unlocked ? 1 : 0.78,
      boxShadow: badge.unlocked ? `0 4px 16px ${tierColor}22` : "0 1px 4px rgba(0,0,0,0.04)",
      transition: "transform 0.2s, box-shadow 0.2s",
      position: "relative", overflow: "hidden",
    }}>
      {!badge.unlocked && (
        <div style={{ position: "absolute", top: 12, right: 12, background: "var(--border-sub)", borderRadius: 999, padding: 6 }}>
          <Lock size={11} color={C.t3} />
        </div>
      )}
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: badge.unlocked ? tierBg : "var(--border-sub)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 14,
        boxShadow: badge.unlocked ? `0 6px 18px ${tierColor}40` : "none",
      }}>
        <Icon size={24} color={badge.unlocked ? "#fff" : C.t4} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: badge.unlocked ? C.t1 : C.t3, letterSpacing: "-0.01em", marginBottom: 4 }}>{badge.title}</div>
      <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.5, marginBottom: 10 }}>{badge.desc}</div>

      {badge.unlocked && badge.unlockedAt && (
        <div style={{ fontSize: 10, color: tierColor, fontWeight: 600, fontFamily: "ui-monospace, monospace" }}>
          UNLOCKED {badge.unlockedAt}
        </div>
      )}

      {!badge.unlocked && badge.progress && (
        <div>
          <div style={{ height: 4, background: C.bg2, borderRadius: 999, overflow: "hidden", marginBottom: 4 }}>
            <div style={{
              height: "100%", width: `${progressPct}%`,
              background: tierColor, borderRadius: 999,
              transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
            }} />
          </div>
          <div style={{ fontSize: 10, color: C.t3, display: "flex", justifyContent: "space-between" }}>
            <span>{badge.progress.current.toLocaleString()}</span>
            <span>{progressPct.toFixed(0)}%</span>
            <span>{badge.progress.target.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
