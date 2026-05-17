"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { LayoutDashboard, ShoppingCart, Tag, TrendingUp, Settings, Radar, LogOut, CreditCard, X, MoreHorizontal, HelpCircle, ChevronDown, Crown, Sparkles, Wand2, Megaphone, Truck } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePlan } from "@/lib/usePlan";
import { T } from "@/lib/tokens";
import { useTheme, THEMES } from "@/components/ThemeProvider";

const GROUP_LABEL = "var(--text-3)";

const PLAN_LABELS: Record<string, string> = { FREE: "フリー", LITE: "Lite", STANDARD: "Standard", PRO: "Pro" };
const PLAN_COLORS: Record<string, string> = { FREE: T.t3, LITE: "#7eb0e8", STANDARD: T.gold, PRO: T.goldLt };

// 必要最低限のナビ — 仕入→出品→売上の業務サイクルが回る7項目
const navGroups = [
  {
    label: "メニュー",
    defaultCollapsed: false,
    items: [
      { href: "/",               label: "ホーム",              icon: LayoutDashboard },
      { href: "/scanner",        label: "商品の利益を調べる",  icon: Radar },
      { href: "/discover",       label: "今日のおすすめ商品",  icon: Sparkles },
      { href: "/listings/quick", label: "AIで出品文を作る",    icon: Wand2 },
      { href: "/purchases",      label: "買った商品の記録",    icon: ShoppingCart },
      { href: "/listings",       label: "出品中の商品",        icon: Tag },
      { href: "/sales",          label: "売れた商品",          icon: TrendingUp },
      { href: "/shipping",       label: "配送管理",            icon: Truck },
      { href: "https://upj-auto-marketing.vercel.app/", label: "AI自動マーケ", icon: Megaphone, external: true },
    ],
  },
];

// かんたんモード — おばちゃんでも迷わない最小ナビ
const EASY_NAV = [
  { href: "/",          label: "ホーム",            icon: LayoutDashboard },
  { href: "/scanner",   label: "商品の利益を調べる", icon: Radar },
  { href: "/purchases", label: "買った商品の記録",   icon: ShoppingCart },
  { href: "/support",   label: "困ったとき",         icon: HelpCircle },
];

// モバイル下部タブ（中核動線に揃える・末尾に「メニュー」ボタンが自動で追加されて5タブ）
const BOTTOM_TABS = [
  { href: "/",               label: "ホーム",       icon: LayoutDashboard },
  { href: "/scanner",        label: "利益を調べる", icon: Radar },
  { href: "/listings/quick", label: "AI出品",       icon: Sparkles },
  { href: "/sales",          label: "売れた",       icon: TrendingUp },
];

