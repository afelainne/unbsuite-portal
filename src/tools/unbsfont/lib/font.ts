import * as opentype from 'opentype.js';
import type { FontStyle, Metrics, Project } from './types';
import { advanceOf, placedOutline } from './outline';
import { cmdsBox } from './geometry';
import { glyphName } from './charset';
import { buildClasses, classMembers, pairKey, splitKey } from './kerning';
import { buildGpos, buildKern, patchFont, type ClassKerning } from './sfnt';

/**
 * Monta a fonte a partir do projeto. O opentype.js escreve o OTF (contornos
 * CFF, name, OS/2, hhea, cmap, post); o kerning entra depois, em GPOS e na
 * tabela `kern`. O TTF sai do mesmo OTF pelo fonteditor-core, que converte as
 * cúbicas em quadráticas (exigência do formato), e recebe o mesmo kerning.
 */

export type FontFormat = 'otf' | 'ttf';

const WEIGHTS: [RegExp, number][] = [
  [/thin|hairline/i, 100],
  [/extra\s*light|ultra\s*light/i, 200],
  [/light/i, 300],
  [/semi\s*bold|demi\s*bold/i, 600],
  [/extra\s*bold|ultra\s*bold/i, 800],
  [/black|heavy/i, 900],
  [/bold/i, 700],
  [/medium/i, 500],
];

export function styleTraits(styleName: string): { weight: number; italic: boolean } {
  const italic = /italic|oblique/i.test(styleName);
  const weight = WEIGHTS.find(([re]) => re.test(styleName))?.[1] ?? 400;
  return { weight, italic };
}

const psSafe = (s: string) => s.normalize('NFD').replace(/[^\x21-\x7e]/g, '').replace(/[[\](){}<>/%]/g, '');

export function fontNames(family: string, styleName: string) {
  const { weight, italic } = styleTraits(styleName);
  const style = styleName.trim() || 'Regular';
  const ribbi = /^(regular|bold|italic|bold italic)$/i.test(style);
  const plain = style.replace(/\s*(italic|oblique)\s*/i, ' ').trim() || 'Regular';
  return {
    weight,
    italic,
    family: ribbi ? family : `${family} ${plain}`,
    subfamily: ribbi ? style : italic ? 'Italic' : 'Regular',
    typoFamily: family,
    typoSubfamily: style,
    fullName: `${family} ${style}`,
    postScript: `${psSafe(family) || 'Fonte'}-${psSafe(style) || 'Regular'}`.slice(0, 63),
  };
}

export interface BuiltFont {
  buffer: ArrayBuffer;
  glyphCount: number;
  kerningPairs: number;
}

/** Pares de kerning por índice de glifo, a partir das classes do estilo. */
function classKerning(style: FontStyle, m: Metrics, gidOf: (c: string) => number | undefined): { classes: ClassKerning; flat: [number, number, number][] } {
  const cls = buildClasses(style.glyphs, m, style.kerning.settings.useClasses);
  const membersR = classMembers(cls.right);
  const membersL = classMembers(cls.left);
  const merged: Record<string, number> = { ...style.kerning.auto, ...style.kerning.manual };
  const leftIds = Object.keys(membersR);
  const rightIds = Object.keys(membersL);
  const li = new Map(leftIds.map((c, i) => [c, i]));
  const ri = new Map(rightIds.map((c, i) => [c, i]));
  const table = new Map<string, number>();
  const flat: [number, number, number][] = [];
  for (const [key, raw] of Object.entries(merged)) {
    const v = Math.round(raw);
    if (!v) continue;
    const [l, r] = splitKey(key);
    const a = li.get(l);
    const b = ri.get(r);
    if (a === undefined || b === undefined) continue;
    table.set(`${a}:${b}`, v);
    for (const x of membersR[l]) for (const y of membersL[r]) {
      const gx = gidOf(x);
      const gy = gidOf(y);
      if (gx !== undefined && gy !== undefined) flat.push([gx, gy, v]);
    }
  }
  // Unicase compartilha glifo (A e a no mesmo índice): cada índice entra numa classe só, uma vez.
  const toGids = (ids: string[], members: Record<string, string[]>) => {
    const seen = new Set<number>();
    return ids.map(id => members[id].map(gidOf).filter((g): g is number => {
      if (g === undefined || seen.has(g)) return false;
      seen.add(g);
      return true;
    }));
  };
  const pairSeen = new Set<string>();
  return {
    classes: {
      left: toGids(leftIds, membersR),
      right: toGids(rightIds, membersL),
      value: (a, b) => table.get(`${a}:${b}`) ?? 0,
    },
    flat: flat.filter(([a, b]) => {
      const k = `${a}:${b}`;
      if (pairSeen.has(k)) return false;
      pairSeen.add(k);
      return true;
    }),
  };
}

