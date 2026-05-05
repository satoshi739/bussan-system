"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

type MonthData = { month: string; profit: number; sales_count?: number };

export default function ProfitBarChart({
  data,
  t1,
  t3,
  bdSub,
  up,
  dn,
  bg1,
  bd,
}: {
  data: MonthData[];
  t1: string; t3: string; bdSub: string;
  up: string; dn: string; bg1: string; bd: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fill: t3, fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: t3, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} width={44} />
        <ReferenceLine y={0} stroke={bdSub} />
        <Tooltip
          contentStyle={{ background: bg1, border: `1px solid ${bd}`, borderRadius: 12, color: t1, fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}
          formatter={v => [`¥${Number(v).toLocaleString()}`, "純利益"]}
        />
        <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
          {data.map((e) => (
            <Cell key={e.month} fill={e.profit >= 0 ? up : dn} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
