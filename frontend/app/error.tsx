"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#07101f",
      padding: 24,
      gap: 16,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f5f1e8", margin: 0 }}>
        ページの読み込みに失敗しました
      </h2>
      <p style={{ fontSize: 13, color: "#8a9ab8", margin: 0, maxWidth: 360, lineHeight: 1.7 }}>
        一時的なエラーが発生しました。再試行しても解決しない場合はサポートにお問い合わせください。
      </p>
      <button
        onClick={reset}
        style={{
          background: "linear-gradient(135deg,#0a1530,#111e44)",
          border: "1px solid rgba(201,169,107,0.45)",
          borderRadius: 10,
          color: "#c9a96b",
          padding: "11px 28px",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        再試行する
      </button>
      <Link
        href="/"
        style={{ fontSize: 12, color: "#4d6080", textDecoration: "none" }}
      >
        ホームに戻る
      </Link>
    </div>
  );
}
