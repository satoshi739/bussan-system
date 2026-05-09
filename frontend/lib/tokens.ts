// Unified design tokens — Light Mode: Clean White × iOS Blue (futuristic business)
export const T = {
  // Backgrounds — light, airy, cool-tinted
  bg0: "#EEF2FA",        // page base
  bg1: "#FFFFFF",        // card surface
  bg2: "#F5F8FF",        // subtle elevated / input fill
  bg3: "#E4ECFA",        // tooltips, dropdowns
  bgSidebar: "#F8FAFF",  // sidebar

  // Text — dark on light (improved contrast)
  t1: "#080D1C",                    // primary (near black)
  t2: "rgba(8,13,28,0.75)",        // secondary — readable grey
  t3: "rgba(8,13,28,0.55)",        // tertiary / labels
  t4: "rgba(8,13,28,0.30)",        // faint / decorative

  // iOS Blue (primary accent — slightly deepened for contrast)
  gold:   "#006FE6",  // blue (deepened from #007AFF for contrast)
  goldLt: "#3B8EEA",  // lighter blue
  goldDm: "#004EB0",  // pressed / darker blue

  // Signal colors — iOS system palette
  up:   "#1E9C3C",   // green (positive / profit)
  dn:   "#E02E24",   // red (loss / danger)
  warn: "#E88500",   // orange (warning)

  // Borders — more visible on white
  bd:    "rgba(0,0,0,0.13)",
  bdSt:  "rgba(0,0,0,0.26)",
  bdSub: "rgba(0,0,0,0.06)",

  // Interactive states
  bgHover:  "rgba(0,111,230,0.07)",
  bgActive: "rgba(0,111,230,0.13)",

  // Radius scale
  rXs:   "10px",
  rSm:   "16px",
  rMd:   "20px",
  rLg:   "28px",
  rXl:   "36px",
  rFull: "9999px",
} as const;
