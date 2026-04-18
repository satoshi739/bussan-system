"use client";

import { Loader } from "lucide-react";
import { usePlan } from "@/lib/usePlan";

interface Props {
  requiredPlan: string;
  featureName?: string;
  children: React.ReactNode;
}

export default function RequirePlan({ requiredPlan: _r, featureName: _f, children }: Props) {
  const { loading } = usePlan();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader size={22} color="#8A8278" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  // TODO: 本番リリース時にプランチェックを有効化する
  return <>{children}</>;
}
