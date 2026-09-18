import type { Config } from "tailwindcss";

const SANS = ["BDO Grotesk", "system-ui", "sans-serif"];
const MONO = ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"];

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        separator: {
          DEFAULT: "hsl(var(--separator))",
          strong: "hsl(var(--separator-strong))",
        },
        fill: {
          DEFAULT: "hsl(var(--fill))",
          2: "hsl(var(--fill-2))",
          3: "hsl(var(--fill-3))",
        },
        tint: {
          DEFAULT: "hsl(var(--tint))",
          foreground: "hsl(var(--tint-foreground))",
        },
        lime: {
          DEFAULT: "hsl(var(--accent-lime))",
          foreground: "hsl(var(--accent-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        canvas: "hsl(var(--canvas))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          hover: "hsl(var(--surface-hover))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        xs: "0.25rem",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-sm)",
        md: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "1.5rem",
        "3xl": "2rem",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        floating: "var(--shadow-floating)",
        sheet: "var(--shadow-sheet)",
        hairline: "inset 0 0 0 1px hsl(var(--input))",
        "hairline-strong": "inset 0 0 0 1px hsl(var(--separator-strong))",
        // 3px ring in the signal colour, per the system's focus rule.
        focus: "0 0 0 3px hsl(var(--ring))",
      },
      fontFamily: {
        sans: SANS,
        mono: MONO,
      },
      fontSize: {
        // micro label: 11px, the only style the system ever tracks positive
        "2xs": ["11px", { lineHeight: "1.2", letterSpacing: "0.08em" }],
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        "in-out": "var(--ease-in-out)",
        spring: "var(--ease-spring)",
      },
      transitionDuration: {
        instant: "90ms",
        fast: "140ms",
        base: "200ms",
        slow: "320ms",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        materialize: {
          from: { opacity: "0", transform: "scale(0.96) translateY(-4px)", filter: "blur(6px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)", filter: "blur(0)" },
        },
        dematerialize: {
          from: { opacity: "1", transform: "scale(1)", filter: "blur(0)" },
          to: { opacity: "0", transform: "scale(0.97)", filter: "blur(4px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.28s var(--ease-out)",
        "accordion-up": "accordion-up 0.22s var(--ease-out)",
        materialize: "materialize 0.28s var(--ease-out) both",
        dematerialize: "dematerialize 0.18s var(--ease-out) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
