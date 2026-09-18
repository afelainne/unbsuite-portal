import { describe, it, expect } from 'vitest';
import {
  normalizeColor, collectSvgColors, extractSvgPalette, dominantColor,
  relativeLuminance, isLightColor, contrastRatio, colorSaturation, isAchromatic,
  NEUTRAL_PALETTE, MAX_PALETTE_SWATCHES,
} from '../lib/brandsheet-palette';

describe('normalização de cor', () => {
  it('entende hex curto, longo, com alfa, rgb e nome', () => {
    expect(normalizeColor('#abc')).toBe('#AABBCC');
    expect(normalizeColor('#AaBbCc')).toBe('#AABBCC');
    expect(normalizeColor('#aabbccdd')).toBe('#AABBCC');
    expect(normalizeColor('rgb(17, 34, 51)')).toBe('#112233');
    expect(normalizeColor('rgba(17,34,51,0.5)')).toBe('#112233');
    expect(normalizeColor('rgb(100%, 0%, 0%)')).toBe('#FF0000');
    expect(normalizeColor('black')).toBe('#000000');
    expect(normalizeColor('  WHITE ')).toBe('#FFFFFF');
  });

  it('descarta o que não é cor', () => {
    for (const value of ['none', 'transparent', 'currentColor', 'url(#grad)', 'inherit', '', '#12', 'salmãozinho', null, undefined]) {
      expect(normalizeColor(value as string), String(value)).toBeNull();
    }
  });
});

describe('leitura das cores do arquivo', () => {
  const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect fill="#112233" stroke="none" width="10" height="10"/>
    <rect fill='#112233' width="10" height="10"/>
    <path style="fill:#445566;stroke:#112233" d="M0 0h10"/>
    <circle fill="url(#grad)" stroke="currentColor" r="4"/>
  </svg>`;

  it('conta cada aparição, de atributo e de style', () => {
    const counts = collectSvgColors(SVG);
    expect(counts.get('#112233')).toBe(3);
    expect(counts.get('#445566')).toBe(1);
    expect(counts.has('none')).toBe(false);
    expect(collectSvgColors('').size).toBe(0);
    expect(collectSvgColors(null).size).toBe(0);
  });

  it('ordena da cor mais usada para a menos usada', () => {
    const palette = extractSvgPalette(SVG);
    expect(palette.map(s => s.hex)).toEqual(['#112233', '#445566']);
    expect(palette[0].role).toBe('brand');
    expect(palette[0].weight).toBe(3);
    expect(palette[0].label).toBe('#112233');
  });

  it('nunca passa de seis amostras', () => {
    const many = Array.from({ length: 12 }, (_, i) => `<rect fill="#${(i + 1).toString(16).padStart(2, '0')}44ff"/>`).join('');
    expect(extractSvgPalette(`<svg>${many}</svg>`).length).toBe(MAX_PALETTE_SWATCHES);
  });

  it('logo monocromático cai no trio neutro', () => {
    const mono = '<svg><path fill="#000000" d="M0 0h10"/><path fill="#555555" d="M0 0h10"/></svg>';
    expect(extractSvgPalette(mono).map(s => s.hex)).toEqual(['#000000', '#FFFFFF', '#AAA9AB']);
    expect(extractSvgPalette(mono).every(s => s.role === 'neutral')).toBe(true);
    expect(extractSvgPalette('<svg><path d="M0 0h10"/></svg>')).toEqual(NEUTRAL_PALETTE);
    expect(extractSvgPalette(null)).toEqual(NEUTRAL_PALETTE);
  });

  it('a dominante é a primeira cor de marca, com queda para o cinza', () => {
    expect(dominantColor(extractSvgPalette(SVG))).toBe('#112233');
    expect(dominantColor(NEUTRAL_PALETTE)).toBe('#AAA9AB');
    expect(dominantColor([])).toBe('#AAA9AB');
    expect(dominantColor(null)).toBe('#AAA9AB');
  });
});

describe('contraste', () => {
  it('mede luminância e contraste como manda a WCAG', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 6);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 6);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 6);
  });

  it('separa fundo claro de fundo escuro', () => {
    expect(isLightColor('#FFFFFF')).toBe(true);
    expect(isLightColor('#AAA9AB')).toBe(true);
    // cinza médio ainda pede tinta preta
    expect(isLightColor('#808080')).toBe(true);
    expect(isLightColor('#000000')).toBe(false);
    expect(isLightColor('#112233')).toBe(false);
    expect(isLightColor('#1C1C1E')).toBe(false);
  });

  it('reconhece cinza', () => {
    expect(colorSaturation('#808080')).toBe(0);
    expect(isAchromatic('#1C1C1E')).toBe(true);
    expect(isAchromatic('#112233')).toBe(false);
  });
});
