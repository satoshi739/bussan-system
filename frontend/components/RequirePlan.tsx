"use client";

import { Loader } from "lucide-react";
import { usePlan } from "@/lib/usePlan";
import PlanGate from "@/components/PlanGate";
import type { PlanKey } from "@/lib/stripe";

interface Props {
  requiredPlan: PlanKey;
  featureName?: string;
  children: React.ReactNode;
}

const PLAN_ORDER: PlanKey[] = ["FREE", "PRO", "BUSINESS"];

export default function RequirePlan({ requiredPlan, featureName, children }: Props) {
  const { plan, loading } = usePlan();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader size={22} color="#4a8a5a" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const hasAccess = PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(requiredPlan);

  if (!hasAccess) {
    return <PlanGate userPlan={plan} requiredPlan={requiredPlan} featureName={featureName}><div /></PlanGate>;
  }

  return <>{children}</>;
}
