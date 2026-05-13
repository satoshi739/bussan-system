"use client";

import { useEffect, useState } from "react";
import { X, Keyboard } from "lucide-react";

const SHORTCUTS: Array<{ group: string; items: Array<{ keys: string[]; label: string }> }> = [
  {
    group: "ナビゲーション",
    items: [
      { keys: ["⌘", "K"], label: "コマンドパレットを開く" },
      { keys: ["⌘", "/"], label: "ショートカット一覧（この画面）" },
      { keys: ["G", "D"], label: "ダッシュボードへ" },
      { keys: ["G", "P"], label: "自動パイプラインへ" },
      { keys: ["G", "S"], label: "売上履歴へ" },
    ],
  },
  {
    group: "操作",
    items: [
      { keys: ["↑", "↓"], label: "リスト内移動" },
      { keys: ["↵"], label: "選択・開く" },
      { keys: ["ESC"], label: "閉じる" },
      { keys: ["⌘", "F"], label: "ページ内検索" },
    ],
  },
  {
    group: "クイックアクション",
    items: [
      { keys: ["⌘", "N"], label: "新規仕入れ登録" },
      { keys: ["⌘", "L"], label: "新規出品登録" },
      { keys: ["⌘", "S"], label: "保存" },
      { keys: ["⌘", "R"], label: "リロード" },
    ],
  },
];

export default function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘/ or Ctrl+/ to toggle
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 9997,
        background: "rgba(8,13,28,0.55)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        animation: "sh-fade-in 0.18s ease-out",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: 22,
          padding: "28px 32px 24px",
          maxWidth: 560, width: "100%",
          maxHeight: "85vh", overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
          animation: "sh-slide-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
          position: "relative",
        }}
      >
        <button
          onClick={() => setOpen(false)}
          style={{
            position: "absolute", top: 16, right: 16,
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(0,0,0,0.05)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        ><X size={16} color="rgba(8,13,28,0.55)" /></button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Keyboard size={20} color="var(--blue)" />
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>キーボードショートカット</div>
        </div>
        <div style={{ fontSize: 13, color: "rgba(8,13,28,0.55)", marginBottom: 24 }}>マウス無しでも全機能を素早く操作</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {SHORTCUTS.map(g => (
            <div key={g.group}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(8,13,28,0.45)", letterSpacing: "0.10em", marginBottom: 8, textTransform: "uppercase" }}>{g.group}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {g.items.map((s, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < g.items.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                    <span style={{ fontSize: 13, color: "#080D1C", letterSpacing: "-0.01em" }}>{s.label}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {s.keys.map((k, j) => (
                        <kbd key={j} style={{
                          minWidth: 26, height: 26, padding: "0 8px",
                          background: "rgba(0,0,0,0.05)",
                          borderRadius: 6, fontSize: 12, fontWeight: 600,
                          color: "rgba(8,13,28,0.75)",
                          fontFamily: "ui-monospace, monospace",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          border: "1px solid rgba(0,0,0,0.08)",
                          boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
                        }}>{k}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 22, padding: "12px 14px", background: "rgba(0,111,230,0.06)", borderRadius: 12, fontSize: 11, color: "rgba(8,13,28,0.65)", textAlign: "center" }}>
          このウィンドウを再表示するには <kbd style={{ padding: "1px 6px", background: "#fff", borderRadius: 4, border: "1px solid rgba(0,0,0,0.10)", fontFamily: "ui-monospace, monospace", fontSize: 10, fontWeight: 600 }}>⌘</kbd> + <kbd style={{ padding: "1px 6px", background: "#fff", borderRadius: 4, border: "1px solid rgba(0,0,0,0.10)", fontFamily: "ui-monospace, monospace", fontSize: 10, fontWeight: 600 }}>/</kbd> を押してください
        </div>
      </div>

      <style>{`
        @keyframes sh-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sh-slide-in { from { opacity: 0; transform: scale(0.96) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>
    </div>
  );
}