function kerningTables(style: FontStyle, m: Metrics, gidOf: (c: string) => number | undefined) {
  const { classes, flat } = classKerning(style, m, gidOf);
  const tables = [];
  if (flat.length) {
    tables.push({ tag: 'GPOS', data: buildGpos(classes) });
    tables.push({ tag: 'kern', data: buildKern(flat) });
  }
  return { tables, count: flat.length };
}

/** OTF (CFF) de um estilo. */
export function buildOtf(project: Project, style: FontStyle): BuiltFont {
  const m = project.metrics;
  const names = fontNames(project.family.trim() || 'Sem nome', style.name);
  const all = Object.values(style.glyphs)
    .filter(g => g.outline.length && g.char !== ' ')
    .sort((a, b) => (a.char.codePointAt(0) || 0) - (b.char.codePointAt(0) || 0));
  // Cópia unicase idêntica à origem vira só mais um código no mesmo glifo (a → glifo do A).
  const shares = (g: (typeof all)[number]) => {
    const src = g.derived?.kind === 'unicase' ? style.glyphs[g.derived.from] : undefined;
    return !!src && src.derived?.kind !== 'unicase' && src.outline === g.outline && src.lsb === g.lsb && src.rsb === g.rsb
      && src.scale === g.scale && src.srcCap === g.srcCap && src.yOffset === g.yOffset;
  };
  const drawn = all.filter(g => !shares(g));
  const shared = all.filter(shares);

  // .notdef: a caixa vazada de sempre, para caracteres que a fonte não tem.
  const nd = new opentype.Path();
  const w = Math.round(m.unitsPerEm / 2);
  const t = Math.max(1, Math.round(m.unitsPerEm / 20));
  const [x0, x1, y1] = [Math.round(w * 0.1), Math.round(w * 0.9), Math.round(m.capHeight)];
  nd.commands = [
    { type: 'M', x: x0, y: 0 }, { type: 'L', x: x1, y: 0 }, { type: 'L', x: x1, y: y1 }, { type: 'L', x: x0, y: y1 }, { type: 'Z' },
    { type: 'M', x: x0 + t, y: t }, { type: 'L', x: x0 + t, y: y1 - t }, { type: 'L', x: x1 - t, y: y1 - t }, { type: 'L', x: x1 - t, y: t }, { type: 'Z' },
  ];
  const notdef = new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: w, path: nd });
  const space = new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: Math.round(m.spaceWidth), path: new opentype.Path() });
  const nbsp = new opentype.Glyph({ name: 'uni00A0', unicode: 0xa0, advanceWidth: Math.round(m.spaceWidth), path: new opentype.Path() });
  const glyphs = [notdef, space, nbsp];
  const gids = new Map<string, number>([[" ", 1], [String.fromCharCode(0xa0), 2]]);
  let yMin = m.descender;
  let yMax = m.ascender;
  const usedNames = new Set(['.notdef', 'space', 'uni00A0']);
  for (const g of drawn) {
    const cmds = placedOutline(g, m);
    const path = new opentype.Path();
    path.commands = cmds.map(c => ({ ...c })) as opentype.PathCommand[];
    const box = cmdsBox(cmds);
    yMin = Math.min(yMin, Math.floor(box.y0));
    yMax = Math.max(yMax, Math.ceil(box.y1));
    let name = glyphName(g.char);
    while (usedNames.has(name)) name += '.alt';
    usedNames.add(name);
    gids.set(g.char, glyphs.length);
    glyphs.push(new opentype.Glyph({ name, unicode: g.char.codePointAt(0), advanceWidth: advanceOf(g, m), path }));
  }
  for (const g of shared) {
    const gid = gids.get(g.derived!.from);
    if (gid === undefined) continue;
    glyphs[gid].addUnicode(g.char.codePointAt(0) || 0);
    gids.set(g.char, gid);
  }

  // OS/2 fsSelection: itálico (1), negrito (32), regular (64) e USE_TYPO_METRICS (128).
  const bold = /bold/i.test(names.subfamily);
  const fsSelection = (names.italic ? 1 : 0) | (bold ? 32 : 0) | (!bold && !names.italic ? 64 : 0) | 128;
  const font = new opentype.Font({
    familyName: names.family,
    styleName: names.subfamily,
    fullName: names.fullName,
    postScriptName: names.postScript,
    designer: project.designer || ' ',
    manufacturer: 'UNBSFONT',
    version: 'Version 1.000',
    unitsPerEm: m.unitsPerEm,
    ascender: Math.round(m.ascender),
    descender: Math.round(Math.min(0, m.descender)),
    glyphs,
    tables: {
      os2: {
        usWeightClass: names.weight,
        fsSelection,
        sTypoLineGap: Math.round(m.lineGap),
        sxHeight: Math.round(m.xHeight),
        sCapHeight: Math.round(m.capHeight),
        usWinAscent: Math.max(0, yMax),
        usWinDescent: Math.max(0, -yMin),
      },
    },
  } as opentype.FontConstructorOptions);
  font.names.preferredFamily = { en: names.typoFamily };
  font.names.preferredSubfamily = { en: names.typoSubfamily };

  const raw = font.toArrayBuffer();
  const { tables, count } = kerningTables(style, m, c => gids.get(c));
  const macStyle = (names.weight >= 700 ? 1 : 0) | (names.italic ? 2 : 0);
  return { buffer: patchFont(raw, tables, { lineGap: Math.round(m.lineGap), macStyle }), glyphCount: glyphs.length, kerningPairs: count };
}

