"use client";

import { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { X, ChevronRight, ChevronLeft, ShoppingCart, TrendingUp, Radar, CheckCircle, Circle, ExternalLink } from "lucide-react";

const STORAGE_KEY = "bussan_onboarding_done";
const CHECKLIST_KEY = "bussan_checklist";

const STEPS = [
  {
    icon: <Radar size={32} color="#c9a96b" />,
    title: "まず1商品をスキャンしてください",
    desc: "商品名やキーワードを入力するだけ。eBay・メルカリの相場と利益率が30秒でわかります。最初の1回で使いやすさを実感できます。",
    action: { label: "今すぐスキャンする →", href: "/scanner" },
    primaryCta: true,
  },
  {
    icon: <span style={{ fontSize: 32 }}>📷</span>,
    title: "バーコードスキャンで即計算",
    desc: "スマホのカメラで商品バーコードを読み取るだけ。店頭・倉庫でその場で利益判定できます。",
    action: { label: "スキャンしてみる →", href: "/barcode" },
    primaryCta: false,
  },
  {
    icon: <ShoppingCart size={32} color="#c9a96b" />,
    title: "仕入れを登録する",
    desc: "商品名・仕入価格・プラットフォームを入力するだけで自動管理がスタートします。",
    action: { label: "仕入れ管理へ →", href: "/purchases" },
    primaryCta: false,
  },
  {
    icon: <TrendingUp size={32} color="#c9a96b" />,
    title: "ダッシュボードで収益を確認",
    desc: "売上・利益・在庫をリアルタイムで一覧。月次グラフで成長トレンドを把握できます。",
    action: { label: "ダッシュボードへ →", href: "/" },
    primaryCta: false,
  },
];

const defaultChecklist = [
  { id: "settings", label: "初期設定を完了する",         href: "/settings",  done: false },
  { id: "scan",     label: "初回スキャンを試みる",       href: "/scanner",   done: false },
  { id: "barcode",  label: "バーコードで商品をスキャン", href: "/barcode",   done: false },
  { id: "register", label: "最初の仕入れを登録する",     href: "/purchases", done: false },
];

export function useOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) startTransition(() => setShow(true));
    } catch { /* ignore */ }
  }, []);

  const complete = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  };

  return { show, complete };
}

export function useChecklist() {
  const [items, setItems] = useState(defaultChecklist);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const isValid = (v: unknown): v is { id: string; label: string; href: string; done: boolean } =>
          typeof v === "object" && v !== null &&
          typeof (v as Record<string, unknown>).id === "string" &&
          typeof (v as Record<string, unknown>).href === "string" &&
          typeof (v as Record<string, unknown>).done === "boolean";
        if (Array.isArray(parsed) && parsed.every(isValid)) {
          startTransition(() => setItems(parsed));
          return;
        }
      }
      // Initialize localStorage so useAutoChecklist can find it later
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(defaultChecklist));
    } catch { /* ignore */ }
  }, []);

  const toggle = (id: string) => {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, done: !i.done } : i);
      try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const allDone = items.every(i => i.done);
  return { items, toggle, allDone };
}

