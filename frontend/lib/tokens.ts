// Unified design tokens — single source of truth for all components
export const T = {
  // Backgrounds — 3-step lift from page base
  bg0: "#0a0a0b",       // page base (deep black)
  bg1: "#141414",       // card surface
  bg2: "#1c1c1e",       // elevated / header tint
  bg3: "#242424",       // tooltips, dropdowns
  bgSidebar: "#0f0f10", // sidebar surface (slightly lighter than page)

  // Text — WCAG AA compliant contrast ratios vs bg0
  t1: "#F5F0E8",  // primary warm white  (14.2:1) — headings, active items
  t2: "#D4CCBC",  // secondary           (8.1:1)  — body text, labels
  t3: "#A09488",  // muted               (4.6:1)  — icons, helper text
  t4: "#5A5248",  // faint               (2.4:1)  — decorative only (timestamps)

  // Gold accent
  gold:   "#D4AF37",
  goldLt: "#F0D060",
  goldDm: "#9A7D25",

  // Signal colors
  up:   "#4ade80",
  dn:   "#f87171",
  warn: "#fbbf24",

  // Borders
  bd:    "rgba(212,175,55,0.18)",
  bdSt:  "rgba(212,175,55,0.38)",
  bdSub: "rgba(212,175,55,0.09)",

  // Interactive states
  bgHover:  "rgba(212,175,55,0.07)",
  bgActive: "rgba(212,175,55,0.13)",
} as const;
