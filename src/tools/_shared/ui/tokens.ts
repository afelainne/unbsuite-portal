// Shared design tokens for all tools.
// Everything resolves to the CSS variables in src/index.css so light/dark,
// reduced-transparency and high-contrast all flow through automatically.

export const COLOR = {
  bg: "hsl(var(--background))",
  surface: "hsl(var(--card))",
  fg: "hsl(var(--foreground))",
  muted: "hsl(var(--muted-foreground))",
  accent: "hsl(var(--accent))",
  accentSoft: "hsl(var(--accent) / 0.35)",
  tint: "hsl(var(--tint))",
  border: "hsl(var(--separator))",
  borderStrong: "hsl(var(--separator-strong))",
  fill: "hsl(var(--fill))",
  fill2: "hsl(var(--fill-2))",
  fill3: "hsl(var(--fill-3))",
} as const;

// Chrome typography (header / panel / labels / buttons) — sentence case, system sans.
export const CHROME_BASE = "font-sans text-foreground";
export const HEADER_TEXT = "text-[13px] font-semibold tracking-[-0.006em] text-foreground";
export const LABEL_TEXT = "text-[12px] font-medium text-muted-foreground";
export const SECTION_TITLE = "text-[13px] font-semibold tracking-[-0.006em] text-foreground";
export const BUTTON_TEXT = "text-[13px] font-medium";
export const META_TEXT = "text-[11px] text-muted-foreground";

// Body / canvas typography
export const BODY_TEXT = "font-sans text-[13px] text-foreground";
export const VALUE_TEXT = "font-mono tabular-nums text-[12px] text-foreground";

export const PANEL_WIDTH = "w-[280px]";
export const HEADER_HEIGHT = "h-12";

export const BORDER_LINE = "border-separator";
export const BORDER_STRONG = "border-separator-strong";
