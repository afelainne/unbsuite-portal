import type { CaseSettings, Cmd, Derivation, FontStyle, Glyph, Metrics, Project } from './types';
import { DEFAULT_KERNING } from './kerning';
import { resolveDerived } from './derive';

export const DEFAULT_METRICS: Metrics = {
  unitsPerEm: 1000,
  ascender: 750,
  descender: -250,
  capHeight: 700,
  xHeight: 500,
  lineGap: 200,
  spaceWidth: 250,
};

let seq = 0;
export const newId = () => `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function newStyle(name: string): FontStyle {
  return {
    id: newId(),
    name,
    glyphs: {},
    spacing: { factor: 1, tracking: 0 },
    kerning: { auto: {}, manual: {}, settings: { ...DEFAULT_KERNING } },
  };
}

export function newProject(): Project {
  return { version: 1, family: 'Minha fonte', designer: '', metrics: { ...DEFAULT_METRICS }, styles: [newStyle('Regular')] };
}

/**
 * Muda a UPM reescalando tudo que está em unidades da fonte (métricas, margens,
 * kerning). O desenho acompanha pela altura das maiúsculas, que também escala.
 */
export function rescaleUpm(project: Project, upm: number): Project {
  const k = upm / project.metrics.unitsPerEm;
  if (!Number.isFinite(k) || k <= 0 || k === 1) return project;
  const r = (v: number) => Math.round(v * k);
  const scaleMap = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([key, v]) => [key, r(v)]));
  const m = project.metrics;
  return {
    ...project,
    metrics: {
      unitsPerEm: upm,
      ascender: r(m.ascender),
      descender: r(m.descender),
      capHeight: r(m.capHeight),
      xHeight: r(m.xHeight),
      lineGap: r(m.lineGap),
      spaceWidth: r(m.spaceWidth),
    },
    styles: project.styles.map(s => ({
      ...s,
      spacing: { ...s.spacing, tracking: r(s.spacing.tracking) },
      glyphs: Object.fromEntries(Object.entries(s.glyphs).map(([c, g]) => [c, { ...g, lsb: r(g.lsb), rsb: r(g.rsb), yOffset: r(g.yOffset) }])),
      kerning: { ...s.kerning, auto: scaleMap(s.kerning.auto), manual: scaleMap(s.kerning.manual) },
      ...(s.cases ? {
        cases: {
          ...s.cases,
          capAccentOffset: r(s.cases.capAccentOffset),
          nudges: Object.fromEntries(Object.entries(s.cases.nudges).map(([c, n]) => [c, { dx: r(n.dx), dy: r(n.dy) }])),
        },
      } : {}),
    })),
  };
}

/* ---------------------------------------------------------- arquivo */

export const PROJECT_EXTENSION = '.unbsfont.json';

export function serializeProject(project: Project): string {
  return JSON.stringify(project);
}

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

function readCmd(c: unknown): Cmd | null {
  if (!c || typeof c !== 'object') return null;
  const o = c as Record<string, unknown>;
  const n = (k: string) => (typeof o[k] === 'number' && Number.isFinite(o[k]) ? (o[k] as number) : NaN);
  switch (o.type) {
    case 'M': case 'L': return Number.isNaN(n('x') + n('y')) ? null : { type: o.type, x: n('x'), y: n('y') };
    case 'Q': return Number.isNaN(n('x1') + n('y1') + n('x') + n('y')) ? null : { type: 'Q', x1: n('x1'), y1: n('y1'), x: n('x'), y: n('y') };
    case 'C': return Number.isNaN(n('x1') + n('y1') + n('x2') + n('y2') + n('x') + n('y')) ? null
      : { type: 'C', x1: n('x1'), y1: n('y1'), x2: n('x2'), y2: n('y2'), x: n('x'), y: n('y') };
    case 'Z': return { type: 'Z' };
    default: return null;
  }
}

function readGlyph(char: string, raw: unknown): Glyph | null {
  if (!raw || typeof raw !== 'object' || Array.from(char).length !== 1) return null;
  const o = raw as Record<string, unknown>;
  const outline = Array.isArray(o.outline) ? o.outline.map(readCmd).filter((c): c is Cmd => c !== null) : [];
  return {
    char,
    outline,
    srcCap: num(o.srcCap, 1) || 1,
    scale: num(o.scale, 1) || 1,
    yOffset: num(o.yOffset, 0),
    lsb: num(o.lsb, 0),
    rsb: num(o.rsb, 0),
    locked: o.locked === true,
    ...readDerivation(o.derived),
  };
}

const oneChar = (v: unknown): v is string => typeof v === 'string' && Array.from(v).length === 1;

function readDerivation(raw: unknown): { derived?: Derivation } {
  if (!raw || typeof raw !== 'object') return {};
  const d = raw as Record<string, unknown>;
  if ((d.kind !== 'unicase' && d.kind !== 'composite') || !oneChar(d.from)) return {};
  return {
    derived: {
      kind: d.kind,
      from: d.from,
      auto: d.auto !== false,
      ...(oneChar(d.mark) ? { mark: d.mark } : {}),
      ...(typeof d.note === 'string' ? { note: d.note.slice(0, 200) } : {}),
    },
  };
}

function readCases(raw: unknown): CaseSettings | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const c = raw as Record<string, unknown>;
  const nudges: CaseSettings['nudges'] = {};
  if (c.nudges && typeof c.nudges === 'object') {
    for (const [k, v] of Object.entries(c.nudges as Record<string, unknown>)) {
      const n = (v || {}) as Record<string, unknown>;
      if (oneChar(k)) nudges[k] = { dx: num(n.dx, 0), dy: num(n.dy, 0) };
    }
  }
  return {
    unicase: c.unicase === 'upper' || c.unicase === 'lower' ? c.unicase : 'off',
    compose: c.compose !== false,
    composeExtended: c.composeExtended === true,
    capAccentOffset: num(c.capAccentOffset, 0),
    nudges,
    detached: Array.isArray(c.detached) ? c.detached.filter(oneChar) : [],
  };
}

const readNumbers = (raw: unknown): Record<string, number> => {
  if (!raw || typeof raw !== 'object') return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([k, v]) => k.includes('|') && typeof v === 'number' && Number.isFinite(v))) as Record<string, number>;
};

/** Lê um arquivo de projeto validando cada campo; o que não reconhece, descarta. */
export function parseProject(text: string): Project {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um projeto do UNBSFONT.');
  }
  const o = data as Record<string, unknown>;
  if (!o || o.version !== 1 || !Array.isArray(o.styles)) throw new Error('O arquivo não é um projeto do UNBSFONT.');
  const mr = (o.metrics || {}) as Record<string, unknown>;
  const metrics: Metrics = {
    unitsPerEm: Math.min(16384, Math.max(16, num(mr.unitsPerEm, DEFAULT_METRICS.unitsPerEm))),
    ascender: num(mr.ascender, DEFAULT_METRICS.ascender),
    descender: Math.min(0, num(mr.descender, DEFAULT_METRICS.descender)),
    capHeight: num(mr.capHeight, DEFAULT_METRICS.capHeight) || DEFAULT_METRICS.capHeight,
    xHeight: num(mr.xHeight, DEFAULT_METRICS.xHeight) || DEFAULT_METRICS.xHeight,
    lineGap: num(mr.lineGap, DEFAULT_METRICS.lineGap),
    spaceWidth: num(mr.spaceWidth, DEFAULT_METRICS.spaceWidth),
  };
  const styles: FontStyle[] = (o.styles as unknown[]).map((raw, i) => {
    const s = (raw || {}) as Record<string, unknown>;
    const base = newStyle(typeof s.name === 'string' && s.name.trim() ? s.name.trim() : `Estilo ${i + 1}`);
    const glyphs: Record<string, Glyph> = {};
    for (const [c, g] of Object.entries((s.glyphs || {}) as Record<string, unknown>)) {
      const glyph = readGlyph(c, g);
      if (glyph) glyphs[c] = glyph;
    }
    const sp = (s.spacing || {}) as Record<string, unknown>;
    const k = (s.kerning || {}) as Record<string, unknown>;
    const ks = (k.settings || {}) as Record<string, unknown>;
    return {
      ...base,
      id: typeof s.id === 'string' ? s.id : base.id,
      glyphs,
      srcCap: typeof s.srcCap === 'number' ? s.srcCap : undefined,
      ...(readCases(s.cases) ? { cases: readCases(s.cases) } : {}),
      spacing: { factor: num(sp.factor, 1), tracking: num(sp.tracking, 0) },
      kerning: {
        auto: readNumbers(k.auto),
        manual: readNumbers(k.manual),
        settings: {
          strength: num(ks.strength, DEFAULT_KERNING.strength),
          scope: ks.scope === 'all' ? 'all' : 'common',
          useClasses: ks.useClasses !== false,
        },
      },
    };
  });
  if (!styles.length) styles.push(newStyle('Regular'));
  return {
    version: 1,
    family: typeof o.family === 'string' ? o.family : 'Minha fonte',
    designer: typeof o.designer === 'string' ? o.designer : '',
    metrics,
    // Derivados são refeitos da origem: o arquivo nunca traz um composto fora de sincronia.
    styles: styles.map(s => (s.cases || Object.values(s.glyphs).some(g => g.derived) ? resolveDerived(s, metrics) : s)),
  };
}

/* ---------------------------------------------------------- navegador */

export const AUTOSAVE_KEY = 'unbsfont:project';

export function loadAutosave(): Project | null {
  let text: string | null = null;
  try {
    text = localStorage.getItem(AUTOSAVE_KEY);
    return text ? parseProject(text) : null;
  } catch {
    // Guarda o que não deu para ler antes que um projeto novo ocupe o lugar.
    try { if (text) localStorage.setItem(`${AUTOSAVE_KEY}:ilegivel`, text); } catch { /* sem espaço */ }
    return null;
  }
}

/** Grava no navegador; devolve falso quando não cabe ou não é permitido. */
export function saveAutosave(project: Project): boolean {
  try {
    localStorage.setItem(AUTOSAVE_KEY, serializeProject(project));
    return true;
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // O navegador cancela o download se a URL for liberada na mesma volta do laço.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
