import { describe, it, expect } from 'vitest';
import { normalizeColorToHex, clusterPixels, extractColorsFromSvg, extractDominantColors } from '../utils/imageExtraction';

describe('normalizeColorToHex', () => {
  it.each([
    ['#abc', '#AABBCC'],
    ['#ABCD', '#AABBCC'], // #RGBA
    ['#a1b2c3', '#A1B2C3'],
    ['#a1b2c380', '#A1B2C3'], // #RRGGBBAA
    ['#FF0000 !important', '#FF0000'],
    ['rgb(255, 0, 0)', '#FF0000'],
    ['rgba(0,128,255,0.5)', '#0080FF'],
    ['rgb(0 128 255 / 50%)', '#0080FF'], // CSS4 space syntax
    ['rgb(100%, 0%, 50%)', '#FF0080'],
    ['rgb(300, -5, 12.6)', '#FF000D'], // clamped + rounded (bug: produced invalid hex)
    ['Tomato', '#FF6347']
  ])('%s -> %s', (input, expected) => {
    expect(normalizeColorToHex(input)).toBe(expected);
  });

  it.each(['#zzzzzz', '#12345', 'none', 'url(#grad)', 'currentColor', 'rgb(1,2)', 'hsl(0 50% 50%)', ''])(
    'rejects %j (bug: "#zzzzzz" used to be accepted)',
    (input) => {
      expect(normalizeColorToHex(input)).toBeNull();
    }
  );
});

describe('extractColorsFromSvg', () => {
  it('collects attributes, inline styles and <style> rules, deduped', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <style>.a { fill: #00f; } .b { stroke: rgb(0 255 0) }</style>
      <rect fill="#FF0000" stroke="none"/>
      <circle style="fill:#ff0000;stroke:#zzzzzz"/>
      <stop stop-color="rgb(400,0,0)"/>
    </svg>`;
    expect(extractColorsFromSvg(svg).sort()).toEqual(['#0000FF', '#00FF00', '#FF0000']);
  });

  it('returns [] for invalid SVG', () => {
    const warn = console.warn;
    console.warn = () => {};
    expect(extractColorsFromSvg('<svg><rect></svg')).toEqual([]);
    console.warn = warn;
  });
});

describe('clusterPixels', () => {
  const px = (...colors: [number, number, number, number][]) => Uint8ClampedArray.from(colors.flat());

  it('ranks clusters by frequency and ignores transparent pixels', () => {
    const data = px(
      [255, 0, 0, 255],
      [250, 5, 0, 255],
      [252, 2, 3, 255],
      [0, 0, 255, 255],
      [0, 255, 0, 0] // transparent
    );
    const res = clusterPixels(data, 5);
    expect(res).toHaveLength(2);
    expect(res[1]).toBe('#0000FF');
    expect(res[0].startsWith('#FC') || res[0].startsWith('#FD')).toBe(true);
  });

  it('respects maxColors and ignores a trailing partial pixel', () => {
    const data = Uint8ClampedArray.from([255, 0, 0, 255, 0, 0, 255, 255, 0, 255, 0, 255, 9, 9]);
    expect(clusterPixels(data, 2)).toHaveLength(2);
    expect(clusterPixels(data, 0)).toEqual([]);
  });
});

describe('extractDominantColors', () => {
  it('rejects non-image files with an Error (bug: rejected with plain strings / events)', async () => {
    const file = new File(['hello'], 'a.txt', { type: 'text/plain' });
    await expect(extractDominantColors(file)).rejects.toBeInstanceOf(Error);
  });
});
