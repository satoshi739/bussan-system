"use client";

import React from "react";

export function DemandGauge({ score, color }: { score: number; color: string }) {
  const r = 13; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={32} height={32} style={{ display: "block" }}>
      <circle cx={16} cy={16} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
      <circle cx={16} cy={16} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
      <text x={16} y={20} textAnchor="middle" fontSize={8} fontWeight={800} fill={color}>{Math.round(score)}</text>
    </svg>
  );
}
