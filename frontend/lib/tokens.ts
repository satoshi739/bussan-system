// Unified design tokens — Light Mode: Clean White × iOS Blue (futuristic business)
export const T = {
  // Backgrounds — light, airy, cool-tinted
  bg0: "#F0F4FA",        // page base (cool light gray-blue)
  bg1: "#FFFFFF",        // card surface
  bg2: "#F5F8FF",        // subtle elevated / input fill
  bg3: "#E8EFFA",        // tooltips, dropdowns
  bgSidebar: "#FFFFFF",  // sidebar

  // Text — dark on light
  t1: "#0A0F1E",                    // primary (near black)
  t2: "rgba(10,15,30,0.60)",       // secondary
  t3: "rgba(10,15,30,0.38)",       // tertiary / muted
  t4: "rgba(10,15,30,0.20)",       // faint / decorative

  // iOS Blue (primary accent)
  gold:   "#007AFF",  // iOS system blue
  goldLt: "#409CFF",  // lighter blue
  goldDm: "#0056CC",  // pressed / darker blue

  // Signal colors — iOS system palette
  up:   "#28A745",   // green (positive / profit)
  dn:   "#FF3B30",   // iOS red (loss / danger)
  warn: "#FF9500",   // iOS orange (warning)

  // Borders — subtle on white
  bd:    "rgba(0,0,0,0.08)",
  bdSt:  "rgba(0,0,0,0.18)",
  bdSub: "rgba(0,0,0,0.04)",

  // Interactive states
  bgHover:  "rgba(0,122,255,0.06)",
  bgActive: "rgba(0,122,255,0.12)",

  // Radius scale
  rXs:   "10px",
  rSm:   "16px",
  rMd:   "20px",
  rLg:   "28px",
  rXl:   "36px",
  rFull: "9999px",
} as const;
