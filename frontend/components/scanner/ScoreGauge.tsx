"use client";

import React from "react";

export function ScoreGauge({ score, color, profitRate, roi, netProfit, open, onToggle }: {
  score: number; color: string;
  profitRate: number; roi: number; netProfit: number;
  open: boolean; onToggle: () => void;
}) {
  const r = 18; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const pt1 = +(profitRate * 1.5).toFixed(1);
  const pt2 = +(Math.min(roi, 60) * 0.5).toFixed(1);
  const pt3 = +Math.min(netProfit / 100, 20).toFixed(1);

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <svg width={44} height={44} style={{ cursor: "pointer", display: "block" }}
        onClick={e => { e.stopPropagation(); onToggle(); }}>
        <circle cx={22} cy={22} r={r} fill="none" stroke="rgba(212,175,55,0.08)" strokeWidth={4} />
        <circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
        <text x={22} y={26} textAnchor="middle" fontSize={11} fontWeight={800} fill={color}>{Math.round(score)}</text>
      </svg>

      {open && (
        <div style={{
          position: "absolute", top: 50, left: 0, zIndex: 100,
          background: "var(--surface)", border: `1px solid ${color}55`,
          borderRadius: 12, padding: "14px 16px", width: 220,
          boxShadow: "0 12px 32px rgba(0,0,0,0.7)",
        }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 12, fontWeight: 800, color, marginBottom: 10 }}>
            スコア {Math.round(score)} の計算内訳
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "利益率",         formula: `${profitRate}% × 1.5`,                pt: pt1, note: "利益率を最重視", barW: Math.min(100, (pt1 / 60) * 100) },
              { label: "ROI",            formula: `min(${roi.toFixed(0)}%, 60) × 0.5`,   pt: pt2, note: "上限60%でキャップ", barW: Math.min(100, (pt2 / 30) * 100) },
              { label: "利益額ボーナス", formula: `min(¥${Math.round(netProfit)}÷100, 20)`, pt: pt3, note: "最大+20pt",  barW: Math.min(100, (pt3 / 20) * 100) },
            ].map(row => (
              <div key={row.label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 700 }}>{row.label}</span>
                    <span style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "monospace", marginLeft: 6 }}>{row.formula}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 900, color, fontFamily: "monospace" }}>+{row.pt}</span>
                </div>
                <div style={{ height: 3, background: "rgba(212,175,55,0.08)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${row.barW}%`, background: color, borderRadius: 2, opacity: 0.7 }} />
                </div>
                <div style={{ fontSize: 9, color: "#3a6a4a", marginTop: 2 }}>{row.note}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${color}22`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>合計（最大 100）</span>
            <span style={{ fontSize: 18, fontWeight: 900, color, fontFamily: "monospace" }}>{Math.round(score)}</span>
          </div>

          <div style={{ marginTop: 8, fontSize: 9, color: "#3a5a4a", lineHeight: 1.5 }}>
            ※ 100点 = 利益率40%超 + ROI60%以上 + 利益¥2,000以上の理想的な商品
          </div>
        </div>
      )}
    </div>
  );
}
