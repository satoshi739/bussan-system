"use client";

import { useState, useEffect } from "react";
import { CreditCard, Zap, Building2, Gift, Check, ExternalLink, AlertCircle } from "lucide-react";
import type { PLANS, PlanKey } from "@/lib/stripe";
import Link from "next/link";

const card: React.CSSProperties = {
  background: "rgba(20,20,22,0.9)",
  border: "1px solid rgba(212,175,55,0.15)",
  borderRadius: 14,
  padding: "24px 28px",
};

const PLAN_ICONS: Record<string, React.ElementType> = {
  FREE: Gift,
  STANDARD: Zap,
  PRO: Building2,
};

const PLAN_COLORS: Record<string, string> = {
  FREE: "#8A8278",
  STANDARD: "#D4AF37",
  PRO: "#66aaff",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "有効",
  INACTIVE: "無効",
  CANCELED: "キャンセル済",
  PAST_DUE: "支払い遅延",
  TRIALING: "トライアル中",
};

interface Props {
  plan: PlanKey;
  status: string;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
  plans: typeof PLANS;
  email: string;
}

export default function BillingClient({ plan, status, currentPeriodEnd, hasStripeCustomer, plans, email }: Props) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSuccessMsg(params.get("success") === "true");
  }, []);

  const PlanIcon = PLAN_ICONS[plan] ?? Gift;
  const planColor = PLAN_COLORS[plan] ?? "#8A8278";
  const currentPlan = plans[plan];

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "支払い管理ページの読み込みに失敗しました");
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error("[portal]", err);
      alert(err instanceof Error ? err.message : "支払い管理ページを開けませんでした。しばらく経ってから再度お試しください。");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (planKey: string) => {
    setUpgradeLoading(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "プランの変更に失敗しました。しばらく経ってから再度お試しください。");
        setUpgradeLoading(null);
        return;
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setUpgradeLoading(null);
    } catch (err) {
      console.error("[upgrade]", err);
      alert("プランの変更に失敗しました。ネットワークエラーが発生しました。");
      setUpgradeLoading(null);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", marginBottom: 24 }}>課金・プラン管理</h1>

      {successMsg && (
        <div style={{ ...card, border: "1px solid rgba(212,175,55,0.4)", background: "rgba(0,40,15,0.9)", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <Check size={18} color="#D4AF37" />
          <span style={{ color: "#D4AF37", fontWeight: 700, fontSize: 14 }}>
            プランのアップグレードが完了しました！
          </span>
        </div>
      )}

      {/* Current Plan */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#8A8278", fontWeight: 600, marginBottom: 16 }}>現在のプラン</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ background: `rgba(${planColor === "#D4AF37" ? "0,255,80" : planColor === "#66aaff" ? "100,170,255" : "0,255,80"},0.08)`, border: `1px solid ${planColor}30`, borderRadius: 12, padding: 12 }}>
              <PlanIcon size={22} color={planColor} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: planColor }}>{currentPlan.name}</div>
              <div style={{ fontSize: 13, color: "#8A8278", marginTop: 2 }}>
                {plan === "FREE" ? "¥0/月" : `¥${currentPlan.price.toLocaleString()}/月`}
                {currentPeriodEnd && (
                  <span style={{ marginLeft: 12, color: "#8A8278" }}>
                    更新日: {new Date(currentPeriodEnd).toLocaleDateString("ja-JP")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              background: status === "ACTIVE" || status === "TRIALING" ? "rgba(212,175,55,0.1)" : "rgba(255,100,50,0.1)",
              border: `1px solid ${status === "ACTIVE" || status === "TRIALING" ? "rgba(212,175,55,0.3)" : "rgba(255,100,50,0.3)"}`,
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: 12,
              fontWeight: 700,
              color: status === "ACTIVE" || status === "TRIALING" ? "#D4AF37" : "#ff9966",
            }}>
              {STATUS_LABELS[status] ?? status}
            </span>
            {hasStripeCustomer && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: "1px solid rgba(212,175,55,0.2)",
                  borderRadius: 8,
                  color: "#8A8278",
                  padding: "8px 14px",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                <CreditCard size={13} />
                {portalLoading ? "読込中..." : "支払い管理"}
                <ExternalLink size={11} />
              </button>
            )}
          </div>
        </div>

        {status === "PAST_DUE" && (
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#ff9966", background: "rgba(255,150,50,0.08)", border: "1px solid rgba(255,150,50,0.2)", borderRadius: 8, padding: "10px 14px" }}>
            <AlertCircle size={14} />
            支払いが遅延しています。お支払い方法を更新してください。
          </div>
        )}
      </div>

      {/* Plan Comparison */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#8A8278", fontWeight: 600, marginBottom: 16 }}>プランの変更</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(Object.entries(plans) as [PlanKey, typeof PLANS[PlanKey]][]).map(([key, p]) => {
            const isCurrent = key === plan;
            const Icon = PLAN_ICONS[key] ?? Gift;
            const color = PLAN_COLORS[key] ?? "#8A8278";
            return (
              <div key={key} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                background: isCurrent ? "rgba(212,175,55,0.04)" : "transparent",
                border: `1px solid ${isCurrent ? "rgba(212,175,55,0.25)" : "rgba(212,175,55,0.08)"}`,
                borderRadius: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Icon size={18} color={isCurrent ? color : "#8A8278"} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isCurrent ? color : "#8A8278" }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "#8A8278" }}>
                      {key === "FREE" ? "無料" : `¥${p.price.toLocaleString()}/月`}
                      {" — "}
                      {p.features[0]}
                    </div>
                  </div>
                </div>
                {isCurrent ? (
                  <span style={{ fontSize: 12, color: color, fontWeight: 700, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 20, padding: "4px 12px" }}>
                    現在のプラン
                  </span>
                ) : key !== "FREE" && p.priceId ? (
                  <button
                    onClick={() => handleUpgrade(key)}
                    disabled={upgradeLoading !== null}
                    style={{
                      background: "rgba(0,40,15,0.8)",
                      border: `1px solid ${color}40`,
                      borderRadius: 8,
                      color,
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {upgradeLoading === key ? "処理中..." : "このプランへ"}
                  </button>
                ) : (
                  <Link href="/pricing" style={{ fontSize: 13, color: "#8A8278", textDecoration: "none" }}>
                    詳細を見る →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Account */}
      <div style={card}>
        <div style={{ fontSize: 13, color: "#8A8278", fontWeight: 600, marginBottom: 12 }}>アカウント</div>
        <div style={{ fontSize: 14, color: "#a8d8b8" }}>
          メールアドレス: <span style={{ color: "#F5F0E8", fontFamily: "monospace" }}>{email}</span>
        </div>
      </div>
    </div>
  );
}
