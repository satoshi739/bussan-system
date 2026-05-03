"use client";

import { useEffect, useState } from "react";
import type { PlanKey } from "@/lib/stripe";

interface PlanState {
  plan: PlanKey;
  status: string;
  loading: boolean;
  error: boolean;
}

export function usePlan(): PlanState {
  const [state, setState] = useState<PlanState>({
    plan: "FREE",
    status: "INACTIVE",
    loading: true,
    error: false,
  });

  useEffect(() => {
    fetch("/api/subscription/plan")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setState({ plan: d.plan ?? "FREE", status: d.status ?? "INACTIVE", loading: false, error: false }))
      .catch((error) => {
        console.warn("プラン情報の取得に失敗しました:", error);
        setState(prev => ({ ...prev, loading: false, error: true }));
      });
  }, []);

  return state;
}