// ── かんたんモード state（localStorage で記憶） ─────────────
const EASY_MODE_KEY = "bcg_easy_mode";
const noop = () => () => {};
function useEasyMode() {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined") return noop();
      window.addEventListener("storage", cb);
      window.addEventListener("bcg-easy-mode-change", cb);
      return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener("bcg-easy-mode-change", cb);
      };
    },
    () => (typeof window === "undefined" ? false : localStorage.getItem(EASY_MODE_KEY) === "1"),
    () => false,
  );
}
function setEasyMode(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(EASY_MODE_KEY, on ? "1" : "0");
  window.dispatchEvent(new Event("bcg-easy-mode-change"));
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { plan, error: planError } = usePlan();
  const { theme, setTheme } = useTheme();
  const [mobileMenu, setMobileMenu] = useState(false);
  const easyMode = useEasyMode();
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(navGroups.filter(g => g.defaultCollapsed).map(g => g.label))
  );
  const toggleCollapse = (label: string) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(label)) { next.delete(label); } else { next.add(label); }
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
          <Image
            src="/upj-logo.jpg"
            alt="UPJ"
            width={80}
            height={32}
            style={{
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

      {/* ── かんたんモード トグル ── */}
      <div style={{ padding: "8px 10px 4px" }}>
        <button
          onClick={() => setEasyMode(!easyMode)}
          aria-pressed={easyMode}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%",
            background: easyMode ? `${T.gold}14` : "transparent",
            border: `1px solid ${easyMode ? T.gold + "60" : "var(--border)"}`,
            borderRadius: 12,
            padding: "8px 10px",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          title={easyMode ? "かんたんモードON — クリックで全機能表示" : "かんたんモードOFF — クリックで4項目に絞る"}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Sparkles size={12} color={easyMode ? T.gold : "var(--text-3)"} />
            <span style={{ fontSize: 11, fontWeight: 700, color: easyMode ? T.gold : "var(--text-2)", letterSpacing: "0.04em" }}>
              かんたんモード
            </span>
          </span>
          <span style={{
            display: "inline-flex",
            width: 28, height: 16,
            borderRadius: 10,
            background: easyMode ? T.gold : "var(--border-strong)",
            position: "relative",
            transition: "background 0.2s",
          }}>
            <span style={{
              position: "absolute",
              top: 2,
              left: easyMode ? 14 : 2,
              width: 12, height: 12,
              borderRadius: 6,
              background: "#fff",
              transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </span>
        </button>
      </div>

      {/* ── ナビゲーション ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
        {easyMode ? (
          <div>
            {EASY_NAV.map(({ href, label, icon: Icon }) => {
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
                    gap: 10,
                    padding: "12px 12px",
                    borderRadius: 14,
                    fontWeight: active ? 700 : 600,
                    fontSize: 14,
                    color:      active ? "var(--text)" : "var(--text-2)",
                    background: active ? "var(--nav-active)" : "transparent",
                    border:     active ? "1px solid var(--border-strong)" : "1px solid transparent",
                    textDecoration: "none",
                    transition: "all 0.15s",
                    marginBottom: 4,
                  }}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} color={active ? T.gold : "var(--text-3)"} />
                  <span>{label}</span>
                  {active && (
                    <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: T.gold, flexShrink: 0 }} />
                  )}
                </Link>
              );
            })}
            <div style={{ marginTop: 16, padding: "10px 12px", background: "var(--surface-2, rgba(0,0,0,0.03))", borderRadius: 12, fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>
              💡 慣れてきたら、上のスイッチをOFFにすると全機能が見られます
            </div>
          </div>
        ) : navGroups.map((group, gi) => {
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

              {!isCollapsed && group.items.map((item) => {
                const { href, label, icon: Icon } = item;
                const isExternal = "external" in item && item.external;
                const active = !isExternal && pathname === href;
                const linkStyle = {
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
                } as const;
                const inner = (
                  <>
                    <Icon size={13} style={{ flexShrink: 0 }} color={active ? T.gold : "var(--text-3)"} />
                    <span>{label}</span>
                    {active && (
                      <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: T.gold, flexShrink: 0 }} />
                    )}
                  </>
                );
                return isExternal ? (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={label}
                    className="nav-link"
                    style={linkStyle}
                  >
                    {inner}
                  </a>
                ) : (
                  <Link
                    key={href}
                    href={href}
                    title={label}
                    className={active ? "" : "nav-link"}
                    style={linkStyle}
                  >
                    {inner}
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

        {/* ── テーマスイッチャー ── */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.12em", textTransform: "uppercase", paddingLeft: 4, marginBottom: 6 }}>
            テーマ
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                title={t.label}
                style={{
                  background: t.bg,
                  border: theme === t.id ? `2px solid ${t.color}` : "2px solid transparent",
                  borderRadius: 8,
                  height: 24,
                  cursor: "pointer",
                  boxShadow: theme === t.id ? `0 0 8px ${t.color}60` : "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  padding: 0,
                  minHeight: "unset",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{
                  position: "absolute",
                  bottom: 2,
                  right: 2,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: t.color,
                }} />
              </button>
            ))}
          </div>
        </div>

        {/* ── マスコット ── */}
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 8px" }}>
          <Image src="/mascot-cat.png" alt="UPJ" width={72} height={72} style={{ objectFit: "contain" }} />
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
        {!session?.user && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            <Link href="/login" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              textDecoration: "none", padding: "10px 12px", borderRadius: 12,
              background: "var(--surface-2)", border: "1px solid var(--border)",
              color: "var(--text)", fontSize: 13, fontWeight: 700,
            }}>
              ログイン / 新規登録
            </Link>
            <Link href="/pricing" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              textDecoration: "none", padding: "8px 12px", borderRadius: 12,
              color: "var(--text-3)", fontSize: 12,
            }}>
              料金プランを見る →
            </Link>
          </div>
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

            {/* かんたんモード トグル（モバイル） */}
            <button
              onClick={() => setEasyMode(!easyMode)}
              aria-pressed={easyMode}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%",
                background: easyMode ? `${T.gold}14` : "rgba(255,255,255,0.03)",
                border: `1px solid ${easyMode ? T.gold + "60" : "var(--border)"}`,
                borderRadius: 14,
                padding: "12px 14px",
                marginBottom: 12,
                cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={14} color={easyMode ? T.gold : "var(--text-3)"} />
                <span style={{ fontSize: 13, fontWeight: 700, color: easyMode ? T.gold : "var(--text-2)" }}>
                  かんたんモード {easyMode ? "ON" : "OFF"}
                </span>
              </span>
              <span style={{
                display: "inline-flex",
                width: 32, height: 18,
                borderRadius: 12,
                background: easyMode ? T.gold : "var(--border-strong)",
                position: "relative",
              }}>
                <span style={{
                  position: "absolute",
                  top: 2,
                  left: easyMode ? 16 : 2,
                  width: 14, height: 14,
                  borderRadius: 7,
                  background: "#fff",
                  transition: "left 0.2s",
                }} />
              </span>
            </button>

            {easyMode ? (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {EASY_NAV.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "14px 14px",
                          borderRadius: 14,
                          fontSize: 14, fontWeight: active ? 700 : 600,
                          color: active ? "var(--text)" : "var(--text-2)",
                          background: active ? "var(--nav-active)" : "rgba(255,255,255,0.03)",
                          border: active ? "1px solid var(--border-strong)" : "1px solid var(--border)",
                          textDecoration: "none", minHeight: 56,
                        }}
                      >
                        <Icon size={15} color={active ? T.gold : "var(--text-3)"} />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : navGroups.map((group) => (
              <div key={group.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: GROUP_LABEL, letterSpacing: "0.14em", textTransform: "uppercase", padding: "4px 8px 6px" }}>
                  {group.label}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {group.items.map((item) => {
                    const { href, label, icon: Icon } = item;
                    const isExternal = "external" in item && item.external;
                    const active = !isExternal && pathname === href;
                    const tileStyle = {
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
                    } as const;
                    const inner = (
                      <>
                        <Icon size={13} color={active ? T.gold : "var(--text-3)"} />
                        {label}
                      </>
                    );
                    return isExternal ? (
                      <a key={href} href={href} target="_blank" rel="noopener noreferrer" style={tileStyle}>
                        {inner}
                      </a>
                    ) : (
                      <Link key={href} href={href} style={tileStyle}>
                        {inner}
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
