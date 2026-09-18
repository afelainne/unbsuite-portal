import { describe, expect, it } from 'vitest';
import * as opentype from 'opentype.js';
import type { Cmd, FontStyle, Glyph, Metrics, Project } from '../lib/types';
import {
  COMPOSABLE, composeGlyph, copyMissing, copyToOtherCase, decompose, DEFAULT_CASES, detachGlyph, nudgeAccent, otherCase,
  recomposeAll, resolveDerived, setCaseSettings,
} from '../lib/derive';
import { addGlyphs, respace } from '../lib/actions';
import { buildClasses, kernValue } from '../lib/kerning';
import { advanceOf, inkOutline } from '../lib/outline';
import { cmdsBox, splitContours } from '../lib/geometry';
import { ACCENTS_PT_ES, LATIN_1, LATIN_EXT_A, PRESETS, glyphName, sequenceChars } from '../lib/charset';
import { cells, makeSpec } from '../lib/cartela';
import { newGlyph } from '../lib/sheet';
import { newProject, parseProject, serializeProject } from '../lib/project';
import { buildOtf, buildTtf } from '../lib/font';
import { letter, polyCmds, type Poly } from './fixtures';

/* ---------------------------------------------------------- desenhos */

const shape = (char: string, polys: Poly[]): Glyph => {
  const outline: Cmd[] = [];
  polys.forEach(p => outline.push(...polyCmds(p)));
  return newGlyph(char, outline, 700);
};

/** Agudo desenhado como numa célula de minúscula: 60 unidades acima da altura-x. */
const acute = () => shape('´', [[[40, 560], [120, 560], [200, 700], [110, 700]]]);
const tilde = () => shape('˜', [[[0, 580], [220, 580], [220, 640], [0, 640]]]);
/** Cedilha pendurada sob a linha de base, o topo tocando a linha. */
const cedilla = () => shape('¸', [[[40, 0], [100, 0], [100, -60], [150, -60], [150, -200], [20, -200], [20, -150], [90, -150], [90, -110], [40, -110]]]);
/** i com haste e pingo separados, e o ı só com a haste. */
const iWithDot = () => shape('i', [[[0, 0], [90, 0], [90, 500], [0, 500]], [[0, 580], [90, 580], [90, 670], [0, 670]]]);
const dotless = () => shape('ı', [[[0, 0], [90, 0], [90, 500], [0, 500]]]);
const asChar = (g: Glyph, char: string): Glyph => ({ ...g, char });

function styleWith(glyphs: Glyph[], cases = {}): { style: FontStyle; m: Metrics } {
  const p = newProject();
  const style: FontStyle = { ...p.styles[0], glyphs: Object.fromEntries(glyphs.map(g => [g.char, g])), cases: { ...DEFAULT_CASES, ...cases } };
  return { style: respace(style, p.metrics), m: p.metrics };
}

const basic = () => ['H', 'O', 'A', 'V', 'T', 'n', 'o', 'x'].map(letter);

const points = (cmds: Cmd[]) => cmds.flatMap(c => {
  if (c.type === 'M' || c.type === 'L') return [[c.x, c.y]];
  if (c.type === 'Q') return [[c.x1, c.y1], [c.x, c.y]];
  if (c.type === 'C') return [[c.x1, c.y1], [c.x2, c.y2], [c.x, c.y]];
  return [];
});

/** O composto é exatamente a base seguida do sinal, transladado por um único (dx, dy). */
function splitComposite(comp: Glyph, base: Glyph, mark: Glyph, m: Metrics) {
  const b = inkOutline(base, m);
  const k = inkOutline(mark, m);
  const c = inkOutline(comp, m);
  expect(c.length).toBe(b.length + k.length);
  expect(c.slice(0, b.length)).toEqual(b);
  const cp = points(c.slice(b.length));
  const kp = points(k);
  const dx = cp[0][0] - kp[0][0];
  const dy = cp[0][1] - kp[0][1];
  cp.forEach(([x, y], i) => {
    expect(x - kp[i][0]).toBeCloseTo(dx, 9);
    expect(y - kp[i][1]).toBeCloseTo(dy, 9);
  });
  return { dx, dy, markBox: cmdsBox(c.slice(b.length)) };
}

/* ---------------------------------------------------------- conjuntos */

