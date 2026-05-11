"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, LayoutDashboard, Zap, BarChart2, Bot, Bell, Sparkles, Radar,
  ScanLine, Target, Eye, ShoppingCart, Tag, Package, Warehouse,
  TrendingUp, PieChart, Calculator, Truck, Settings, HelpCircle,
  Award, Calendar,
} from "lucide-react";

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  group: "ページ" | "アクション" | "最近";
  icon: React.ElementType;
  keywords?: string;
};

const COMMANDS: Cmd[] = [
  { id: "dashboard",  label: "ダッシュボード",       href: "/",              group: "ページ", icon: LayoutDashboard, keywords: "home top kpi" },
  { id: "pipeline",   label: "自動パイプライン",     href: "/pipeline",      group: "ページ", icon: Zap,             keywords: "auto pipeline workflow" },
  { id: "weekly",     label: "今週の振り返り",       href: "/weekly",        group: "ページ", icon: Calendar,        keywords: "weekly summary review" },
  { id: "achievements", label: "達成バッジ",         href: "/achievements",  group: "ページ", icon: Award,           keywords: "badge achievement trophy" },
  { id: "report",     label: "レポート",            href: "/report",        group: "ページ", icon: BarChart2 },
  { id: "ai",         label: "AI アシスタント",     href: "/ai",            group: "ページ", icon: Bot },
  { id: "alerts",     label: "価格アラート",         href: "/alerts",        group: "ページ", icon: Bell },
  { id: "discover",   label: "今日のおすすめ",       href: "/discover",      group: "ページ", icon: Sparkles,        keywords: "discover today recommended" },
  { id: "scanner",    label: "利益スキャナー",       href: "/scanner",       group: "ページ", icon: Radar,           keywords: "scan profit search" },
  { id: "barcode",    label: "バーコードスキャン",   href: "/barcode",       group: "ページ", icon: ScanLine },
  { id: "search",     label: "相場検索",            href: "/search",        group: "ページ", icon: Search,          keywords: "price search market" },
  { id: "competition", label: "競合分析",           href: "/competition",   group: "ページ", icon: Target },
  { id: "watchlist",  label: "ウォッチリスト",       href: "/watchlist",     group: "ページ", icon: Eye },
  { id: "purchases",  label: "仕入れ管理",          href: "/purchases",     group: "ページ", icon: ShoppingCart },
  { id: "listings",   label: "出品管理",            href: "/listings",      group: "ページ", icon: Tag },
  { id: "fba",        label: "FBA 納品",            href: "/fba",           group: "ページ", icon: Package },
  { id: "inventory",  label: "在庫管理",            href: "/inventory",     group: "ページ", icon: Warehouse },
  { id: "sales",      label: "売上履歴",            href: "/sales",         group: "ページ", icon: TrendingUp },
  { id: "platform",   label: "プラットフォーム分析", href: "/platform-analysis", group: "ページ", icon: PieChart },
  { id: "calculator", label: "利益計算",            href: "/calculator",    group: "ページ", icon: Calculator },
  { id: "fulfillment", label: "外注・発送管理",     href: "/fulfillment",   group: "ページ", icon: Truck },
  { id: "settings",   label: "設定",                href: "/settings",      group: "ページ", icon: Settings },
  { id: "support",    label: "ヘルプ・サポート",     href: "/support",       group: "ページ", icon: HelpCircle },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ⌘K / Ctrl+K to toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus on open / reset state on close
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return COMMANDS;
    return COMMANDS.filter(c => {
      const text = `${c.label} ${c.keywords ?? ""} ${c.group}`.toLowerCase();
      return text.includes(q);
    });
  }, [query]);

  const groups = useMemo(() => {
    const m: Record<string, Cmd[]> = {};
    for (const c of results) (m[c.group] ||= []).push(c);
    return Object.entries(m);
  }, [results]);

  const flat = results;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(i => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = flat[active];
      if (c?.href) {
        router.push(c.href as never);
        setOpen(false);
      }
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(8,13,28,0.45)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "12vh", paddingLeft: 20, paddingRight: 20,
        animation: "cp-fade-in 0.15s ease-out",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 640,
          background: "rgba(255,255,255,0.98)",
          borderRadius: 18,
          boxShadow: "0 20px 60px rgba(0,0,0,0.20), 0 1px 2px rgba(0,0,0,0.08)",
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.06)",
          animation: "cp-slide-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <Search size={18} color="rgba(8,13,28,0.55)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="ページ・機能を検索..."
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 16, color: "#080D1C", fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          />
          <kbd style={{ fontSize: 11, padding: "3px 8px", background: "rgba(0,0,0,0.05)", borderRadius: 6, color: "rgba(8,13,28,0.55)", fontFamily: "ui-monospace, monospace" }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 420, overflowY: "auto", padding: "6px 8px" }}>
          {flat.length === 0 ? (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "rgba(8,13,28,0.45)", fontSize: 13 }}>
              「{query}」に一致する項目はありません
            </div>
          ) : (
            groups.map(([groupName, items]) => (
              <div key={groupName}>
                <div style={{ padding: "8px 12px 4px", fontSize: 10, fontWeight: 700, color: "rgba(8,13,28,0.45)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {groupName}
                </div>
                {items.map((c) => {
                  const idx = flat.indexOf(c);
                  const isActive = idx === active;
                  const Icon = c.icon;
                  return (
                    <div
                      key={c.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => { if (c.href) { router.push(c.href as never); setOpen(false); } }}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 12px", borderRadius: 10,
                        background: isActive ? "rgba(0,111,230,0.08)" : "transparent",
                        cursor: "pointer",
                        transition: "background 0.12s",
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: isActive ? "rgba(0,111,230,0.12)" : "rgba(0,0,0,0.04)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <Icon size={15} color={isActive ? "#006FE6" : "rgba(8,13,28,0.55)"} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#080D1C", letterSpacing: "-0.01em" }}>{c.label}</div>
                        {c.hint && <div style={{ fontSize: 11, color: "rgba(8,13,28,0.55)", marginTop: 1 }}>{c.hint}</div>}
                      </div>
                      {isActive && (
                        <kbd style={{ fontSize: 10, padding: "2px 6px", background: "rgba(0,0,0,0.05)", borderRadius: 5, color: "rgba(8,13,28,0.55)", fontFamily: "ui-monospace, monospace" }}>↵</kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "rgba(8,13,28,0.45)" }}>
          <div style={{ display: "flex", gap: 12 }}>
            <span><kbd style={kbd()}>↑↓</kbd> 移動</span>
            <span><kbd style={kbd()}>↵</kbd> 開く</span>
            <span><kbd style={kbd()}>ESC</kbd> 閉じる</span>
          </div>
          <span style={{ fontWeight: 600 }}>物販チェッカー</span>
        </div>
      </div>

      <style>{`
        @keyframes cp-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cp-slide-in { from { opacity: 0; transform: translateY(-8px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}

function kbd(): React.CSSProperties {
  return {
    fontSize: 10, padding: "1px 5px", background: "rgba(0,0,0,0.05)",
    borderRadius: 4, color: "rgba(8,13,28,0.55)",
    fontFamily: "ui-monospace, monospace",
  };
}
