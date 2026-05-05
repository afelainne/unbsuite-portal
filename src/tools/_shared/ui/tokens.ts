// Shared design tokens for all tools
// Industrial e-reader: yellow #F7E043, accent #F0FF00, fg #232323, bg #FFFFFF

export const COLOR = {
  bg: "#FFFFFF",
  fg: "#232323",
  accent: "#F0FF00",
  accentSoft: "#F7E043",
  border: "rgba(35,35,35,0.12)",
  borderStrong: "rgba(35,35,35,0.4)",
  muted: "rgba(35,35,35,0.55)",
} as const;

// Chrome typography (header / panel / labels / buttons)
export const CHROME_BASE = "font-mono uppercase tracking-[0.2em] text-[#232323]";
export const HEADER_TEXT = `${CHROME_BASE} text-[11px] font-semibold`;
export const LABEL_TEXT = `${CHROME_BASE} text-[9px] opacity-60`;
export const SECTION_TITLE = `${CHROME_BASE} text-[10px] font-bold`;
export const BUTTON_TEXT = `${CHROME_BASE} text-[10px] font-semibold tracking-[0.18em]`;
export const META_TEXT = `${CHROME_BASE} text-[9px] opacity-70`;

// Body / canvas typography
export const BODY_TEXT = "font-sans text-[12px] text-[#232323]";
export const VALUE_TEXT = "font-mono tabular-nums text-[11px] text-[#232323]";

export const PANEL_WIDTH = "w-[280px]";
export const HEADER_HEIGHT = "h-12";

export const BORDER_LINE = "border-[#232323]/15";
export const BORDER_STRONG = "border-[#232323]";