interface Props {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 2000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}>
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.80)" }}
        onClick={onComplete}
      />

      {/* Modal */}
      <div style={{
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        width: "100%",
        maxWidth: 520,
        padding: "32px 32px 28px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
      }}>
        {/* Close */}
        <button
          onClick={onComplete}
          style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#8a9ab8", cursor: "pointer", padding: 4 }}
        >
          <X size={18} />
        </button>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 2,
                background: i <= step ? "#c9a96b" : "rgba(201,169,107,0.18)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(212,175,55,0.1)",
            border: "1px solid rgba(201,169,107,0.25)",
            borderRadius: 16,
            width: 72,
            height: 72,
            marginBottom: 20,
          }}>
            {STEPS[step].icon}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#c9a96b", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
            STEP {step + 1} / {STEPS.length}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#f5f1e8", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
            {STEPS[step].title}
          </h2>
          <p style={{ fontSize: 14, color: "#8a9ab8", lineHeight: 1.8, margin: 0 }}>
            {STEPS[step].desc}
          </p>
        </div>

        {/* Help link (step 0 only) */}
        {step === 0 && (
          <Link
            href="/support"
            onClick={onComplete}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: "#07101f",
              border: "1px solid rgba(201,169,107,0.18)",
              borderRadius: 10,
              padding: "14px 18px",
              marginBottom: 24,
              textDecoration: "none",
            }}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "rgba(212,175,55,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 20,
            }}>
              📖
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#d0d8e8", marginBottom: 2 }}>使い方ガイドを見る</div>
              <div style={{ fontSize: 11, color: "#8a9ab8" }}>よくある質問・操作方法はこちら</div>
            </div>
            <ExternalLink size={14} color="#8a9ab8" />
          </Link>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* step 0: スキャナーへの直接CTA */}
          {step === 0 && (
            <Link
              href={STEPS[0].action.href}
              onClick={onComplete}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "linear-gradient(135deg,#0a1530,#111e44)",
                border: "2px solid rgba(201,169,107,0.60)",
                borderRadius: 10,
                color: "#c9a96b",
                padding: "14px 24px",
                fontSize: 15,
                fontWeight: 800,
                textDecoration: "none",
                letterSpacing: "0.02em",
                boxShadow: "0 0 20px rgba(201,169,107,0.18)",
              }}
            >
              <Radar size={16} /> {STEPS[0].action.label}
            </Link>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "none",
                  border: "1px solid rgba(212,175,55,0.2)",
                  borderRadius: 9,
                  color: "#8a9ab8",
                  padding: "11px 18px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <ChevronLeft size={14} /> 戻る
              </button>
            )}
            <div style={{ flex: 1 }} />
            {isLast ? (
              <button
                onClick={onComplete}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "linear-gradient(135deg,#0a1530,#111e44)",
                  border: "1px solid rgba(201,169,107,0.50)",
                  borderRadius: 9,
                  color: "#c9a96b",
                  padding: "11px 24px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <CheckCircle size={14} /> 使い始める
              </button>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: step === 0 ? "none" : "linear-gradient(135deg,#0a1530,#111e44)",
                  border: `1px solid ${step === 0 ? "rgba(212,175,55,0.2)" : "rgba(201,169,107,0.50)"}`,
                  borderRadius: 9,
                  color: step === 0 ? "#8a9ab8" : "#c9a96b",
                  padding: "11px 22px",
                  fontSize: 13,
                  fontWeight: step === 0 ? 400 : 700,
                  cursor: "pointer",
                }}
              >
                {step === 0 ? "あとで確認する" : "次へ"} <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Skip */}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={onComplete}
            style={{ background: "none", border: "none", color: "#4d6080", fontSize: 12, cursor: "pointer" }}
          >
            スキップ
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 初期設定チェックリスト（進行UI）───────────────────────────
export function OnboardingChecklist() {
  const { items, toggle, allDone } = useChecklist();

  if (allDone) return null;

  const doneCount = items.filter(i => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);
  const nextIdx = items.findIndex(i => !i.done);

  return (
    <div style={{
      background: "#0a1530",
      border: "1px solid rgba(201,169,107,0.22)",
      borderTop: "3px solid #c9a96b",
      borderRadius: 12,
      padding: "20px 22px",
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#e5d9bc", letterSpacing: "0.02em" }}>
            セットアップ進行中
          </div>
          <div style={{ fontSize: 11, color: "#8a9ab8", marginTop: 2 }}>
            あと {items.length - doneCount} ステップで完了です
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#c9a96b", fontFamily: "ui-monospace,monospace", lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 10, color: "#8a9ab8", marginTop: 2 }}>{doneCount}/{items.length} 完了</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: "#07101f", borderRadius: 4, height: 6, overflow: "hidden", marginBottom: 16 }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: `linear-gradient(90deg,#c9a96b80,#c9a96b)`,
          borderRadius: 4,
          transition: "width 0.5s ease",
        }} />
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, idx) => {
          const isNext = idx === nextIdx;
          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: isNext ? "rgba(201,169,107,0.06)" : "transparent",
                border: `1px solid ${isNext ? "rgba(201,169,107,0.22)" : "transparent"}`,
                borderRadius: 9,
                padding: isNext ? "10px 12px" : "6px 4px",
                transition: "all 0.2s",
              }}
            >
              <button
                onClick={() => toggle(item.id)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0, display: "flex" }}
                aria-label={item.done ? "完了済みにする" : "完了にする"}
              >
                {item.done
                  ? <CheckCircle size={20} color="#22c55e" />
                  : <Circle size={20} color={isNext ? "#c9a96b" : "#4d6080"} />
                }
              </button>
              <Link
                href={item.href}
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: isNext ? 700 : 500,
                  color: item.done ? "#4d6080" : isNext ? "#e5d9bc" : "#8a9ab8",
                  textDecoration: item.done ? "line-through" : "none",
                  textDecorationColor: "#4d6080",
                }}
              >
                {item.label}
              </Link>
              {isNext && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#c9a96b", background: "rgba(212,175,55,0.12)", border: "1px solid rgba(201,169,107,0.25)", borderRadius: 6, padding: "3px 9px", flexShrink: 0 }}>
                  次はここ <ChevronRight size={11} />
                </span>
              )}
              {item.done && (
                <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, flexShrink: 0 }}>完了</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
