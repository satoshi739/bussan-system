"use client";

import { useState } from "react";
import { Check, Zap, Building2, Gift } from "lucide-react";
import { PLANS } from "@/lib/stripe";

const card: React.CSSProperties = {
  background: "rgba(20,20,22,0.9)",
  border: "1px solid rgba(212,175,55,0.15)",
  borderRadius: 18,
  padding: "32px 28px",
  flex: 1,
};

const proCard: React.CSSProperties = {
  ...card,
  border: "1px solid rgba(212,175,55,0.5)",
  background: "rgba(0,30,10,0.95)",
  position: "relative",
};

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = (paymentLink: string | null, planKey: string) => {
    if (!paymentLink) return;
    setLoading(planKey);
    window.location.href = paymentLink;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0b", padding: "60px 24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 13, color: "#D4AF37", fontFamily: "monospace", fontWeight: 700, marginBottom: 12, letterSpacing: 2 }}>
            PRICING
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: "#F5F0E8", marginBottom: 14 }}>
            シンプルな料金プラン
          </h1>
          <p style={{ fontSize: 15, color: "#8A8278", maxWidth: 480, margin: "0 auto 20px" }}>
            物販ビジネスの規模に合わせて選べる3つのプラン。<br />
            いつでもアップグレード・ダウングレード可能。
          </p>
          {/* 価値訴求バナー */}
          <div style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "center", gap: 12, margin: "0 auto" }}>
            {[
              { icon: "🔍", text: "利益商品を自動スキャン" },
              { icon: "📊", text: "国内外の相場を瞬時に比較" },
              { icon: "🤖", text: "AI仕入れ判断（おすすめ度）" },
              { icon: "🎁", text: "7日間無料トライアル付き" },
            ].map(({ icon, text }) => (
              <span key={text} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 20, padding: "6px 14px", fontSize: 12, color: "#D4CCBC", fontWeight: 600 }}>
                {icon} {text}
              </span>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
          {/* Free */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 10, padding: 8 }}>
                <Gift size={18} color="#8A8278" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#F5F0E8" }}>{PLANS.FREE.name}</span>
            </div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: "#F5F0E8", fontFamily: "monospace" }}>¥0</span>
              <span style={{ fontSize: 14, color: "#8A8278", marginLeft: 6 }}>/月</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              {PLANS.FREE.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#a8d8b8" }}>
                  <Check size={14} color="#8A8278" />
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
                border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: 10,
                color: "#8A8278",
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
            <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.5)", borderRadius: 20, padding: "4px 16px", fontSize: 12, fontWeight: 800, color: "#D4AF37", whiteSpace: "nowrap" }}>
              おすすめ
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 10, padding: 8 }}>
                <Zap size={18} color="#D4AF37" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#F5F0E8" }}>{PLANS.PRO.name}</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: "#D4AF37", fontFamily: "monospace" }}>¥{PLANS.PRO.price.toLocaleString()}</span>
              <span style={{ fontSize: 14, color: "#8A8278", marginLeft: 6 }}>/月</span>
            </div>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: "#22c55e", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20, padding: "2px 10px", fontWeight: 700, letterSpacing: "0.03em" }}>
                🎁 7日間無料トライアル
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              {PLANS.PRO.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#a8d8b8" }}>
                  <Check size={14} color="#D4AF37" />
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => handleSubscribe(PLANS.PRO.priceId, "PRO")}
              disabled={loading === "PRO"}
              style={{
                width: "100%",
                background: loading === "PRO" ? "rgba(0,50,20,0.5)" : "linear-gradient(135deg,#1e1608,#2a1e08)",
                border: "1px solid rgba(212,175,55,0.5)",
                borderRadius: 10,
                color: "#D4AF37",
                padding: "13px",
                fontSize: 14,
                fontWeight: 800,
                cursor: loading === "PRO" ? "not-allowed" : "pointer",
              }}
            >
              {loading === "PRO" ? "処理中..." : "Standardプランを始める"}
            </button>
          </div>

          {/* Business */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ background: "rgba(100,180,255,0.07)", border: "1px solid rgba(100,180,255,0.2)", borderRadius: 10, padding: 8 }}>
                <Building2 size={18} color="#66aaff" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#F5F0E8" }}>{PLANS.BUSINESS.name}</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: "#66aaff", fontFamily: "monospace" }}>¥{PLANS.BUSINESS.price.toLocaleString()}</span>
              <span style={{ fontSize: 14, color: "#8A8278", marginLeft: 6 }}>/月</span>
            </div>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: "#22c55e", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20, padding: "2px 10px", fontWeight: 700, letterSpacing: "0.03em" }}>
                🎁 7日間無料トライアル
              </span>
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
              {loading === "BUSINESS" ? "処理中..." : "Proプランを始める"}
            </button>
          </div>
        </div>

        {/* 信頼表示 */}
        <div style={{ marginTop: 48, background: "rgba(20,20,22,0.7)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 14, padding: "20px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {[
              ["🏢", "運営", "ユニバーサルプラネットジャパン株式会社"],
              ["🔒", "決済", "Stripe（PCI DSS準拠の安全な決済）"],
              ["🛡️", "カード情報", "当社サーバーでは保持しません"],
              ["✅", "解約", "マイページからいつでも即時解約OK"],
            ].map(([icon, label, desc]) => (
              <div key={label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: "#8A8278", fontWeight: 700, marginBottom: 1 }}>{label}</div>
                  <div style={{ fontSize: 12, color: "#c0b8a8" }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
