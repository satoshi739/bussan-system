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

export default function RequirePlan({ requiredPlan, featureName, children }: Props) {
  const { plan, loading } = usePlan();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader size={22} color="#8A8278" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <PlanGate userPlan={plan} requiredPlan={requiredPlan} featureName={featureName}>
      {children}
    </PlanGate>
  );
}
