"use client";

import { useState } from "react";
import { Check, Zap, Building2, Gift } from "lucide-react";
import { PLANS } from "@/lib/stripe";

const card: React.CSSProperties = {
  background: "rgba(0,14,5,0.9)",
  border: "1px solid rgba(0,255,80,0.15)",
  borderRadius: 18,
  padding: "32px 28px",
  flex: 1,
};

const proCard: React.CSSProperties = {
  ...card,
  border: "1px solid rgba(0,255,80,0.5)",
  background: "rgba(0,30,10,0.95)",
  position: "relative",
};

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string | null, planKey: string) => {
    if (!priceId) return;
    setLoading(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=/pricing`;
        return;
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060f08", padding: "60px 24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 13, color: "#00ff80", fontFamily: "monospace", fontWeight: 700, marginBottom: 12, letterSpacing: 2 }}>
            PRICING
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: "#e8f5eb", marginBottom: 14 }}>
            シンプルな料金プラン
          </h1>
          <p style={{ fontSize: 15, color: "#8ab89a", maxWidth: 480, margin: "0 auto" }}>
            物販ビジネスの規模に合わせて選べる3つのプラン。<br />
            いつでもアップグレード・ダウングレード可能。
          </p>
        </div>

        {/* Plans */}
        <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
          {/* Free */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ background: "rgba(0,255,80,0.07)", border: "1px solid rgba(0,255,80,0.15)", borderRadius: 10, padding: 8 }}>
                <Gift size={18} color="#8ab89a" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#e8f5eb" }}>{PLANS.FREE.name}</span>
            </div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: "#e8f5eb", fontFamily: "monospace" }}>¥0</span>
              <span style={{ fontSize: 14, color: "#8ab89a", marginLeft: 6 }}>/月</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              {PLANS.FREE.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#a8d8b8" }}>
                  <Check size={14} color="#4a8a5a" />
                  {f}
                </div>
              ))}
            </div>
            <a
              href="/login"
              style={{
                display: "block",
                textAlign: "center",
                background: "transparent",
                border: "1px solid rgba(0,255,80,0.25)",
                borderRadius: 10,
                color: "#8ab89a",
                padding: "12px",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              無料で始める
            </a>
          </div>

          {/* Pro */}
          <div style={proCard}>
            <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg,#004d1f,#00a040)", border: "1px solid rgba(0,255,80,0.5)", borderRadius: 20, padding: "4px 16px", fontSize: 12, fontWeight: 800, color: "#00ff80", whiteSpace: "nowrap" }}>
              おすすめ
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ background: "rgba(0,255,80,0.1)", border: "1px solid rgba(0,255,80,0.3)", borderRadius: 10, padding: 8 }}>
                <Zap size={18} color="#00ff80" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#e8f5eb" }}>{PLANS.PRO.name}</span>
            </div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: "#00ff80", fontFamily: "monospace" }}>¥{PLANS.PRO.price.toLocaleString()}</span>
              <span style={{ fontSize: 14, color: "#8ab89a", marginLeft: 6 }}>/月</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              {PLANS.PRO.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#a8d8b8" }}>
                  <Check size={14} color="#00ff80" />
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => handleSubscribe(PLANS.PRO.priceId, "PRO")}
              disabled={loading === "PRO"}
              style={{
                width: "100%",
                background: loading === "PRO" ? "rgba(0,50,20,0.5)" : "linear-gradient(135deg,#004d1f,#006629)",
                border: "1px solid rgba(0,255,80,0.5)",
                borderRadius: 10,
                color: "#00ff80",
                padding: "13px",
                fontSize: 14,
                fontWeight: 800,
                cursor: loading === "PRO" ? "not-allowed" : "pointer",
              }}
            >
              {loading === "PRO" ? "処理中..." : "プロにアップグレード"}
            </button>
          </div>

          {/* Business */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ background: "rgba(100,180,255,0.07)", border: "1px solid rgba(100,180,255,0.2)", borderRadius: 10, padding: 8 }}>
                <Building2 size={18} color="#66aaff" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#e8f5eb" }}>{PLANS.BUSINESS.name}</span>
            </div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: "#66aaff", fontFamily: "monospace" }}>¥{PLANS.BUSINESS.price.toLocaleString()}</span>
              <span style={{ fontSize: 14, color: "#8ab89a", marginLeft: 6 }}>/月</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              {PLANS.BUSINESS.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#a8d8b8" }}>
                  <Check size={14} color="#66aaff" />
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => handleSubscribe(PLANS.BUSINESS.priceId, "BUSINESS")}
              disabled={loading === "BUSINESS"}
              style={{
                width: "100%",
                background: "transparent",
                border: "1px solid rgba(100,180,255,0.35)",
                borderRadius: 10,
                color: "#66aaff",
                padding: "13px",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading === "BUSINESS" ? "not-allowed" : "pointer",
              }}
            >
              {loading === "BUSINESS" ? "処理中..." : "ビジネスプランへ"}
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 64, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#4a8a5a" }}>
            クレジットカードが必要です。いつでもキャンセル可能。<br />
            決済はStripeで安全に処理されます。
          </p>
        </div>
      </div>
    </div>
  );
}
