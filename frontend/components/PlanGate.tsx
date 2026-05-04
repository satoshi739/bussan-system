"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import type { PlanKey } from "@/lib/stripe";

interface Props {
  userPlan: PlanKey;
  requiredPlan: PlanKey;
  children: React.ReactNode;
  featureName?: string;
}

const PLAN_ORDER: PlanKey[] = ["FREE", "STANDARD", "PRO"];

const PLAN_LABELS: Record<PlanKey, string> = {
  FREE: "フリー",
  STANDARD: "Standard",
  PRO: "Pro",
};

export default function PlanGate({ userPlan, requiredPlan, children, featureName }: Props) {
  const hasAccess = PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(requiredPlan);

  if (hasAccess) return <>{children}</>;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{
        background: "rgba(20,20,22,0.9)",
        border: "1px solid rgba(255,180,0,0.25)",
        borderRadius: 18,
        padding: "48px 40px",
        maxWidth: 420,
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ background: "rgba(255,180,0,0.08)", border: "1px solid rgba(255,180,0,0.2)", borderRadius: 14, padding: 16 }}>
            <Lock size={28} color="#ffcc44" />
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f5f1e8", marginBottom: 10 }}>
          {featureName ? `${featureName}は上位プランの機能です` : "上位プランが必要です"}
        </div>
        <div style={{ fontSize: 14, color: "#8a9ab8", lineHeight: 1.8, marginBottom: 28 }}>
          この機能は <strong style={{ color: "#ffcc44" }}>{PLAN_LABELS[requiredPlan]}プラン</strong> 以上でご利用いただけます。
          <br />
          現在のプラン: {PLAN_LABELS[userPlan]}
        </div>
        <Link
          href="/pricing"
          style={{
            display: "inline-block",
            background: "linear-gradient(135deg,#1e1608,#2a1e08)",
            border: "1px solid rgba(201,169,107,0.40)",
            borderRadius: 10,
            color: "#c9a96b",
            padding: "12px 28px",
            fontSize: 14,
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          プランをアップグレード →
        </Link>
      </div>
    </div>
  );
}