describe('conjuntos de caracteres', () => {
  it('os presets trazem acentuados, Latin-1, Latin Extended-A e os sinais', () => {
    const byId = Object.fromEntries(PRESETS.map(p => [p.id, Array.from(p.chars as string)]));
    for (const c of Array.from('ÁÀÂÃÄÇÉÈÊËÍÌÎÏÑÓÒÔÕÖÚÙÛÜÝáàâãäçéèêëíìîïñóòôõöúùûüýÿ')) expect(byId.accents).toContain(c);
    for (const cp of [0xb4, 0x60, 0x2c6, 0x2dc, 0xa8, 0xb8, 0x2da]) expect(byId.marks).toContain(String.fromCodePoint(cp));
    for (const c of Array.from('ßÆæØøŒœÅå¡¿«»°ºª€£¢¥©®™·•…–—‘’“”')) expect(byId.latin1).toContain(c);
    expect(byId.latin1).not.toContain(String.fromCodePoint(0xad));
    for (const cp of [0x100, 0x131, 0x152, 0x17f, 0x2c7, 0x2d8, 0x2d9, 0x2dd, 0x2db]) expect(byId.latinA).toContain(String.fromCodePoint(cp));
    expect(ACCENTS_PT_ES.length).toBe(51);
    expect(LATIN_1).toContain('ÿ');
    expect(LATIN_EXT_A).toContain('Ő');
  });

  it('a cartela ganha células para os sinais e os acentuados da ordem', () => {
    const chars = sequenceChars(`ABC\n${PRESETS.find(p => p.id === 'marks')!.chars}\n${ACCENTS_PT_ES}`);
    const spec = makeSpec({ chars, metrics: newProject().metrics });
    const inCells = cells(spec).map(c => c.char);
    for (const c of Array.from('´`ˆ˜¨¸˚ıÁçÑ')) expect(inCells).toContain(c);
  });

  it('decompõe em letra-base e sinal de espaçamento, com nomes AGL', () => {
    expect(decompose('Á')).toEqual({ base: 'A', mark: '´' });
    expect(decompose('ç')).toEqual({ base: 'c', mark: '¸' });
    expect(decompose('Ñ')).toEqual({ base: 'N', mark: '˜' });
    expect(decompose('Ő')).toEqual({ base: 'O', mark: '˝' });
    expect(decompose('Æ')).toBeNull();
    expect(COMPOSABLE).toEqual(expect.arrayContaining(['Á', 'á', 'Ç', 'ç', 'Ñ', 'ñ', 'ÿ', 'Ą', 'ž']));
    expect(['Á', 'á', 'ç', 'Ñ', '´', 'ˆ', '˜', '˚', 'ı', 'Ģ'].map(glyphName)).toEqual(['Aacute', 'aacute', 'ccedilla', 'Ntilde', 'acute', 'circumflex', 'tilde', 'ring', 'dotlessi', 'Gcommaaccent']);
    expect(otherCase('a')).toBe('A');
    expect(otherCase('Á')).toBe('á');
    expect(otherCase('ß')).toBeNull();
  });
});

/* ---------------------------------------------------------- composição */

