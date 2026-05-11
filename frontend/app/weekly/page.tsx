"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { AnimatedNumber } from "@/components/AnimatedNumber";

type Slide = {
  bg: string;
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
};

export default function WeeklyPage() {
  const [idx, setIdx] = useState(0);

  const slides: Slide[] = [
    {
      bg: "linear-gradient(135deg, #0a1530 0%, #1a2956 100%)",
      eyebrow: "WEEKLY · 2026 / W19",
      title: <>あなたの<br/>今週のストーリー</>,
      body: <>5/5（月）〜 5/11（日）。<br/>あなたが物販で動かした1週間を振り返ります。</>,
    },
    {
      bg: "linear-gradient(135deg, #006FE6 0%, #40AADF 100%)",
      eyebrow: "TOTAL PROFIT",
      title: <>今週の純利益</>,
      body: (
        <>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em", fontFamily: "ui-monospace, 'SF Pro Display', monospace" }}>
            <AnimatedNumber value={42800} prefix="¥" durationMs={2000} />
          </div>
          <div style={{ fontSize: 16, opacity: 0.9, marginTop: 12 }}>先週比 <b>+18.4%</b> ／ 今月累計 <b>¥98,400</b></div>
        </>
      ),
    },
    {
      bg: "linear-gradient(135deg, #1E9C3C 0%, #34C759 100%)",
      eyebrow: "SALES COUNT",
      title: <>売却した商品数</>,
      body: (
        <>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em", fontFamily: "ui-monospace, 'SF Pro Display', monospace" }}>
            <AnimatedNumber value={7} durationMs={1400} />
          </div>
          <div style={{ fontSize: 16, opacity: 0.9, marginTop: 12 }}>1日平均 <b>1.0件</b> ／ 1商品あたり <b>¥6,114</b></div>
        </>
      ),
    },
    {
      bg: "linear-gradient(135deg, #8a6d35 0%, #C9A96B 100%)",
      eyebrow: "TOP DEAL",
      title: <>今週の最高利益商品</>,
      body: (
        <>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6, opacity: 0.92 }}>セイコー 5 SNXS79 自動巻き</div>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", fontFamily: "ui-monospace, 'SF Pro Display', monospace" }}>
            <AnimatedNumber value={7800} prefix="¥" durationMs={1600} />
          </div>
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 14 }}>仕入 ¥4,200 → 売却 ¥12,800 ／ ROI <b>61%</b></div>
        </>
      ),
    },
    {
      bg: "linear-gradient(135deg, #E88500 0%, #FF9500 100%)",
      eyebrow: "PIPELINE ACTIVITY",
      title: <>自動パイプラインで<br/>動いた数</>,
      body: (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 22, marginTop: 16 }}>
          <Stat label="発見" v={84} />
          <Stat label="出品" v={23} />
          <Stat label="売却" v={7} />
          <Stat label="配送完了" v={5} />
        </div>
      ),
    },
    {
      bg: "linear-gradient(135deg, #0a1530 0%, #4A77A8 100%)",
      eyebrow: "TIME SAVED",
      title: <>削減できた時間</>,
      body: (
        <>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em", fontFamily: "ui-monospace, 'SF Pro Display', monospace" }}>
            <AnimatedNumber value={8.2} decimals={1} suffix="h" durationMs={1800} />
          </div>
          <div style={{ fontSize: 16, opacity: 0.9, marginTop: 12 }}>もし手動でやっていたら... 計 11.5時間<br/><b>+8.2時間</b> の余白を取り戻しました</div>
        </>
      ),
    },
    {
      bg: "linear-gradient(135deg, #B85B5B 0%, #E88500 100%)",
      eyebrow: "NEXT WEEK",
      title: <>来週のあなたへ</>,
      body: (
        <>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 14, opacity: 0.95 }}>AIからの提案：</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 15, lineHeight: 1.7 }}>
            <div>1. 在庫が3週間動いていない <b>2商品</b> を 10%値下げ</div>
            <div>2. 「腕時計」カテゴリの利益率が高い → <b>類似商品14件</b> を確認</div>
            <div>3. 月¥100,000バッジまで <b>あと¥21,600</b></div>
          </div>
        </>
      ),
    },
  ];

  const slide = slides[idx];
  const isLast = idx === slides.length - 1;
  const isFirst = idx === 0;

  return (
    <div style={{ background: "#000", minHeight: "100vh", color: "#fff", position: "relative", overflow: "hidden" }}>
      {/* Slide content */}
      <div
        key={idx}
        style={{
          minHeight: "100vh",
          background: slide.bg,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "40px 32px",
          animation: "fade-in 0.5s ease-out",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", opacity: 0.7, marginBottom: 18 }}>{slide.eyebrow}</div>
          <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 28 }}>{slide.title}</div>
          <div style={{ fontSize: 15, lineHeight: 1.7, opacity: 0.92 }}>{slide.body}</div>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 10 }}>
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            style={{
              width: i === idx ? 24 : 6, height: 6,
              borderRadius: 999,
              background: i === idx ? "#fff" : "rgba(255,255,255,0.4)",
              border: "none", cursor: "pointer",
              transition: "width 0.3s, background 0.3s",
            }}
          />
        ))}
      </div>

      {/* Nav buttons */}
      <button
        onClick={() => setIdx(i => Math.max(0, i - 1))}
        disabled={isFirst}
        style={{
          position: "fixed", left: 20, top: "50%", transform: "translateY(-50%)",
          width: 44, height: 44, borderRadius: 999,
          background: "rgba(255,255,255,0.15)", backdropFilter: "blur(20px)",
          border: "none", color: "#fff", cursor: isFirst ? "default" : "pointer",
          opacity: isFirst ? 0.3 : 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 10,
        }}
      ><ChevronLeft size={20} /></button>

      <button
        onClick={() => !isLast && setIdx(i => i + 1)}
        disabled={isLast}
        style={{
          position: "fixed", right: 20, top: "50%", transform: "translateY(-50%)",
          width: 44, height: 44, borderRadius: 999,
          background: "rgba(255,255,255,0.15)", backdropFilter: "blur(20px)",
          border: "none", color: "#fff", cursor: isLast ? "default" : "pointer",
          opacity: isLast ? 0.3 : 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 10,
        }}
      ><ChevronRight size={20} /></button>

      {/* Bottom actions */}
      <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 10, zIndex: 10 }}>
        <Link href="/" style={{
          padding: "10px 18px", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(20px)",
          color: "#fff", textDecoration: "none", borderRadius: 999, fontSize: 13, fontWeight: 600,
        }}>← ダッシュボードへ戻る</Link>
        {isLast && (
          <button style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 18px", background: "#fff",
            color: "#080D1C", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}><Share2 size={14} /> シェアする</button>
        )}
      </div>

      <style>{`@keyframes fade-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", fontFamily: "ui-monospace, 'SF Pro Display', monospace" }}>
        <AnimatedNumber value={v} durationMs={1400} />
      </div>
      <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>{label}</div>
    </div>
  );
}