/** TTF (quadráticas) do mesmo estilo, com o mesmo kerning. */
export async function buildTtf(project: Project, style: FontStyle): Promise<BuiltFont> {
  const otf = buildOtf(project, style);
  const { Font } = await import('fonteditor-core');
  const converted = Font.create(otf.buffer, { type: 'otf' }).write({ type: 'ttf', toBuffer: false }) as ArrayBuffer;
  // Os índices de glifo podem mudar na conversão: o kerning é refeito pelo cmap do TTF.
  const parsed = opentype.parse(converted);
  const { tables } = kerningTables(style, project.metrics, c => {
    const i = parsed.charToGlyphIndex(c);
    return i > 0 ? i : undefined;
  });
  const names = fontNames(project.family, style.name);
  const macStyle = (names.weight >= 700 ? 1 : 0) | (names.italic ? 2 : 0);
  return { buffer: patchFont(converted, tables, { lineGap: Math.round(project.metrics.lineGap), macStyle }), glyphCount: otf.glyphCount, kerningPairs: otf.kerningPairs };
}

export async function buildFont(project: Project, style: FontStyle, format: FontFormat): Promise<BuiltFont> {
  return format === 'otf' ? buildOtf(project, style) : buildTtf(project, style);
}

export function fontFileName(project: Project, style: FontStyle, format: FontFormat): string {
  const safe = (s: string) => s.trim().replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '') || 'Fonte';
  return `${safe(project.family)}-${safe(style.name)}.${format}`;
}

/** Nome de família interno para pré-visualizar um estilo com FontFace sem colidir com fontes instaladas. */
export const previewFamily = (styleId: string) => `unbsfont-preview-${styleId}`;

export { pairKey };
