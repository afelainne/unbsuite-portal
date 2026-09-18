import { describe, expect, it } from 'vitest';
import * as opentype from 'opentype.js';
import type { Project } from '../lib/types';
import { buildOtf, buildTtf, fontNames, styleTraits } from '../lib/font';
import { autoSpace } from '../lib/spacing';
import { autoKern } from '../lib/kerning';
import { advanceOf } from '../lib/outline';
import { newProject, newStyle, parseProject, rescaleUpm, serializeProject } from '../lib/project';
import { readSfnt } from '../lib/sfnt';
import { letter } from './fixtures';

function project(): Project {
  const p = newProject();
  p.family = 'Teste Sans';
  const style = p.styles[0];
  const glyphs = Object.fromEntries(['H', 'O', 'A', 'V', 'T', 'n', 'o', 'x'].map(c => [c, letter(c)]));
  glyphs['Á'] = { ...glyphs.A, char: 'Á' };
  style.glyphs = autoSpace(glyphs, p.metrics, style.spacing);
  style.kerning.auto = autoKern(style.glyphs, p.metrics, style.kerning.settings).pairs;
  return p;
}

const kerning = (font: opentype.Font, a: string, b: string) => font.getKerningValue(font.charToGlyph(a), font.charToGlyph(b));

describe('fonte montada', () => {
  const p = project();
  const style = p.styles[0];
  const built = buildOtf(p, style);
  const font = opentype.parse(built.buffer);

  it('tem os caracteres, as larguras e as métricas declaradas', () => {
    for (const c of ['H', 'O', 'A', 'V', 'T', 'n', 'o', 'x', 'Á', ' ']) expect(font.charToGlyphIndex(c)).toBeGreaterThan(0);
    for (const c of ['H', 'O', 'A', 'o']) expect(font.charToGlyph(c).advanceWidth).toBe(advanceOf(style.glyphs[c], p.metrics));
    expect(font.charToGlyph(' ').advanceWidth).toBe(p.metrics.spaceWidth);
    expect(font.unitsPerEm).toBe(1000);
    expect(font.ascender).toBe(p.metrics.ascender);
    expect(font.tables.hhea.lineGap).toBe(p.metrics.lineGap);
    expect(font.tables.os2.sTypoLineGap).toBe(p.metrics.lineGap);
    expect(font.tables.os2.sCapHeight).toBe(p.metrics.capHeight);
    expect(font.names.fontFamily.en).toBe('Teste Sans');
    expect(font.names.fontSubfamily.en).toBe('Regular');
  });

  it('o contorno do arquivo é o desenho mais a margem', () => {
    const g = font.charToGlyph('H');
    const pts = g.path.commands.filter(c => c.type !== 'Z').map(c => [(c as { x: number }).x, (c as { y: number }).y]);
    const lsb = style.glyphs.H.lsb;
    expect(pts).toContainEqual([lsb, 0]);
    expect(pts).toContainEqual([lsb + 500, 700]);
    expect(pts).toContainEqual([lsb + 100, 380]);
  });

  it('o kerning chega ao arquivo em GPOS e na tabela kern, com as classes', () => {
    const av = style.kerning.auto['A|V'];
    expect(av).toBeLessThan(0);
    expect(kerning(font, 'A', 'V')).toBe(av);
    expect(kerning(font, 'Á', 'V')).toBe(av);
    expect(kerning(font, 'H', 'H')).toBe(0);
    const tags = readSfnt(built.buffer).tables.map(t => t.tag);
    expect(tags).toContain('GPOS');
    expect(tags).toContain('kern');
  });

  it('TTF sai do mesmo desenho, com quadráticas e o mesmo kerning', async () => {
    const ttf = await buildTtf(p, style);
    const f = opentype.parse(ttf.buffer);
    expect(readSfnt(ttf.buffer).tables.map(t => t.tag)).toEqual(expect.arrayContaining(['glyf', 'loca', 'GPOS', 'kern']));
    expect(f.charToGlyph('O').advanceWidth).toBe(advanceOf(style.glyphs.O, p.metrics));
    expect(kerning(f, 'A', 'V')).toBe(style.kerning.auto['A|V']);
    expect(f.charToGlyph('O').path.commands.some(c => c.type === 'Q')).toBe(true);
  });
});

describe('nomes e estilos', () => {
  it('lê peso e itálico do nome do estilo', () => {
    expect(styleTraits('Bold Italic')).toEqual({ weight: 700, italic: true });
    expect(styleTraits('SemiBold')).toEqual({ weight: 600, italic: false });
    expect(styleTraits('Light')).toEqual({ weight: 300, italic: false });
  });

  it('estilos fora de Regular/Bold/Italic entram como família própria no nome antigo', () => {
    const n = fontNames('Teste', 'Light Italic');
    expect(n.family).toBe('Teste Light');
    expect(n.subfamily).toBe('Italic');
    expect(n.typoFamily).toBe('Teste');
    expect(n.typoSubfamily).toBe('Light Italic');
    expect(n.postScript).toBe('Teste-LightItalic');
    expect(fontNames('Teste', 'Bold').family).toBe('Teste');
  });

  it('um Bold de verdade leva os bits de negrito', () => {
    const p = project();
    const bold = { ...newStyle('Bold'), glyphs: p.styles[0].glyphs };
    const f = opentype.parse(buildOtf(p, bold).buffer);
    expect(f.tables.os2.usWeightClass).toBe(700);
    expect((f.tables.os2.fsSelection as number) & 32).toBe(32);
    expect((f.tables.head.macStyle as number) & 1).toBe(1);
  });
});

describe('projeto', () => {
  it('salva e abre sem perder nada', () => {
    const p = project();
    p.styles[0].kerning.manual['T|o'] = -80;
    const back = parseProject(serializeProject(p));
    expect(back).toEqual(p);
  });

  it('recusa arquivo estranho e descarta campos inválidos', () => {
    expect(() => parseProject('{}')).toThrow();
    expect(() => parseProject('nada')).toThrow();
    const back = parseProject(JSON.stringify({ version: 1, styles: [{ name: 'X', glyphs: { AB: {}, Z: { outline: [{ type: 'M', x: 'a' }, { type: 'L', x: 1, y: 2 }] } } }] }));
    expect(Object.keys(back.styles[0].glyphs)).toEqual(['Z']);
    expect(back.styles[0].glyphs.Z.outline).toEqual([{ type: 'L', x: 1, y: 2 }]);
  });

  it('mudar a UPM reescala métricas, margens e kerning', () => {
    const p = project();
    const q = rescaleUpm(p, 2000);
    expect(q.metrics.capHeight).toBe(1400);
    expect(q.styles[0].glyphs.H.lsb).toBe(p.styles[0].glyphs.H.lsb * 2);
    expect(q.styles[0].kerning.auto['A|V']).toBe(p.styles[0].kerning.auto['A|V'] * 2);
    expect(advanceOf(q.styles[0].glyphs.H, q.metrics)).toBe(advanceOf(p.styles[0].glyphs.H, p.metrics) * 2);
  });
});
