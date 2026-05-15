"use client";

import React from "react";

export function ProfitBar({ rate, color }: { rate: number; color: string }) {
  const w = Math.max(0, Math.min(100, rate));
  return (
    <div style={{ height: 3, background: "rgba(212,175,55,0.08)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 2, transition: "width 0.5s ease" }} />
    </div>
  );
}
