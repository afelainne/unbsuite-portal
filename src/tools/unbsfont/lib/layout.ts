import type { FontStyle, Glyph, Metrics } from './types';
import { advanceOf } from './outline';
import { kernValue, type KerningClasses } from './kerning';

const NBSP = String.fromCharCode(0xa0);

/**
 * Composição de texto com os mesmos números que vão para o arquivo: largura de
 * avanço de cada glifo e kerning do par (manual por cima do automático, pela
 * classe). As telas de espaço, kerning e teste desenham a partir daqui.
 */

export interface PlacedGlyph {
  char: string;
  glyph?: Glyph;
  x: number;
  advance: number;
  /** Kerning aplicado entre este glifo e o anterior. */
  kern: number;
}

export interface TextLine { items: PlacedGlyph[]; width: number }

export function layoutText(text: string, style: FontStyle, m: Metrics, classes: KerningClasses | null): TextLine[] {
  return text.split('\n').map(line => {
    const items: PlacedGlyph[] = [];
    let x = 0;
    let prev: string | null = null;
    for (const char of Array.from(line)) {
      const glyph = style.glyphs[char];
      const drawn = glyph && glyph.outline.length ? glyph : undefined;
      const advance = char === ' ' || char === NBSP ? m.spaceWidth : drawn ? advanceOf(drawn, m) : m.unitsPerEm * 0.5;
      const kern = classes && prev && drawn && style.glyphs[prev]?.outline.length ? kernValue(style.kerning, classes, prev, char) : 0;
      x += kern;
      items.push({ char, glyph: drawn, x, advance, kern });
      x += advance;
      prev = drawn ? char : null;
    }
    return { items, width: x };
  });
}
