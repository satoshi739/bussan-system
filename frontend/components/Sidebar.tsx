"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, ShoppingCart, Tag, TrendingUp, Calculator, BarChart2, Eye, Search, Settings, Globe, Radar, LogOut, CreditCard, Bell, Target, Bot, Menu, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

// ── Design Tokens ─────────────────────────────────────────
const S = {
  bg:         "#0f0f10",              // deep black
  bgHover:    "rgba(212,175,55,0.07)",
  bgActive:   "rgba(212,175,55,0.13)",
  border:     "rgba(212,175,55,0.16)",
  borderAct:  "rgba(212,175,55,0.38)",
  brass:      "#D4AF37",              // classic gold
  brassLight: "#F0D060",              // bright gold
  text:       "#C8C0B0",              // warm white
  textActive: "#F5F0E8",              // pure warm white
  muted:      "#8A8278",              // muted warm gray
  faint:      "#3A3830",
} as const;

// Subtle wood grain for sidebar
const GRAIN = ``;

const PLAN_LABELS: Record<string, string>  = { FREE: "フリー",  PRO: "プロ",     BUSINESS: "ビジネス" };
const PLAN_COLORS: Record<string, string>  = { FREE: S.muted,   PRO: S.brass,    BUSINESS: S.brassLight };

const navGroups = [
  {
    label: "概要",
    items: [
      { href: "/",          label: "ダッシュボード", icon: LayoutDashboard },
      { href: "/report",    label: "レポート",       icon: BarChart2 },
      { href: "/ai",        label: "AI アシスタント",icon: Bot },
    ],
  },
  {
    label: "リサーチ",
    items: [
      { href: "/scanner",     label: "利益スキャナー", icon: Radar },
      { href: "/global",      label: "グローバル検索", icon: Globe },
      { href: "/search",      label: "相場検索",       icon: Search },
      { href: "/competition", label: "競合分析",       icon: Target },
      { href: "/watchlist",   label: "ウォッチリスト", icon: Eye },
    ],
  },
  {
    label: "運用管理",
    items: [
      { href: "/purchases",  label: "仕入れ管理",  icon: ShoppingCart },
      { href: "/listings",   label: "出品管理",    icon: Tag },
      { href: "/sales",      label: "売上履歴",    icon: TrendingUp },
      { href: "/calculator", label: "利益計算",    icon: Calculator },
    ],
  },
  {
    label: "通知・設定",
    items: [
      { href: "/alerts",   label: "価格アラート", icon: Bell },
      { href: "/settings", label: "設定",         icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [plan,       setPlan]       = useState<string>("FREE");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiOk,      setApiOk]      = useState<boolean | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!apiUrl) { setApiOk(false); return; }
    const check = () => fetch(`${apiUrl}/api/dashboard`).then(r => setApiOk(r.ok)).catch(() => setApiOk(false));
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/subscription/plan").then(r => r.json()).then(d => setPlan(d.plan ?? "FREE")).catch(() => {});
  }, [session]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const sidebarContent = (
    <aside style={{
      width: 224,
      minHeight: "100vh",
      background: S.bg,
      backgroundImage: GRAIN,
      borderRight: `1px solid ${S.border}`,
      display: "flex",
      flexDirection: "column",
      padding: "0 0 20px",
      flexShrink: 0,
    }}>

      {/* Logo */}
      <div style={{
        padding: "22px 18px 18px",
        borderBottom: `1px solid ${S.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
      }}>
        <div>
          <div style={{
            fontSize: 15,
            fontWeight: 800,
            color: S.brass,
            letterSpacing: "0.02em",
            fontFamily: "'Hiragino Sans', 'Yu Gothic', sans-serif",
          }}>
            物販チェッカー
          </div>
          <div style={{
            fontSize: 9,
            color: S.faint,
            marginTop: 3,
            fontFamily: "monospace",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}>
            REVALUE PRO · v2
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="sidebar-close-btn"
          style={{ display: "none", background: "none", border: "none", color: S.muted, cursor: "pointer", padding: 4 }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav Groups */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 10px" }}>
        {navGroups.map((group, gi) => (
          <div key={group.label} style={{ marginBottom: gi < navGroups.length - 1 ? 4 : 0 }}>
            {/* Group label */}
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              color: S.faint,
              letterSpacing: "0.14em",
              padding: "10px 8px 5px",
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
                  className={active ? "" : "nav-link"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "8px 10px",
                    borderRadius: 8,
                    fontWeight: active ? 700 : 500,
                    fontSize: 12,
                    color:      active ? S.textActive : S.text,
                    background: active ? S.bgActive   : "transparent",
                    border:     active ? `1px solid ${S.borderAct}` : "1px solid transparent",
                    textDecoration: "none",
                    transition: "all 0.15s",
                    marginBottom: 1,
                    letterSpacing: "0.02em",
                  }}
                >
                  <Icon
                    size={13}
                    style={{ flexShrink: 0 }}
                    color={active ? S.brass : S.muted}
                  />
                  <span>{label}</span>
                  {active && (
                    <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: S.brass, flexShrink: 0 }} />
                  )}
                </Link>
              );
            })}

            {/* Divider between groups */}
            {gi < navGroups.length - 1 && (
              <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${S.border}, transparent)`, margin: "6px 4px" }} />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "14px 10px 0", borderTop: `1px solid ${S.border}`, marginTop: 4 }}>

        {/* Plan badge */}
        {session?.user && (
          <Link
            href="/settings/billing"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              padding: "8px 11px",
              borderRadius: 8,
              border: `1px solid ${S.border}`,
              background: "rgba(200,164,68,0.04)",
              marginBottom: 10,
              transition: "border-color 0.15s",
            }}
          >
            <CreditCard size={11} color={PLAN_COLORS[plan] ?? S.muted} />
            <span style={{ fontSize: 11, fontWeight: 700, color: PLAN_COLORS[plan] ?? S.muted, letterSpacing: "0.05em" }}>
              {PLAN_LABELS[plan] ?? plan} プラン
            </span>
          </Link>
        )}

        {/* API Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 4px", marginBottom: 2 }}>
          <div style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: apiOk === null ? S.faint : apiOk ? S.brass : "#B04040",
            boxShadow: apiOk ? `0 0 5px ${S.brass}60` : "none",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 10, color: apiOk ? S.muted : "#7A4040", letterSpacing: "0.05em" }}>
            {apiOk === null ? "確認中…" : apiOk ? "API 接続中" : "API 未接続"}
          </span>
        </div>

        {/* Logout */}
        {session?.user && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              color: S.faint,
              fontSize: 11,
              cursor: "pointer",
              padding: "6px 4px",
              marginTop: 2,
              letterSpacing: "0.04em",
              transition: "color 0.15s",
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
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="sidebar-hamburger"
        style={{
          display: "none",
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 1000,
          background: S.bg,
          border: `1px solid ${S.border}`,
          borderRadius: 9,
          color: S.brass,
          cursor: "pointer",
          padding: "8px 10px",
        }}
      >
        <Menu size={18} />
      </button>

      <div className="sidebar-desktop">{sidebarContent}</div>

      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999 }}>
          <div onClick={() => setMobileOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)" }} />
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", overflowY: "auto" }}>
            {sidebarContent}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop  { display: none !important; }
          .sidebar-hamburger { display: flex !important; }
          .sidebar-close-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .sidebar-hamburger { display: none !important; }
        }
        .nav-link:hover {
          background: ${S.bgHover} !important;
          color: ${S.textActive} !important;
          border-color: ${S.border} !important;
        }
      `}</style>
    </>
  );
}
