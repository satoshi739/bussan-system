"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, ShoppingCart, Tag, TrendingUp, Calculator, BarChart2, Eye, Search, Settings, Radar, LogOut, CreditCard, Bell, Target, Bot, X, MoreHorizontal, Truck, Package, Warehouse, PieChart, Brain, CheckCircle, Share2, Activity, Database, ScanLine, HelpCircle } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePlan } from "@/lib/usePlan";
import { T } from "@/lib/tokens";

const GROUP_LABEL = "#6A6058";

const PLAN_LABELS: Record<string, string> = { FREE: "フリー", STANDARD: "Standard", PRO: "Pro" };
const PLAN_COLORS: Record<string, string> = { FREE: T.t3, STANDARD: T.gold, PRO: T.goldLt };

const navGroups = [
  {
    label: "概要",
    items: [
      { href: "/",       label: "ダッシュボード",    icon: LayoutDashboard },
      { href: "/report", label: "レポート",          icon: BarChart2 },
      { href: "/ai",     label: "AI アシスタント",   icon: Bot },
    ],
  },
  {
    label: "AI エージェント",
    items: [
      { href: "/agents",           label: "AI CEO ダッシュボード", icon: Brain },
      { href: "/agents/approvals", label: "仕入れ承認キュー",      icon: CheckCircle },
      { href: "/agents/sns",       label: "SNS コンテンツ",        icon: Share2 },
      { href: "/agents/monitor",   label: "自動監視・スケジュール", icon: Activity },
      { href: "/agents/memory",    label: "エージェント記憶",      icon: Database },
    ],
  },
  {
    label: "商品リサーチ",
    items: [
      { href: "/scanner",     label: "利益スキャナー",  icon: Radar },
      { href: "/barcode",     label: "バーコードスキャン", icon: ScanLine },
      { href: "/search",      label: "相場検索",        icon: Search },
      { href: "/competition", label: "競合分析",        icon: Target },
      { href: "/watchlist",   label: "ウォッチリスト",  icon: Eye },
    ],
  },
  {
    label: "FBA業務",
    items: [
      { href: "/purchases",  label: "仕入れ管理",      icon: ShoppingCart },
      { href: "/listings",   label: "出品管理（Amazon）", icon: Tag },
      { href: "/fba",        label: "FBA納品管理",     icon: Package },
      { href: "/inventory",  label: "在庫管理",        icon: Warehouse },
    ],
  },
  {
    label: "分析・管理",
    items: [
      { href: "/sales",               label: "売上履歴",            icon: TrendingUp },
      { href: "/platform-analysis",   label: "プラットフォーム分析", icon: PieChart   },
      { href: "/calculator",          label: "利益計算",            icon: Calculator },
      { href: "/fulfillment",         label: "外注管理",            icon: Truck      },
    ],
  },
  {
    label: "通知・設定",
    items: [
      { href: "/alerts",   label: "価格アラート",     icon: Bell },
      { href: "/settings", label: "設定",             icon: Settings },
    ],
  },
];

