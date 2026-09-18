import { describe, it, expect } from 'vitest';
import {
  slugifyColorName,
  prepareSwatches,
  toCssVariables,
  toTailwindConfig,
  toDesignTokens,
  toDesignTokensJson,
  toGpl,
  toAse,
  parseAse,
  exportPalette,
  PALETTE_EXPORT_FORMATS,
  type PaletteSwatch
} from '../utils/paletteExport';

const palette: PaletteSwatch[] = [
  { name: 'Primary Yellow', hex: '#F7E043' },
  { name: 'Ink', hex: '1a1a1a' },
  { name: 'Ink', hex: '#fff' },
  { name: 'Açaí Roxo', hex: '#4B0082' },
  { name: 'broken', hex: 'nope' }
];

describe('naming', () => {
  it('slugifies to safe kebab-case', () => {
    expect(slugifyColorName('Primary Yellow')).toBe('primary-yellow');
    expect(slugifyColorName('brandBlue')).toBe('brand-blue');
    expect(slugifyColorName('Açaí Roxo!!')).toBe('acai-roxo');
    expect(slugifyColorName('100 C')).toBe('color-100-c');
    expect(slugifyColorName('***')).toBe('color');
  });

  it('dedupes names and drops invalid hex', () => {
    expect(prepareSwatches(palette).map((s) => [s.slug, s.hex])).toEqual([
      ['primary-yellow', '#F7E043'],
      ['ink', '#1A1A1A'],
      ['ink-2', '#FFFFFF'],
      ['acai-roxo', '#4B0082']
    ]);
  });
});

describe('CSS variables', () => {
  it('hex (default)', () => {
    expect(toCssVariables(palette)).toBe(
      ':root {\n  --color-primary-yellow: #F7E043;\n  --color-ink: #1A1A1A;\n  --color-ink-2: #FFFFFF;\n  --color-acai-roxo: #4B0082;\n}\n'
    );
  });
  it('rgb / oklch / custom prefix & selector', () => {
    const css = toCssVariables([{ name: 'Red', hex: '#FF0000' }], { prefix: 'Brand', selector: '.theme', format: 'rgb' });
    expect(css).toBe('.theme {\n  --brand-red: rgb(255 0 0);\n}\n');
    expect(toCssVariables([{ name: 'Red', hex: '#FF0000' }], { prefix: '', format: 'oklch' })).toContain(
      '--red: oklch(62.8% 0.2577 29.23);'
    );
  });
});

describe('Tailwind', () => {
  it('v4 @theme with flat and scale groups', () => {
    const out = toTailwindConfig({ brand: { 50: '#EFF6FF', 500: '#3b82f6' }, 'Accent Color': '#f00', bad: 'x' });
    expect(out).toContain('@theme {');
    expect(out).toContain('  --color-brand-50: #EFF6FF;');
    expect(out).toContain('  --color-brand-500: #3B82F6;');
    expect(out).toContain('  --color-accent-color: #FF0000;');
    expect(out).not.toContain('bad');
  });

  it('v3 config is valid JS and evaluates to the palette', () => {
    const out = toTailwindConfig(
      [...palette, { name: 'Scale', hex: '#000' }],
      { version: 3 }
    );
    const module = { exports: {} as any };
    new Function('module', out)(module);
    expect(module.exports.theme.extend.colors).toEqual({
      'primary-yellow': '#F7E043',
      ink: '#1A1A1A',
      'ink-2': '#FFFFFF',
      'acai-roxo': '#4B0082',
      scale: '#000000'
    });
    const nested = toTailwindConfig({ brand: { 50: '#EFF6FF', 950: '#172554' } }, { version: 3 });
    const m2 = { exports: {} as any };
    new Function('module', nested)(m2);
    expect(m2.exports.theme.extend.colors.brand).toEqual({ 50: '#EFF6FF', 950: '#172554' });
  });
});

