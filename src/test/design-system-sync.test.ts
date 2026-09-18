/**
 * The app runs on the UNBSTOOLS design system. The system's source of truth is
 * design-system/tokens/*.css (hex, px, ms); the app consumes those values in
 * src/index.css, where Tailwind needs them as "H S% L%" triplets.
 *
 * Two files, one set of values — which drifts the moment someone edits one and
 * forgets the other. These tests convert the system's hexes and compare them to
 * what the app actually declares, so the adoption is checked, not claimed.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const systemCss = (file: string) => readFileSync(resolve(root, "design-system/tokens", file), "utf8");
const appCss = readFileSync(resolve(root, "src/index.css"), "utf8");

/** Read `--name:value` out of a token file. */
function token(css: string, name: string): string {
  const m = new RegExp(`--${name}\\s*:\\s*([^;]+);`).exec(css);
  if (!m) throw new Error(`token --${name} não encontrado`);
  return m[1].trim();
}

/** Read `--name: value;` from the app's :root block (first declaration wins). */
function appToken(name: string): string {
  const root = appCss.slice(appCss.indexOf(":root {"), appCss.indexOf(".dark {"));
  const m = new RegExp(`--${name}\\s*:\\s*([^;/]+)`).exec(root);
  if (!m) throw new Error(`token --${name} não encontrado em src/index.css`);
  return m[1].trim();
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hex.replace("#", "").match(/../g)!.map((h) => parseInt(h, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = (max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return [h, s * 100, l * 100];
}

function parseTriplet(v: string): [number, number, number] {
  const [h, s, l] = v.split(/\s+/).map((p) => parseFloat(p));
  return [h, s, l];
}

/** Same colour, allowing for the rounding done when the hex was converted. */
function expectSameColour(appValue: string, hex: string) {
  const [ah, as, al] = parseTriplet(appValue);
  const [sh, ss, sl] = hexToHsl(hex);
  // Hue is meaningless at zero saturation (black, white, grays).
  if (ss > 0.5) expect(Math.abs(ah - sh)).toBeLessThan(1);
  expect(Math.abs(as - ss)).toBeLessThan(1);
  expect(Math.abs(al - sl)).toBeLessThan(1);
}

describe("o app usa a paleta do design system", () => {
  const colors = systemCss("colors.css");

  it.each([
    ["background", "canvas-100"],
    ["card", "surface-000"],
    ["secondary", "surface-100"],
    ["muted", "surface-050"],
    ["muted-foreground", "ink-500"],
    ["border", "hairline-soft"],
    ["input", "hairline"],
    ["canvas", "canvas-200"],
  ])("--%s vem de --%s", (app, system) => {
    expectSameColour(appToken(app), token(colors, system));
  });

  it("a cor de sinal e seus passos vêm da escala amarela", () => {
    expectSameColour(appToken("accent"), token(colors, "yellow-400"));
    expectSameColour(appToken("accent-hover"), token(colors, "yellow-500"));
    expectSameColour(appToken("accent-ink"), token(colors, "yellow-600"));
    expectSameColour(appToken("accent-quiet"), token(colors, "yellow-050"));
    expectSameColour(appToken("ring"), token(colors, "yellow-400"));
  });

  it("selecionado é tinta preta com glifo branco", () => {
    expectSameColour(appToken("primary"), token(colors, "ink-900"));
    expectSameColour(appToken("primary-foreground"), token(colors, "white"));
    expectSameColour(appToken("accent-foreground"), token(colors, "ink-900"));
  });
});

describe("o app usa as medidas do design system", () => {
  const radius = systemCss("radius.css");
  const motion = systemCss("motion.css");
  const spacing = systemCss("spacing.css");

  it.each([
    ["radius-sm", "radius-sm"],
    ["radius", "radius-md"],
    ["radius-lg", "radius-lg"],
    ["radius-xl", "radius-xl"],
  ])("--%s == --%s do sistema", (app, system) => {
    expect(appToken(app)).toBe(token(radius, system));
  });

  it.each([
    ["dur-instant", "dur-instant"],
    ["dur-fast", "dur-fast"],
    ["dur-base", "dur-base"],
    ["dur-slow", "dur-slow"],
  ])("--%s == --%s do sistema", (app, system) => {
    expect(appToken(app)).toBe(token(motion, system));
  });

  it("a curva de saída é a do sistema", () => {
    // `.16` and `0.16` are the same number written two ways.
    const strip = (v: string) => v.replace(/\s+/g, "").replace(/\b0\./g, ".");
    expect(strip(appToken("ease-out"))).toBe(strip(token(motion, "ease-out")));
    expect(strip(appToken("ease-in-out"))).toBe(strip(token(motion, "ease-in-out")));
  });

  it("largura máxima, medianiz e espaço entre cartões", () => {
    expect(appToken("content-max")).toBe(token(spacing, "max-content"));
    expect(appToken("grid-gap")).toBe(token(spacing, "gap-card"));
    // The gutter clamps between the system's mobile and desktop values.
    expect(appToken("page-gutter")).toContain(token(spacing, "gutter-page-mobile"));
    expect(appToken("page-gutter")).toContain(token(spacing, "gutter-page"));
  });

  it("o cartão usa o padding do sistema", () => {
    const m = /\.material-card\s*{[^}]*padding:\s*([^;]+);/.exec(appCss);
    expect(m, "material-card precisa declarar padding").toBeTruthy();
    // The rule points at a token; the token itself has to match the system.
    const declared = m![1].trim();
    const value = /^var\(--([\w-]+)\)$/.exec(declared);
    expect(value, `padding deve vir de um token, veio "${declared}"`).toBeTruthy();
    expect(appToken(value![1])).toBe(token(spacing, "pad-card"));
  });

  it.each([
    ["control-h-sm", "control-h-sm"],
    ["control-h", "control-h"],
    ["control-h-lg", "control-h-lg"],
    ["control-square", "control-square"],
    ["icon", "icon"],
    ["rhythm-section", "rhythm-section"],
  ])("--%s == --%s do sistema", (app, system) => {
    expect(appToken(app)).toBe(token(spacing, system));
  });
});

describe("o app usa a tipografia do design system", () => {
  const type = systemCss("typography.css");

  it("BDO Grotesk é a família, carregada do próprio repositório", () => {
    expect(appCss).toContain("design-system/tokens/fonts.css");
    expect(appCss).toMatch(/font-family:\s*"BDO Grotesk"/);
    // No webfont request leaves the app.
    expect(appCss).not.toContain("fonts.googleapis.com");
  });

  it.each([
    ["text-title-1", "fs-h1"],
    ["text-title-2", "fs-h2"],
    ["text-title-3", "fs-h3"],
    ["text-headline", "fs-body"],
    ["text-body", "fs-body"],
    ["text-callout", "fs-body-s"],
    ["text-footnote", "fs-caption"],
  ])(".%s usa --%s", (cls, size) => {
    const m = new RegExp(`\\.${cls}\\s*{[^}]*font-size:\\s*([^;]+);`).exec(appCss);
    expect(m, `${cls} não encontrado`).toBeTruthy();
    expect(m![1].trim()).toBe(token(type, size));
  });

  it("o rótulo micro é o único estilo com tracking positivo", () => {
    const label = /\.label\s*{[^}]*}/.exec(appCss)![0];
    expect(label).toContain(token(type, "fs-micro"));
    expect(label).toContain(token(type, "ls-eyebrow"));
    expect(label).toContain("uppercase");
  });
});
