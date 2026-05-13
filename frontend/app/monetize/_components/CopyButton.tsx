"use client";

import { useState } from "react";
import { T } from "@/lib/tokens";

interface Props {
  text: string;
  label?: string;
}

export default function CopyButton({ text, label = "コピー" }: Props) {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  const [showFallback, setShowFallback] = useState(false);

  const onClick = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      setState("ok");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("err");
      setShowFallback(true);
      setTimeout(() => setState("idle"), 3000);
    }
  };

  const stateLabel =
    state === "ok" ? "✓ コピーしました" :
    state === "err" ? "コピーに失敗しました。手動でコピーしてください" :
    label;

  const stateBg =
    state === "ok" ? T.up :
    state === "err" ? T.dn :
    T.gold;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          background: stateBg,
          color: "#fff",
          border: "none",
          padding: "8px 16px",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        {stateLabel}
      </button>
      {showFallback && (
        <div style={{ width: "100%" }}>
          <div style={{ fontSize: 11, color: T.t3, marginBottom: 4 }}>
            手動コピー用テキスト（Ctrl+A → Ctrl+C）
          </div>
          <textarea
            readOnly
            value={text}
            style={{
              width: "100%",
              minHeight: 120,
              padding: 8,
              fontSize: 12,
              border: `1px solid ${T.bd}`,
              borderRadius: 8,
              background: T.bg2,
              color: T.t1,
              fontFamily: "monospace",
            }}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}
    </div>
  );
}
