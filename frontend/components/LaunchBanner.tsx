"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const DISMISS_KEY = "bussan_launch_banner_dismissed_v1";
// ロンチ記念キャンペーン期限: 2026-06-01 00:00 JST = 5月末日23:59まで
const CAMPAIGN_END = new Date("2026-06-01T00:00:00+09:00");

export default function LaunchBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    const isExpired = Date.now() >= CAMPAIGN_END.getTime();
    if (!isDismissed && !isExpired) {
      // localStorage と現在時刻は外部依存のため初回マウントで一度だけ確認する
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  return (
    <div
      style={{
        width: "100%",
        background: "linear-gradient(90deg, var(--blue-dm), var(--blue))",
        color: "#fff",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.01em",
        position: "relative",
        zIndex: 100,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 16 }}>🎉</span>
      <span>
        <strong>ロンチ記念キャンペーン実施中</strong>
        <span style={{ opacity: 0.85, marginLeft: 8 }}>
          通常7日 → <strong>14日間</strong> 無料トライアル｜先着50名・5月末まで
        </span>
      </span>
      <Link
        href="/pricing"
        style={{
          background: "rgba(255,255,255,0.18)",
          border: "1px solid rgba(255,255,255,0.35)",
          color: "#fff",
          padding: "5px 14px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          textDecoration: "none",
          whiteSpace: "nowrap",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.28)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; }}
      >
        いま無料で始める →
      </Link>
      <button
        onClick={handleDismiss}
        aria-label="バナーを閉じる"
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          width: 24,
          height: 24,
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.7)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 4,
          padding: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
