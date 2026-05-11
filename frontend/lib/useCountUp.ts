"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 数字を 0 → target までスムーズにアニメーションさせるフック。
 * Apple 風の easeOutCubic で立ち上がりを早く、終盤を緩やかに。
 */
export function useCountUp(target: number, durationMs = 1200): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const targetRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    targetRef.current = target;
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(targetRef.current * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setValue(targetRef.current);
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}

/** 整数フォーマット（カンマ区切り） */
export function formatInt(n: number): string {
  return Math.round(n).toLocaleString();
}

/** 円表示フォーマット */
export function formatYen(n: number): string {
  return `¥${formatInt(n)}`;
}

/** パーセント表示（小数1桁） */
export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}
