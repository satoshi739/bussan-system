"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, ShoppingCart, Tag, TrendingUp, Calculator, BarChart2, Eye, Search, Settings, Radar, LogOut, CreditCard, Bell, Target, Bot, X, MoreHorizontal, Truck, Package, Warehouse, PieChart, Brain, CheckCircle, Share2, Activity, Database, ScanLine, HelpCircle, ChevronDown, Crown } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePlan } from "@/lib/usePlan";
import { T } from "@/lib/tokens";

const GROUP_LABEL = "var(--text-3)";

const PLAN_LABELS: Record<string, string> = { FREE: "フリー", LITE: "Lite", STANDARD: "Standard", PRO: "Pro" };
const PLAN_COLORS: Record<string, string> = { FREE: T.t3, LITE: "#7eb0e8", STANDARD: T.gold, PRO: T.goldLt };

const navGroups = [
  {
    label: "メイン",
    defaultCollapsed: false,
    items: [
      { href: "/",       label: "ダッシュボード", icon: LayoutDashboard },
      { href: "/report", label: "レポート",       icon: BarChart2 },
      { href: "/ai",     label: "AI アシスタント", icon: Bot },
      { href: "/alerts", label: "価格アラート",   icon: Bell },
    ],
  },
  {
    label: "商品リサーチ",
    defaultCollapsed: false,
    items: [
      { href: "/scanner",     label: "利益スキャナー",    icon: Radar },
      { href: "/barcode",     label: "バーコードスキャン", icon: ScanLine },
      { href: "/search",      label: "相場検索",          icon: Search },
      { href: "/competition", label: "競合分析",          icon: Target },
      { href: "/watchlist",   label: "ウォッチリスト",    icon: Eye },
    ],
  },
  {
    label: "FBA 業務",
    defaultCollapsed: false,
    items: [
      { href: "/purchases", label: "仕入れ管理",   icon: ShoppingCart },
      { href: "/listings",  label: "出品管理",     icon: Tag },
      { href: "/fba",       label: "FBA 納品",     icon: Package },
      { href: "/inventory", label: "在庫管理",     icon: Warehouse },
    ],
  },
  {
    label: "AI エージェント",
    defaultCollapsed: true,
    items: [
      { href: "/agents",           label: "AI CEO",          icon: Brain },
      { href: "/agents/approvals", label: "仕入れ承認",      icon: CheckCircle },
      { href: "/agents/sns",       label: "SNS コンテンツ",  icon: Share2 },
      { href: "/agents/monitor",   label: "自動監視",        icon: Activity },
      { href: "/agents/memory",    label: "エージェント記憶", icon: Database },
    ],
  },
  {
    label: "分析・管理",
    defaultCollapsed: true,
    items: [
      { href: "/sales",             label: "売上履歴",    icon: TrendingUp },
      { href: "/platform-analysis", label: "PF 分析",    icon: PieChart   },
      { href: "/calculator",        label: "利益計算",   icon: Calculator },
      { href: "/fulfillment",       label: "外注管理",   icon: Truck      },
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
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(navGroups.filter(g => g.defaultCollapsed).map(g => g.label))
  );
  const toggleCollapse = (label: string) => setCollapsed(prev => {
    const next = new Set(prev);
    next.has(label) ? next.delete(label) : next.add(label);
    return next;
  });

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMobileMenu(false); }, [pathname]);

  const sidebarContent = (
    <aside style={{
      width: 224,
      minHeight: "100vh",
      background: "var(--sidebar-bg)",
      borderRight: "1px solid var(--border)",
      boxShadow: "2px 0 12px rgba(0,0,0,0.05)",
      display: "flex",
      flexDirection: "column",
      padding: "0 0 20px",
      flexShrink: 0,
    }}>
      {/* ── ロゴ ── */}
      <div style={{
        padding: "20px 16px 16px",
        borderBottom: "1px solid var(--border)",
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
          <img
            src="/upj-logo.jpg"
            alt="UPJ"
            style={{
              width: 80,
              height: 32,
              objectFit: "contain",
              objectPosition: "left center",
              flexShrink: 0,
            }}
          />
        </div>
        <button
          onClick={() => setMobileMenu(false)}
          className="sidebar-close-btn"
          style={{ display: "none", background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", padding: 4, borderRadius: 10 }}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── ナビゲーション ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
        {navGroups.map((group, gi) => {
          const isCollapsed = collapsed.has(group.label);
          const hasActive = group.items.some(i => i.href === pathname);
          return (
            <div key={group.label} style={{ marginBottom: gi < navGroups.length - 1 ? 2 : 0 }}>
              {/* グループラベル — クリックで折りたたみ */}
              <button
                onClick={() => toggleCollapse(group.label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 10px 4px",
                  borderRadius: 8,
                  minHeight: "unset",
                }}
              >
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: hasActive ? T.gold : GROUP_LABEL,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}>
                  {group.label}
                </span>
                <ChevronDown
                  size={11}
                  color={hasActive ? T.gold : GROUP_LABEL}
                  style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                />
              </button>

              {!isCollapsed && group.items.map(({ href, label, icon: Icon }) => {
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
                      padding: "6px 10px",
                      borderRadius: 12,
                      fontWeight: active ? 700 : 500,
                      fontSize: 12,
                      color:      active ? "var(--text)" : "var(--text-2)",
                      background: active ? "var(--nav-active)" : "transparent",
                      border:     active ? "1px solid var(--border-strong)" : "1px solid transparent",
                      textDecoration: "none",
                      transition: "all 0.15s",
                      marginBottom: 1,
                    }}
                  >
                    <Icon size={13} style={{ flexShrink: 0 }} color={active ? T.gold : "var(--text-3)"} />
                    <span>{label}</span>
                    {active && (
                      <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: T.gold, flexShrink: 0 }} />
                    )}
                  </Link>
                );
              })}

              {gi < navGroups.length - 1 && (
                <div style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--border), transparent)", margin: "4px 4px" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── フッター ── */}
      <div style={{ padding: "12px 8px 0", borderTop: "1px solid var(--border)", marginTop: 4 }}>
        {session?.user && (
          <Link
            href="/settings/billing"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              padding: "9px 12px",
              borderRadius: 18,
              border: planError ? "1px solid rgba(255,100,50,0.3)" : "1px solid var(--border)",
              background: planError ? "rgba(255,100,50,0.05)" : `${T.gold}06`,
              marginBottom: 8,
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <CreditCard size={11} color={planError ? "#ff9966" : (PLAN_COLORS[plan] ?? "var(--text-3)")} />
            <span style={{ fontSize: 11, fontWeight: 700, color: planError ? "#ff9966" : (PLAN_COLORS[plan] ?? "var(--text-3)"), letterSpacing: "0.05em" }}>
              {planError ? "プラン取得失敗" : `${PLAN_LABELS[plan] ?? plan} プラン`}
            </span>
          </Link>
        )}

        {session?.user && (session.user as { role?: string }).role === "ADMIN" && (
          <Link
            href="/admin"
            style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", padding: "9px 12px", borderRadius: 18, border: "1px solid rgba(201,169,107,0.30)", background: "rgba(212,175,55,0.06)", marginBottom: 8 }}
          >
            <Crown size={11} color="#c9a96b" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#c9a96b", letterSpacing: "0.05em" }}>管理者ダッシュボード</span>
          </Link>
        )}

        {/* ── マスコット ── */}
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 8px" }}>
          <img src="/mascot-cat.png" alt="UPJ" style={{ width: 72, height: 72, objectFit: "contain" }} />
        </div>

        <div style={{ display: "flex", gap: 2, marginBottom: 2 }}>
          <Link href="/settings" style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, textDecoration: "none", padding: "7px 8px", borderRadius: 12, color: "var(--text-3)", fontSize: 12, transition: "color 0.15s" }}>
            <Settings size={11} /> 設定
          </Link>
          <Link href="/support" style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, textDecoration: "none", padding: "7px 8px", borderRadius: 12, color: "var(--text-3)", fontSize: 12, transition: "color 0.15s" }}>
            <HelpCircle size={11} /> サポート
          </Link>
        </div>

        {session?.user && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              color: "var(--text-3)",
              fontSize: 12,
              cursor: "pointer",
              padding: "8px 6px",
              marginTop: 0,
              letterSpacing: "0.04em",
              transition: "color 0.15s",
              minHeight: 36,
              borderRadius: 14,
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
            background: "var(--sidebar-bg)",
            borderTop: "1px solid var(--border)",
            borderRadius: "16px 16px 0 0",
            padding: "12px 16px 16px",
            maxHeight: "70vh",
            overflowY: "auto",
          }}>
            <div style={{ width: 36, height: 3, background: "var(--text-4)", borderRadius: 2, margin: "0 auto 16px" }} />
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
                          borderRadius: 14,
                          fontSize: 13,
                          fontWeight: active ? 700 : 500,
                          color: active ? "var(--text)" : "var(--text-2)",
                          background: active ? "var(--nav-active)" : "rgba(255,255,255,0.03)",
                          border: active ? "1px solid var(--border-strong)" : "1px solid var(--border)",
                          textDecoration: "none",
                          minHeight: 44,
                        }}
                      >
                        <Icon size={13} color={active ? T.gold : "var(--text-3)"} />
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
                style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, color: "#ef4444", padding: "10px 16px", fontSize: 12, cursor: "pointer", width: "100%", marginTop: 8 }}
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
        background: "var(--sidebar-bg)",
        borderTop: "1px solid var(--border)",
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
                color: active ? T.gold : "var(--text-3)",
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
            color: mobileMenu ? T.gold : "var(--text-3)",
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
          background: var(--nav-hover) !important;
          color: var(--text) !important;
          border-color: var(--border) !important;
        }
      `}</style>
    </>
  );
}
