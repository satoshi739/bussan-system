"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastMsg {
  id: number;
  message: string;
  type: ToastType;
}

let _addToast: ((msg: string, type: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = "success") {
  _addToast?.(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    _addToast = (message, type) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };
    return () => { _addToast = null; };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: t.type === "success" ? "rgba(0,30,10,0.98)" : t.type === "error" ? "rgba(30,0,0,0.98)" : "rgba(0,10,30,0.98)",
            border: `1px solid ${t.type === "success" ? "#00ff80" : t.type === "error" ? "#ff6666" : "#66ccff"}`,
            borderRadius: 10,
            padding: "12px 18px",
            color: t.type === "success" ? "#00ff80" : t.type === "error" ? "#ff6666" : "#66ccff",
            fontWeight: 700,
            fontSize: 14,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            animation: "fadeIn 0.2s ease",
            minWidth: 200,
          }}
        >
          {t.type === "success" ? "✅ " : t.type === "error" ? "❌ " : "ℹ️ "}
          {t.message}
        </div>
      ))}
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
