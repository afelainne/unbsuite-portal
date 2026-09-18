import { describe, expect, it } from 'vitest';
import { detectBaselines, measureGuides, mergeWithNext, pastedGlyph, readSheet, sheetGroups, sheetToGlyphs, sourceCapHeight, splitGroup } from '../lib/sheet';
import { sequenceChars } from '../lib/charset';
import { inkOutline, placedOutline } from '../lib/outline';
import { cmdPoints, flatten, signedArea, splitContours } from '../lib/geometry';
import { DEFAULT_METRICS } from '../lib/project';
import { LETTERS, SHEET_SEQUENCE, syntheticSheet } from './fixtures';

const chars = sequenceChars(SHEET_SEQUENCE);

describe('folha de caracteres', () => {
  const sheet = readSheet(syntheticSheet());

  it('agrupa peças soltas no mesmo glifo (i, j, %, ;, aspas, T em duas formas)', () => {
    expect(sheet.rows.length).toBe(2);
    expect(sheet.rows.map(r => r.groups.length)).toEqual([5, 8]);
    const counts = sheetGroups(sheet).map(g => g.components.length);
    // H O A V T(2 formas) | n o x i(2) j(2) %(3) ;(2) "(2)
    expect(counts).toEqual([1, 1, 1, 1, 2, 1, 1, 1, 2, 2, 3, 2, 2]);
    expect(sheet.strokeOnly).toBe(1);
  });

  it('numa linha só de sinais, o trema e as aspas ficam num glifo só', () => {
    // Linha de letras de referência, depois ´ ¨ ˜ " ` numa linha própria: os pingos
    // do trema têm a altura da linha de sinais, mas são pequenos perto das letras.
    const rect = (x: number, y: number, w: number, h: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3000 2000">' +
      rect(100, 100, 500, 700) + rect(750, 100, 500, 700) + rect(1400, 100, 500, 700) +
      rect(100, 1700, 90, 120) +                       // ´
      rect(400, 1700, 70, 70) + rect(510, 1700, 70, 70) + // ¨
      rect(800, 1700, 220, 60) +                       // ˜
      rect(1200, 1700, 60, 120) + rect(1310, 1700, 60, 120) + // "
      rect(1600, 1700, 90, 120) +                      // `
      '</svg>';
    const s = readSheet(svg);
    expect(s.rows.map(r => r.groups.length)).toEqual([3, 5]);
    expect(s.rows[1].groups.map(g => g.components.length)).toEqual([1, 2, 1, 2, 1]);
  });

  it('ordena em ordem de leitura e casa com a sequência', () => {
    expect(chars.join('')).toBe('HOAVTnoxij%;"');
    const lefts = sheet.rows.map(r => r.groups.map(g => g.box.x0));
    lefts.forEach(row => expect([...row].sort((a, b) => a - b)).toEqual(row));
    expect(sheet.rows[0].groups[0].box.y1).toBeLessThan(sheet.rows[1].groups[0].box.y0);
  });

  it('acha a linha de base de cada linha, apesar de descendentes e pontuação', () => {
    const s = detectBaselines(sheet, chars);
    expect(s.rows[0].baseline).toBeCloseTo(800, 6);
    expect(s.rows[1].baseline).toBeCloseTo(1800, 6);
  });

  it('lê as guias pelas letras de referência', () => {
    const s = detectBaselines(sheet, chars);
    const guides = measureGuides(s, chars);
    expect(guides.cap).toBeCloseTo(700, 6);
    expect(guides.x).toBeCloseTo(500, 6);
    expect(guides.desc).toBeCloseTo(200, 6);
    expect(guides.asc).toBeUndefined();
    expect(sourceCapHeight(guides, s)).toBeCloseTo(700, 6);
  });

  it('junta e separa grupos à mão', () => {
    const first = sheet.rows[0].groups[0].id;
    const merged = mergeWithNext(sheet, first);
    expect(merged.rows[0].groups.length).toBe(4);
    const split = splitGroup(merged, first);
    expect(split.rows[0].groups.length).toBe(5);
  });
});

describe('preservação do desenho', () => {
  const sheet = detectBaselines(readSheet(syntheticSheet()), chars);
  const glyphs = Object.fromEntries(sheetToGlyphs(sheet, chars, 700).map(g => [g.char, g]));

  it('o H chega com exatamente os mesmos pontos do desenho', () => {
    expect(cmdPoints(glyphs.H.outline)).toEqual(LETTERS.H.polys[0]);
  });

  it('entre folha e fonte só há escala e translação', () => {
    const m = { ...DEFAULT_METRICS, capHeight: 1400 };
    const g = { ...glyphs.H, lsb: 37, yOffset: 5 };
    const expected = LETTERS.H.polys[0].map(([x, y]) => [x * 2 + 37, y * 2 + 5]);
    expect(cmdPoints(placedOutline(g, m))).toEqual(expected);
    const ink = cmdPoints(inkOutline(g, m));
    ink.forEach(([x, y], i) => {
      expect(x).toBeCloseTo(LETTERS.H.polys[0][i][0] * 2, 9);
      expect(y).toBeCloseTo(LETTERS.H.polys[0][i][1] * 2 + 5, 9);
    });
  });

  it('curvas continuam curvas e furos ficam no sentido oposto do contorno externo', () => {
    for (const c of ['O', 'o', 'A']) {
      const contours = splitContours(glyphs[c].outline);
      expect(contours.length).toBe(2);
      const areas = contours.map(k => signedArea(flatten(k)));
      expect(areas[0]).toBeGreaterThan(0);
      expect(areas[1]).toBeLessThan(0);
    }
    expect(glyphs.O.outline.some(c => c.type === 'C')).toBe(true);
  });
});

describe('glifo colado', () => {
  it('põe o pé na linha de base e usa a escala da folha', () => {
    const { glyph } = pastedGlyph('<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="20" width="50" height="350"/></svg>', 'I', DEFAULT_METRICS, 350);
    const pts = cmdPoints(glyph.outline);
    expect(Math.min(...pts.map(p => p[1]))).toBe(0);
    expect(Math.max(...pts.map(p => p[1]))).toBe(350);
    expect(Math.min(...pts.map(p => p[0]))).toBe(0);
    expect(glyph.srcCap).toBe(350);
  });

  it('pendura descendentes pela altura-x', () => {
    const { glyph } = pastedGlyph('<svg xmlns="http://www.w3.org/2000/svg"><rect width="50" height="700"/></svg>', 'p', DEFAULT_METRICS, 700);
    const ys = cmdPoints(glyph.outline).map(p => p[1]);
    expect(Math.max(...ys)).toBeCloseTo(DEFAULT_METRICS.xHeight, 6);
    expect(Math.min(...ys)).toBeCloseTo(DEFAULT_METRICS.xHeight - 700, 6);
  });
});