describe('W3C design tokens (DTCG)', () => {
  it('2025.10 color object format', () => {
    const tokens = toDesignTokens([{ name: 'Primary Yellow', hex: '#F7E043' }]) as any;
    expect(tokens.color.$type).toBe('color');
    expect(tokens.color['primary-yellow']).toEqual({
      $type: 'color',
      $value: { colorSpace: 'srgb', components: [0.9686, 0.8784, 0.2627], alpha: 1, hex: '#f7e043' },
      $description: 'Primary Yellow'
    });
  });

  it('legacy hex format, scale groups inherit $type, no wrapper group', () => {
    const tokens = toDesignTokens({ blue: { 500: '#3B82F6' }, red: '#F00' }, { valueFormat: 'hex', group: '' }) as any;
    expect(tokens.blue).toEqual({ $type: 'color', 500: { $value: '#3b82f6' } });
    expect(tokens.red).toEqual({ $type: 'color', $value: '#ff0000' });
  });

  it('JSON output parses and token names never start with $', () => {
    const json = toDesignTokensJson(palette, { description: 'My "palette"' });
    const parsed = JSON.parse(json);
    expect(parsed.color.$description).toBe('My "palette"');
    const walk = (o: any) => {
      for (const k of Object.keys(o)) {
        if (k.startsWith('$')) continue;
        expect(k).not.toMatch(/[{}.]/);
        if (o[k] && typeof o[k] === 'object') walk(o[k]);
      }
    };
    walk(parsed);
  });
});

describe('GIMP palette', () => {
  it('writes a valid .gpl', () => {
    const out = toGpl([{ name: 'Red\tOne', hex: '#FF0000' }, { name: 'Ink', hex: '#1A1A1A' }], { name: 'Test\nPal' });
    expect(out).toBe('GIMP Palette\nName: Test Pal\nColumns: 2\n#\n255   0   0\tRed One\n 26  26  26\tInk\n');
  });
});

describe('Adobe Swatch Exchange', () => {
  it('writes a spec-conformant header and blocks', () => {
    const bytes = toAse([{ name: 'Red', hex: '#FF0000' }]);
    const view = new DataView(bytes.buffer);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('ASEF');
    expect(view.getUint16(4)).toBe(1);
    expect(view.getUint16(6)).toBe(0);
    expect(view.getUint32(8)).toBe(1); // one block
    expect(view.getUint16(12)).toBe(0x0001); // color entry
    // block length = 2 (name len) + 8 ("Red" + NUL, UTF-16) + 4 (model) + 12 (3 floats) + 2 (type)
    expect(view.getUint32(14)).toBe(28);
    expect(bytes.length).toBe(12 + 6 + 28);
    expect(view.getUint16(18)).toBe(4); // "Red" + terminator
    expect(String.fromCharCode(...bytes.slice(28, 32))).toBe('RGB ');
    expect(view.getFloat32(32)).toBe(1);
    expect(view.getFloat32(36)).toBe(0);
  });

  it('round-trips RGB / CMYK / LAB with groups and unicode names', () => {
    const swatches = [
      { name: 'Açaí', hex: '#4B0082' },
      { name: 'Yellow', hex: '#F7E043' },
      { name: 'Black', hex: '#000000' }
    ];
    const rgb = parseAse(toAse(swatches, { groupName: 'Brand', colorType: 'spot' }));
    expect(rgb.map((s) => [s.name, s.hex, s.model, s.type, s.group])).toEqual([
      ['Açaí', '#4B0082', 'RGB', 'spot', 'Brand'],
      ['Yellow', '#F7E043', 'RGB', 'spot', 'Brand'],
      ['Black', '#000000', 'RGB', 'spot', 'Brand']
    ]);

    const cmyk = parseAse(toAse(swatches, { model: 'CMYK' }));
    expect(cmyk.every((s) => s.model === 'CMYK' && s.values.length === 4)).toBe(true);
    expect(cmyk[2].hex).toBe('#000000');

    const lab = parseAse(toAse(swatches, { model: 'LAB' }).buffer);
    expect(lab.map((s) => s.hex)).toEqual(swatches.map((s) => s.hex));
  });

  it('parseAse rejects malformed data', () => {
    expect(() => parseAse(new Uint8Array([1, 2, 3]))).toThrow();
    expect(() => parseAse(new TextEncoder().encode('NOPE00000000'))).toThrow(/signature/);
    const good = toAse([{ name: 'Red', hex: '#FF0000' }]);
    expect(() => parseAse(good.slice(0, good.length - 4))).toThrow(/exceeds|unexpected/);
  });
});

describe('exportPalette', () => {
  it('returns blobs with the registered MIME type', async () => {
    for (const format of Object.keys(PALETTE_EXPORT_FORMATS) as (keyof typeof PALETTE_EXPORT_FORMATS)[]) {
      const blob = exportPalette(palette, format, 'Test');
      expect(blob.type).toBe(PALETTE_EXPORT_FORMATS[format].mime);
      expect(blob.size).toBeGreaterThan(0);
    }
    const ase = exportPalette(palette, 'ase', 'Test');
    const buf = await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(ase);
    });
    expect(parseAse(buf)).toHaveLength(4);
  });
});
