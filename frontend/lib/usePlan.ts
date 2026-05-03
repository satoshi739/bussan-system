"use client";

import { useEffect, useState } from "react";
import type { PlanKey } from "@/lib/stripe";

interface PlanState {
  plan: PlanKey;
  status: string;
  loading: boolean;
}

export function usePlan(): PlanState {
  const [state, setState] = useState<PlanState>({
    plan: "FREE",
    status: "INACTIVE",
    loading: true,
  });

  useEffect(() => {
    fetch("/api/subscription/plan")
      .then((r) => r.json())
      .then((d) => setState({ plan: d.plan ?? "FREE", status: d.status ?? "INACTIVE", loading: false }))
      .catch((error) => {
        console.warn("プラン情報の取得に失敗しました。FREEプランとして動作します:", error);
        setState({ plan: "FREE", status: "INACTIVE", loading: false });
      });
  }, []);

  return state;
}