// モバイル下部5タブ
const BOTTOM_TABS = [
  { href: "/",          label: "ホーム",  icon: LayoutDashboard },
  { href: "/scanner",   label: "検索",    icon: Search },
  { href: "/barcode",   label: "スキャン", icon: ScanLine },
  { href: "/purchases", label: "仕入れ",  icon: ShoppingCart },
  { href: "/support",   label: "ヘルプ",  icon: HelpCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { plan, error: planError } = usePlan();
  const [mobileMenu, setMobileMenu] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMobileMenu(false); }, [pathname]);

  const sidebarContent = (
    <aside style={{
      width: 224,
      minHeight: "100vh",
      background: T.bgSidebar,
      borderRight: `1px solid ${T.bd}`,
      display: "flex",
      flexDirection: "column",
      padding: "0 0 20px",
      flexShrink: 0,
    }}>
      {/* ── ロゴ ── */}
      <div style={{
        padding: "20px 16px 16px",
        borderBottom: `1px solid ${T.bd}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${T.gold}22, ${T.gold}0a)`,
            border: `1px solid ${T.gold}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 13 }}>📦</span>
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 800,
            color: T.t1,
            letterSpacing: "0.01em",
          }}>
            物販チェッカー
          </div>
        </div>
        <button
          onClick={() => setMobileMenu(false)}
          className="sidebar-close-btn"
          style={{ display: "none", background: "none", border: "none", color: T.t3, cursor: "pointer", padding: 4, borderRadius: 6 }}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── ナビゲーション ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
        {navGroups.map((group, gi) => (
          <div key={group.label} style={{ marginBottom: gi < navGroups.length - 1 ? 4 : 0 }}>
            {/* グループラベル */}
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              color: GROUP_LABEL,
              letterSpacing: "0.14em",
              padding: "10px 10px 5px",
              textTransform: "uppercase",
            }}>
              {group.label}
            </div>

            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={active ? "" : "nav-link"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "8px 10px",
                    borderRadius: 10,
                    fontWeight: active ? 700 : 500,
                    fontSize: 12,
                    color:      active ? T.t1 : T.t2,
                    background: active ? T.bgActive : "transparent",
                    border:     active ? `1px solid ${T.bdSt}` : "1px solid transparent",
                    textDecoration: "none",
                    transition: "all 0.15s",
                    marginBottom: 1,
                    letterSpacing: "0.02em",
                  }}
                >
                  <Icon size={13} style={{ flexShrink: 0 }} color={active ? T.gold : T.t3} />
                  <span>{label}</span>
                  {active && (
                    <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: T.gold, flexShrink: 0 }} />
                  )}
                </Link>
              );
            })}

            {gi < navGroups.length - 1 && (
              <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${T.bd}, transparent)`, margin: "6px 4px" }} />
            )}
          </div>
        ))}
      </div>

      {/* ── フッター ── */}
      <div style={{ padding: "12px 8px 0", borderTop: `1px solid ${T.bd}`, marginTop: 4 }}>
        {session?.user && (
          <Link
            href="/settings/billing"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              padding: "9px 12px",
              borderRadius: 12,
              border: `1px solid ${planError ? "rgba(255,100,50,0.3)" : T.bd}`,
              background: planError ? "rgba(255,100,50,0.05)" : `${T.gold}06`,
              marginBottom: 8,
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <CreditCard size={11} color={planError ? "#ff9966" : (PLAN_COLORS[plan] ?? T.t3)} />
            <span style={{ fontSize: 11, fontWeight: 700, color: planError ? "#ff9966" : (PLAN_COLORS[plan] ?? T.t3), letterSpacing: "0.05em" }}>
              {planError ? "プラン取得失敗" : `${PLAN_LABELS[plan] ?? plan} プラン`}
            </span>
          </Link>
        )}

        {session?.user && (session.user as { role?: string }).role === "ADMIN" && (
          <Link
            href="/admin"
            style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", padding: "9px 12px", borderRadius: 12, border: "1px solid rgba(212,175,55,0.3)", background: "rgba(212,175,55,0.06)", marginBottom: 8 }}
          >
            <span style={{ fontSize: 11 }}>👑</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#D4AF37", letterSpacing: "0.05em" }}>管理者ダッシュボード</span>
          </Link>
        )}

        <Link
          href="/support"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            padding: "8px 6px",
            borderRadius: 10,
            color: T.t3,
            fontSize: 12,
            transition: "color 0.15s",
            marginBottom: 2,
          }}
        >
          <HelpCircle size={11} /> ヘルプ・サポート
        </Link>

        {session?.user && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              color: T.t3,
              fontSize: 12,
              cursor: "pointer",
              padding: "8px 6px",
              marginTop: 0,
              letterSpacing: "0.04em",
              transition: "color 0.15s",
              minHeight: 36,
              borderRadius: 10,
            }}
          >
            <LogOut size={11} /> ログアウト
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* ── デスクトップ サイドバー ── */}
      <div className="sidebar-desktop">{sidebarContent}</div>

      {/* ── モバイル スライドアップメニュー ── */}
      {mobileMenu && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999 }}>
          <div
            onClick={() => setMobileMenu(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)" }}
          />
          <div style={{
            position: "absolute",
            bottom: 64,
            left: 0,
            right: 0,
            background: T.bgSidebar,
            borderTop: `1px solid ${T.bd}`,
            borderRadius: "16px 16px 0 0",
            padding: "12px 16px 16px",
            maxHeight: "70vh",
            overflowY: "auto",
          }}>
            <div style={{ width: 36, height: 3, background: T.t4, borderRadius: 2, margin: "0 auto 16px" }} />
            {navGroups.map((group) => (
              <div key={group.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: GROUP_LABEL, letterSpacing: "0.14em", textTransform: "uppercase", padding: "4px 8px 6px" }}>
                  {group.label}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {group.items.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "12px 14px",
                          borderRadius: 9,
                          fontSize: 13,
                          fontWeight: active ? 700 : 500,
                          color: active ? T.t1 : T.t2,
                          background: active ? T.bgActive : "rgba(255,255,255,0.03)",
                          border: `1px solid ${active ? T.bdSt : T.bd}`,
                          textDecoration: "none",
                          minHeight: 44,
                        }}
                      >
                        <Icon size={13} color={active ? T.gold : T.t3} />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            {session?.user && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 9, color: "#ef4444", padding: "10px 16px", fontSize: 12, cursor: "pointer", width: "100%", marginTop: 8 }}
              >
                <LogOut size={13} /> ログアウト
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── モバイル 下部タブバー ── */}
      <nav className="mobile-bottom-nav" style={{
        display: "none",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: T.bgSidebar,
        borderTop: `1px solid ${T.bd}`,
        zIndex: 998,
        padding: "0 8px",
        alignItems: "stretch",
      }}>
        {BOTTOM_TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                textDecoration: "none",
                color: active ? T.gold : T.t3,
                fontSize: 10,
                fontWeight: active ? 700 : 400,
                transition: "color 0.15s",
              }}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => setMobileMenu(v => !v)}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            background: "none",
            border: "none",
            color: mobileMenu ? T.gold : T.t3,
            fontSize: 10,
            cursor: "pointer",
          }}
        >
          <MoreHorizontal size={20} />
          メニュー
        </button>
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop   { display: none !important; }
          .mobile-bottom-nav { display: flex !important; }
          .sidebar-close-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-bottom-nav { display: none !important; }
        }
        .nav-link:hover {
          background: ${T.bgHover} !important;
          color: ${T.t1} !important;
          border-color: ${T.bd} !important;
        }
      `}</style>
    </>
  );
}