describe('acentos compostos', () => {
  const { style, m } = styleWith([...basic(), acute(), tilde(), cedilla(), asChar(letter('o'), 'c')]);

  it('Á = A + ´ transladado, centrado no topo e acima das maiúsculas com a mesma folga', () => {
    const comp = style.glyphs['Á'];
    expect(comp.derived).toMatchObject({ kind: 'composite', from: 'A', mark: '´', auto: true });
    const { markBox } = splitComposite(comp, style.glyphs.A, style.glyphs['´'], m);
    // O agudo foi desenhado 60 acima da altura-x: sobre a maiúscula fica 60 acima da altura das maiúsculas.
    expect(markBox.y0).toBeCloseTo(m.capHeight + 60, 6);
    // O ápice do A fica em x = 300 na tinta.
    expect((markBox.x0 + markBox.x1) / 2).toBeCloseTo(300, 0);
  });

  it('á e õ ficam acima da altura-x, como o sinal foi desenhado', () => {
    const o = style.glyphs['ó'];
    const { dy, markBox } = splitComposite(o, style.glyphs.o, style.glyphs['´'], m);
    expect(dy).toBeCloseTo(0, 6);
    expect(markBox.y0).toBeCloseTo(560, 6);
    expect((markBox.x0 + markBox.x1) / 2).toBeCloseTo(250, 0);
    const t = splitComposite(style.glyphs['õ'], style.glyphs.o, style.glyphs['˜'], m);
    expect(t.markBox.y0).toBeCloseTo(580, 6);
  });

  it('ç leva a cedilha presa embaixo, centrada no pé da base', () => {
    const c = style.glyphs['ç'];
    expect(c.derived).toMatchObject({ kind: 'composite', from: 'c', mark: '¸' });
    const { dy, markBox } = splitComposite(c, style.glyphs.c, style.glyphs['¸'], m);
    expect(dy).toBe(0);
    expect(markBox.y1).toBeCloseTo(0, 6);
    // O topo da cedilha (haste de 40 a 100, caixa a partir de 20) centrado no pé do c (x = 250).
    expect(markBox.x0 + 50).toBeCloseTo(250, 0);
  });

  it('herda margens, avanço e a classe de kerning da base', () => {
    expect(advanceOf(style.glyphs['Á'], m)).toBe(advanceOf(style.glyphs.A, m));
    expect(advanceOf(style.glyphs['ó'], m)).toBe(advanceOf(style.glyphs.o, m));
    const cls = buildClasses(style.glyphs, m, true);
    expect(cls.right['Á']).toBe(cls.right.A);
    expect(cls.left['Á']).toBe(cls.left.A);
    expect(buildClasses(style.glyphs, m, false).right['Á']).toBe('A');
  });

  it('o ajuste de maiúsculas desce o acento só nas maiúsculas', () => {
    const lower = setCaseSettings(style, { capAccentOffset: -20 }, m);
    expect(cmdsBox(inkOutline(lower.glyphs['Á'], m)).y1).toBeCloseTo(cmdsBox(inkOutline(style.glyphs['Á'], m)).y1 - 20, 6);
    expect(inkOutline(lower.glyphs['ó'], m)).toEqual(inkOutline(style.glyphs['ó'], m));
  });

  it('desenhado vence composto; ajuste fino por glifo e recompor tudo', () => {
    const drawn = asChar(letter('A'), 'Á');
    const withDrawn = resolveDerived({ ...style, glyphs: { ...style.glyphs, ['Á']: drawn } }, m);
    expect(withDrawn.glyphs['Á'].derived).toBeUndefined();
    expect(withDrawn.glyphs['Á'].outline).toBe(drawn.outline);

    const nudged = nudgeAccent(style, 'Á', 10, -5, m);
    const a = splitComposite(style.glyphs['Á'], style.glyphs.A, style.glyphs['´'], m);
    const b = splitComposite(nudged.glyphs['Á'], style.glyphs.A, style.glyphs['´'], m);
    expect(b.dx - a.dx).toBeCloseTo(10, 6);
    expect(b.dy - a.dy).toBeCloseTo(-5, 6);

    const detached = detachGlyph(nudged, 'Á', m);
    expect(detached.glyphs['Á']).toBeUndefined();
    expect(respace(detached, m).glyphs['Á']).toBeUndefined();
    const back = recomposeAll(detached, m);
    expect(back.glyphs['Á']).toBeDefined();
    expect(splitComposite(back.glyphs['Á'], style.glyphs.A, style.glyphs['´'], m).dx).toBeCloseTo(a.dx, 6);
  });

  it('sem composição ligada, nada é composto; Latin Extended-A só quando pedido', () => {
    const off = setCaseSettings(style, { compose: false }, m);
    expect(off.glyphs['Á']).toBeUndefined();
    expect(off.glyphs.A).toBe(style.glyphs.A);
    expect(style.glyphs['ń']).toBeUndefined();
    const ext = setCaseSettings(style, { composeExtended: true }, m);
    expect(ext.glyphs['ń']?.derived).toMatchObject({ kind: 'composite', from: 'n' });
    // Vírgula embaixo não é cedilha: fica para desenhar.
    expect(ext.glyphs['ņ']).toBeUndefined();
  });

  it('í usa o ı quando desenhado; sem ele, tira o pingo do i e avisa', () => {
    const withI = styleWith([...basic(), acute(), iWithDot()]);
    const g = withI.style.glyphs['í'];
    expect(g.derived?.from).toBe('i');
    expect(g.derived?.note).toMatch(/pingo/);
    // Só a haste e o agudo: o pingo (acima da altura-x) saiu.
    expect(splitContours(g.outline)).toHaveLength(2);

    const withDotless = styleWith([...basic(), acute(), iWithDot(), dotless()]);
    const d = withDotless.style.glyphs['í'];
    expect(d.derived).toMatchObject({ from: 'ı' });
    expect(d.derived?.note).toBeUndefined();
    splitComposite(d, withDotless.style.glyphs['ı'], withDotless.style.glyphs['´'], withDotless.m);
  });

  it('composeGlyph devolve null sem a base ou sem o sinal', () => {
    expect(composeGlyph('É', style.glyphs, m, DEFAULT_CASES)).toBeNull();
    expect(composeGlyph('Â', style.glyphs, m, DEFAULT_CASES)).toBeNull();
  });
});

