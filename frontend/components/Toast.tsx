"use client";

import { useEffect, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info" | "warn";

interface ToastMsg {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

let _addToast: ((msg: string, type: ToastType, duration?: number) => void) | null = null;

export function toast(message: string, type: ToastType = "success", duration?: number) {
  _addToast?.(message, type, duration);
}

const COLORS: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: "rgba(0,25,8,0.98)",  border: "#D4AF37", text: "#D4AF37", icon: "✅" },
  error:   { bg: "rgba(28,0,0,0.98)",  border: "#ff6666", text: "#ff8888", icon: "❌" },
  warn:    { bg: "rgba(28,14,0,0.98)", border: "#ff9944", text: "#ffbb66", icon: "⚠️" },
  info:    { bg: "rgba(0,12,28,0.98)", border: "#66ccff", text: "#88ddff", icon: "ℹ️" },
};

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3000,
  info:    4000,
  warn:    5000,
  error:   7000,   // エラーは長めに表示
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    _addToast = (message, type, duration) => {
      const id = Date.now();
      const ms = duration ?? DEFAULT_DURATION[type];
      setToasts(prev => [...prev.slice(-4), { id, message, type, duration: ms }]);
      setTimeout(() => remove(id), ms);
    };
    return () => { _addToast = null; };
  }, [remove]);

  if (toasts.length === 0) return null;

  return (
    <>
      <div style={{
        position: "fixed",
        bottom: 80,   // モバイル下部タブバーの上
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: "calc(100vw - 32px)",
        width: 340,
      }}>
        {toasts.map((t) => {
          const c = COLORS[t.type];
          const lines = t.message.split("\n");
          return (
            <div
              key={t.id}
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: 10,
                padding: "12px 14px 12px 16px",
                color: c.text,
                fontSize: 13,
                boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
                animation: "toastIn 0.22s ease",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
              <div style={{ flex: 1, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700 }}>{lines[0]}</div>
                {lines.slice(1).map((ln, i) => (
                  <div key={i} style={{ fontSize: 11, color: c.text, opacity: 0.8, marginTop: 3 }}>{ln}</div>
                ))}
              </div>
              <button
                onClick={() => remove(t.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: c.text,
                  opacity: 0.5,
                  cursor: "pointer",
                  padding: "0 2px",
                  fontSize: 16,
                  lineHeight: 1,
                  flexShrink: 0,
                  minHeight: "auto",
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @media (max-width: 768px) {
          /* モバイルはフル幅で下部中央 */
        }
      `}</style>
    </>
  );
}
