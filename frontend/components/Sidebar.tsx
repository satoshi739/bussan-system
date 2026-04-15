"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, ShoppingCart, Tag, TrendingUp, Calculator, BarChart2, Eye, Search, Settings, Globe, Radar, LogOut, CreditCard } from "lucide-react";
import { getPurchases, getListings } from "@/lib/api";
import { signOut, useSession } from "next-auth/react";

const PLAN_LABELS: Record<string, string> = { FREE: "フリー", PRO: "プロ", BUSINESS: "ビジネス" };
const PLAN_COLORS: Record<string, string> = { FREE: "#4a8a5a", PRO: "#00ff80", BUSINESS: "#66aaff" };

const nav = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/scanner", label: "利益スキャナー", icon: Radar },
  { href: "/purchases", label: "仕入れ管理", icon: ShoppingCart },
  { href: "/listings", label: "出品管理", icon: Tag },
  { href: "/sales", label: "売上履歴", icon: TrendingUp },
  { href: "/calculator", label: "利益計算", icon: Calculator },
  { href: "/global", label: "グローバル検索", icon: Globe },
  { href: "/search", label: "相場検索", icon: Search },
  { href: "/watchlist", label: "ウォッチリスト", icon: Eye },
  { href: "/report", label: "レポート", icon: BarChart2 },
  { href: "/settings", label: "設定", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [badges, setBadges] = useState<Record<string, string>>({});
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const { data: session } = useSession();
  const [plan, setPlan] = useState<string>("FREE");

  useEffect(() => {
    const check = () => {
      fetch("http://localhost:8000/api/dashboard")
        .then(r => setApiOk(r.ok))
        .catch(() => setApiOk(false));
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/subscription/plan")
      .then(r => r.json())
      .then(d => setPlan(d.plan ?? "FREE"))
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    if (!apiOk) return;
    Promise.all([
      getPurchases({ status: "purchased" }),
      getListings("active"),
    ]).then(([purchases, listings]) => {
      setBadges({
        "/purchases": String(purchases.length),
        "/listings": String(listings.length),
      });
    }).catch(() => {});
  }, [pathname, apiOk]);

  return (
    <aside style={{ width: 220, minHeight: "100vh", background: "rgba(0,8,2,0.98)", borderRight: "1px solid rgba(0,255,80,0.1)", display: "flex", flexDirection: "column", padding: "24px 12px", gap: 2, flexShrink: 0 }}>
      <div style={{ padding: "8px 12px 28px" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#00ff80", letterSpacing: "0.04em" }}>💰 物販チェッカー</div>
        <div style={{ fontSize: 11, color: "#2a6a3a", marginTop: 3, fontFamily: "monospace" }}>BUSSAN SYSTEM v2</div>
      </div>

      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        const badge = badges[href];
        return (
          <Link key={href} href={href} style={{ display: "flex", alignItems: "center", padding: "11px 14px", borderRadius: 10, fontWeight: 700, fontSize: 14, color: active ? "#00ff80" : "#7aaa8a", background: active ? "rgba(0,255,80,0.08)" : "transparent", border: active ? "1px solid rgba(0,255,80,0.18)" : "1px solid transparent", textDecoration: "none", transition: "all 0.15s", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon size={17} />{label}</span>
            {badge && badge !== "0" && (
              <span style={{ background: active ? "rgba(0,255,80,0.2)" : "rgba(0,255,80,0.1)", border: "1px solid rgba(0,255,80,0.25)", borderRadius: 20, padding: "1px 8px", fontSize: 11, color: "#00ff80", fontWeight: 800 }}>{badge}</span>
            )}
          </Link>
        );
      })}

      <div style={{ marginTop: "auto", padding: "16px 12px 0", borderTop: "1px solid rgba(0,255,80,0.08)" }}>
        {/* Plan badge */}
        {session?.user && (
          <div style={{ marginBottom: 12 }}>
            <Link href="/settings/billing" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,255,80,0.1)", background: "rgba(0,20,8,0.6)" }}>
              <CreditCard size={13} color={PLAN_COLORS[plan] ?? "#4a8a5a"} />
              <span style={{ fontSize: 12, fontWeight: 700, color: PLAN_COLORS[plan] ?? "#4a8a5a" }}>
                {PLAN_LABELS[plan] ?? plan}プラン
              </span>
            </Link>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: apiOk === null ? "#666" : apiOk ? "#00ff80" : "#ff4444",
            boxShadow: apiOk ? "0 0 6px #00ff80" : "none",
            transition: "background 0.3s",
            flexShrink: 0,
          }} />
          <div style={{ fontSize: 11, color: apiOk ? "#4a9a5a" : "#8a4444" }}>
            {apiOk === null ? "接続確認中..." : apiOk ? "API 接続中" : "API 未接続"}
          </div>
        </div>
        <div style={{ fontSize: 10, color: "#2a5a3a", paddingLeft: 13, marginBottom: 8 }}>localhost:8000</div>
        {session?.user && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "#4a6a5a", fontSize: 12, cursor: "pointer", padding: "4px 2px" }}
          >
            <LogOut size={12} /> ログアウト
          </button>
        )}
      </div>
    </aside>
  );
}
