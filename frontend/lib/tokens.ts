// Unified design tokens — single source of truth for all components
export const T = {
  // Backgrounds — 3-step lift from page base (warm-tinted dark)
  bg0: "#0c0b0a",       // page base (warm deep black)
  bg1: "#161412",       // card surface
  bg2: "#1e1c19",       // elevated / header tint
  bg3: "#272420",       // tooltips, dropdowns
  bgSidebar: "#100f0d", // sidebar surface

  // Text — WCAG AA compliant contrast ratios vs bg0
  t1: "#F5F0E8",  // primary warm white  — headings, active items
  t2: "#D4CCBC",  // secondary           — body text, labels
  t3: "#A09488",  // muted               — icons, helper text
  t4: "#5A5248",  // faint               — decorative only (timestamps)

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
  bgActive: "rgba(212,175,55,0.14)",

  // Radius scale
  rXs:   "6px",
  rSm:   "10px",
  rMd:   "14px",
  rLg:   "18px",
  rXl:   "24px",
  rFull: "9999px",
} as const;
