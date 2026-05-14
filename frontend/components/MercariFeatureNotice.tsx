"use client";

/**
 * メルカリ機能リリース告知カード
 * - scanner / listings/quick 上部に配置
 * - localStorageで dismiss 可能（バージョニング付き）
 * - 期限あり: 2026-06-30 まで表示
 */

import { useEffect, useState } from "react";
import { X, Sparkles, ArrowRight } from "lucide-react";

const DISMISS_KEY = "bussan_mercari_notice_dismissed_v1";
const NOTICE_END = new Date("2026-07-01T00:00:00+09:00");

export default function MercariFeatureNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    const isExpired = Date.now() >= NOTICE_END.getTime();
    if (!isDismissed && !isExpired) {
      // localStorage / 現在時刻は外部依存のため初回マウントで一度だけ
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
        marginBottom: 16,
        background: "linear-gradient(135deg, rgba(255,79,129,0.10), rgba(255,45,101,0.08))",
        border: "1px solid rgba(255,79,129,0.35)",
        borderRadius: 12,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        position: "relative",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "linear-gradient(135deg, #ff4f81, #ff2d65)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        <Sparkles size={18} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 2 }}>
          🆕 メルカリ出品モード リリース
        </div>
        <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5 }}>
          スキャン結果から「AI出品文を作成」ボタンを押すだけで、メルカリ仕様の出品文をAIが3秒生成。
          ピンクの「メルカリで出品」ボタンでコピー＋出品画面を新タブで自動起動します。
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#ff8aa8", fontWeight: 700, marginLeft: 6 }}>
            タイトル40文字・送料込み・ハッシュタグ自動 <ArrowRight size={11} />
          </span>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        aria-label="閉じる"
        style={{
          flexShrink: 0,
          background: "transparent",
          border: "none",
          color: "var(--text-3)",
          cursor: "pointer",
          padding: 4,
          opacity: 0.6,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
