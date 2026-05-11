"use client";

import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/AnimatedNumber";

type Props = {
  show: boolean;
  amount: number;
  productName?: string;
  onClose: () => void;
};

const COLORS = ["#006FE6", "#40AADF", "#1E9C3C", "#C9A96B", "#E88500", "#FF3B30"];

export default function SaleCelebration({ show, amount, productName, onClose }: Props) {
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number; color: string; rotate: number; size: number; duration: number }>>([]);

  useEffect(() => {
    if (!show) return;
    // Generate confetti particles
    const particles = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      color: COLORS[i % COLORS.length],
      rotate: Math.random() * 360,
      size: 6 + Math.random() * 8,
      duration: 2.2 + Math.random() * 1.2,
    }));
    const t0 = setTimeout(() => setConfetti(particles), 0);

    // Auto-close after 4 seconds
    const timer = setTimeout(onClose, 4000);
    return () => { clearTimeout(t0); clearTimeout(timer); };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(8,13,28,0.55)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "sc-fade-in 0.3s ease-out",
        overflow: "hidden",
        padding: 20,
      }}
    >
      {/* Confetti */}
      {confetti.map(p => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-10%",
            width: p.size,
            height: p.size * 1.4,
            background: p.color,
            borderRadius: 2,
            animation: `sc-fall ${p.duration}s linear ${p.delay}s forwards`,
            transform: `rotate(${p.rotate}deg)`,
            boxShadow: `0 0 6px ${p.color}66`,
          }}
        />
      ))}

      {/* Card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 28,
          padding: "44px 40px 36px",
          maxWidth: 440,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 32px 80px rgba(0,0,0,0.40)",
          animation: "sc-pop-in 0.55s cubic-bezier(0.16, 1, 0.3, 1)",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Emoji burst */}
        <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 16, animation: "sc-bounce 0.8s ease-out" }}>🎉</div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "#1E9C3C", letterSpacing: "0.18em", marginBottom: 10 }}>SOLD!</div>

        <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(8,13,28,0.75)", marginBottom: 6, letterSpacing: "-0.01em" }}>
          売れました！
        </div>

        {productName && (
          <div style={{ fontSize: 13, color: "rgba(8,13,28,0.55)", marginBottom: 22, fontWeight: 500 }}>{productName}</div>
        )}

        {/* The big number */}
        <div style={{
          fontSize: 72, fontWeight: 800, color: "#1E9C3C",
          lineHeight: 1, letterSpacing: "-0.04em",
          fontFamily: "ui-monospace, 'SF Pro Display', monospace",
          marginBottom: 8,
        }}>
          <AnimatedNumber value={amount} prefix="+¥" durationMs={1400} />
        </div>
        <div style={{ fontSize: 12, color: "rgba(8,13,28,0.55)", marginBottom: 28 }}>純利益が確定しました</div>

        <button
          onClick={onClose}
          style={{
            padding: "12px 32px",
            background: "#080D1C",
            color: "#fff", border: "none", borderRadius: 999,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            letterSpacing: "-0.01em",
          }}
        >次の売却を狙う</button>
      </div>

      <style>{`
        @keyframes sc-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sc-pop-in {
          0% { opacity: 0; transform: scale(0.85) translateY(20px) }
          100% { opacity: 1; transform: scale(1) translateY(0) }
        }
        @keyframes sc-bounce {
          0% { transform: scale(0.3); opacity: 0 }
          50% { transform: scale(1.2); opacity: 1 }
          80% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes sc-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1 }
          80% { opacity: 1 }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0 }
        }
      `}</style>
    </div>
  );
}
