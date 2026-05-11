"use client";

import { useCountUp } from "@/lib/useCountUp";

type Props = {
  value: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  style?: React.CSSProperties;
  className?: string;
};

/**
 * 0 → value にスムーズにカウントアップする数字表示。
 * Apple 風 easeOutCubic で品質感を演出。
 */
export function AnimatedNumber({ value, durationMs = 1200, prefix = "", suffix = "", decimals = 0, style, className }: Props) {
  const current = useCountUp(value, durationMs);
  const formatted = decimals > 0
    ? current.toFixed(decimals)
    : Math.round(current).toLocaleString();
  return (
    <span className={className} style={style}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