/* ---------------------------------------------------------- unicase */

describe('unicase', () => {
  it('maiúsculas nas minúsculas: a é o mesmo desenho, avanço e kerning do A', () => {
    const { style, m } = styleWith([...basic(), acute()], { unicase: 'upper' });
    const a = style.glyphs.a;
    expect(a.derived).toMatchObject({ kind: 'unicase', from: 'A', auto: true });
    expect(a.outline).toBe(style.glyphs.A.outline);
    expect([a.lsb, a.rsb]).toEqual([style.glyphs.A.lsb, style.glyphs.A.rsb]);
    // Desenhadas continuam: n, o e x não viram N, O e X.
    expect(style.glyphs.n.derived).toBeUndefined();
    expect(style.glyphs.o.outline).not.toBe(style.glyphs.O.outline);
    // Acentuados seguem a regra: á é o Á composto.
    expect(style.glyphs['á'].derived).toMatchObject({ kind: 'unicase', from: 'Á' });
    expect(style.glyphs['á'].outline).toBe(style.glyphs['Á'].outline);

    const kerned = { ...style, kerning: { ...style.kerning, auto: { 'A|V': -80 } } };
    const cls = buildClasses(kerned.glyphs, m, true);
    expect(cls.right.a).toBe(cls.right.A);
    expect(kernValue(kerned.kerning, cls, 'a', 'V')).toBe(-80);
    expect(kernValue(kerned.kerning, cls, 'á', 'V')).toBe(-80);
    const noClasses = buildClasses(kerned.glyphs, m, false);
    expect(kernValue(kerned.kerning, noClasses, 'a', 'V')).toBe(-80);
  });

  it('minúsculas nas maiúsculas preenche só o que falta e respeita o desfeito', () => {
    const { style, m } = styleWith(basic(), { unicase: 'lower' });
    expect(style.glyphs.N.derived).toMatchObject({ kind: 'unicase', from: 'n' });
    expect(style.glyphs.X.outline).toBe(style.glyphs.x.outline);
    expect(style.glyphs.H.derived).toBeUndefined();
    const detached = detachGlyph(style, 'N', m);
    expect(respace(detached, m).glyphs.N).toBeUndefined();
    // Voltar ao normal tira as cópias do modo.
    const off = setCaseSettings(style, { unicase: 'off' }, m);
    expect(off.glyphs.N).toBeUndefined();
  });

  it('copiar faltantes nunca sobrescreve desenho; copiar um glifo pede confirmação para isso', () => {
    const { style, m } = styleWith(basic());
    const { style: filled, count } = copyMissing(style, 'upper', m);
    // H, A, V, T → h, a, v, t (o, n, x já desenhados).
    expect(count).toBe(4);
    expect(filled.glyphs.a.derived).toMatchObject({ kind: 'unicase', from: 'A', auto: false });
    expect(filled.glyphs.o.outline).toBe(style.glyphs.o.outline);
    expect(filled.glyphs.o.derived).toBeUndefined();
    // A cópia explícita fica mesmo com o modo desligado.
    expect(respace(filled, m).glyphs.a.derived?.from).toBe('A');

    expect(copyToOtherCase(style, 'O', m).glyphs.o.outline).toBe(style.glyphs.o.outline);
    const over = copyToOtherCase(style, 'O', m, true);
    expect(over.glyphs.o.outline).toBe(style.glyphs.O.outline);
    expect(over.glyphs.o.derived).toMatchObject({ from: 'O', auto: false });

    // Desenhar por cima de uma cópia: o desenho vence.
    const p = newProject();
    p.styles[0] = filled;
    const drawn = addGlyphs(p, filled.id, [asChar(letter('n'), 'a')], 700).styles[0];
    expect(drawn.glyphs.a.derived).toBeUndefined();
  });
});

describe('arquivo de projeto', () => {
  it('guarda o modo, os ajustes e os derivados, e os refaz ao abrir', () => {
    const { style, m } = styleWith([...basic(), acute()], { unicase: 'upper', capAccentOffset: -15 });
    const p = newProject();
    p.styles[0] = nudgeAccent(style, 'Á', 4, 2, m);
    const back = parseProject(serializeProject(p)).styles[0];
    expect(back.cases).toMatchObject({ unicase: 'upper', capAccentOffset: -15, nudges: { 'Á': { dx: 4, dy: 2 } } });
    expect(back.glyphs.a.derived).toMatchObject({ kind: 'unicase', from: 'A' });
    expect(back.glyphs.a.outline).toBe(back.glyphs.A.outline);
    expect(inkOutline(back.glyphs['Á'], m)).toEqual(inkOutline(p.styles[0].glyphs['Á'], m));
  });
});

/* ---------------------------------------------------------- exportação */

function exportProject(cases: object = {}, drawnLower = true): Project {
  const p = newProject();
  p.family = 'Acentos Teste';
  const a = asChar(letter('o'), 'a');
  const c = asChar(letter('o'), 'c');
  const { style } = styleWith([...basic(), ...(drawnLower ? [a] : []), c, acute(), cedilla()], cases);
  p.styles[0] = style;
  return p;
}

describe('exportação com acentos e unicase', () => {
  it('OTF: Á, á e ç com os códigos e os nomes certos', () => {
    const p = exportProject();
    const font = opentype.parse(buildOtf(p, p.styles[0]).buffer);
    for (const [ch, name] of [['Á', 'Aacute'], ['á', 'aacute'], ['ç', 'ccedilla'], ['´', 'acute'], ['¸', 'cedilla']]) {
      const g = font.charToGlyph(ch);
      expect(font.charToGlyphIndex(ch)).toBeGreaterThan(0);
      expect(g.name).toBe(name);
      expect(g.unicodes).toContain(ch.codePointAt(0));
    }
    expect(font.charToGlyph('Á').advanceWidth).toBe(font.charToGlyph('A').advanceWidth);
    // O acento passa da altura das maiúsculas: a métrica do Windows cobre.
    expect(font.tables.os2.usWinAscent as number).toBeGreaterThanOrEqual(760);
  });

  it('OTF unicase: a aponta para o glifo do A, com o mesmo kerning', () => {
    const p = exportProject({ unicase: 'upper' }, false);
    const style = p.styles[0];
    style.kerning.auto = { 'A|V': -80 };
    const font = opentype.parse(buildOtf(p, style).buffer);
    const A = font.charToGlyphIndex('A');
    expect(font.charToGlyphIndex('a')).toBe(A);
    expect(font.charToGlyph('A').unicodes).toEqual(expect.arrayContaining([0x41, 0x61]));
    expect(font.charToGlyphIndex('á')).toBe(font.charToGlyphIndex('Á'));
    expect(font.getKerningValue(font.charToGlyph('a'), font.charToGlyph('V'))).toBe(-80);
    expect(font.getKerningValue(font.charToGlyph('Á'), font.charToGlyph('V'))).toBe(-80);
  });

  it('TTF: acentuados e unicase sobrevivem à conversão', async () => {
    const p = exportProject({ unicase: 'upper' }, false);
    const style = p.styles[0];
    style.kerning.auto = { 'A|V': -80 };
    const ttf = opentype.parse((await buildTtf(p, style)).buffer);
    for (const ch of ['Á', 'á', 'ç', '´']) expect(ttf.charToGlyphIndex(ch)).toBeGreaterThan(0);
    expect(ttf.charToGlyphIndex('a')).toBe(ttf.charToGlyphIndex('A'));
    expect(ttf.getKerningValue(ttf.charToGlyph('a'), ttf.charToGlyph('V'))).toBe(-80);
    expect(ttf.charToGlyph('Á').advanceWidth).toBe(ttf.charToGlyph('A').advanceWidth);
  });
});
