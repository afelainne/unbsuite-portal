import { describe, it, expect } from 'vitest';
import { parseACB, stripLocalizationKey } from '../utils/acbParser';

type Rec = { name: string; code?: string; components: number[] };

/** Builds a standard (v1, UTF-16 strings, 8-bit components) Adobe Color Book. */
const buildAcb = (opts: {
  title: string;
  prefix?: string;
  suffix?: string;
  description?: string;
  colorSpace: 0 | 2 | 7;
  records: Rec[];
  truncateBy?: number;
}): ArrayBuffer => {
  const bytes: number[] = [];
  const u8 = (v: number) => bytes.push(v & 0xff);
  const u16 = (v: number) => {
    u8(v >> 8);
    u8(v);
  };
  const u32 = (v: number) => {
    u16(v >>> 16);
    u16(v & 0xffff);
  };
  const ustr = (s: string) => {
    u32(s.length);
    for (let i = 0; i < s.length; i++) u16(s.charCodeAt(i));
  };
  '8BCB'.split('').forEach((c) => u8(c.charCodeAt(0)));
  u16(1); // version
  u16(3000); // id
  ustr(opts.title);
  ustr(opts.prefix ?? '');
  ustr(opts.suffix ?? '');
  ustr(opts.description ?? '');
  u16(opts.records.length);
  u16(7); // page size
  u16(0); // page selector
  u16(opts.colorSpace);
  for (const r of opts.records) {
    ustr(r.name);
    (r.code ?? 'ABCDEF').padEnd(6, ' ').slice(0, 6).split('').forEach((c) => u8(c.charCodeAt(0)));
    r.components.forEach(u8);
  }
  'spflspot'.split('').forEach((c) => u8(c.charCodeAt(0)));
  const arr = Uint8Array.from(bytes.slice(0, bytes.length - (opts.truncateBy ?? 0)));
  return arr.buffer;
};

describe('parseACB', () => {
  it('reads RGB books with EMPTY unicode strings (bug: empty strings were read as 1-byte Pascal strings)', async () => {
    const buf = buildAcb({
      title: 'My Book',
      prefix: '',
      suffix: '',
      description: '',
      colorSpace: 0,
      records: [
        { name: 'Red', components: [255, 0, 0] },
        { name: 'Teal', components: [0, 128, 128] }
      ]
    });
    const res = await parseACB(buf);
    expect(res.name).toBe('My Book');
    expect(res.colors.map((c) => [c.code, c.hex])).toEqual([
      ['Red', '#FF0000'],
      ['Teal', '#008080']
    ]);
    expect(res.colors[1].rgb).toEqual({ r: 0, g: 128, b: 128 });
  });

  it('strips $$$ localization keys and joins prefix/suffix', async () => {
    const buf = buildAcb({
      title: '$$$/colorbook/TEST/title=Test Solid Coated',
      prefix: '$$$/colorbook/TEST/prefix=TEST',
      suffix: '$$$/colorbook/TEST/suffix=C',
      description: '$$$/colorbook/TEST/description=Copyright',
      colorSpace: 7,
      records: [{ name: '100', components: [Math.round(53.24 * 2.55), 128 + 80, 128 + 67] }]
    });
    const res = await parseACB(buf);
    expect(res.name).toBe('Test Solid Coated');
    expect(res.colors[0].code).toBe('TEST 100 C');
    expect(res.colors[0].name).toBe('100');
    // Lab (53.3, 80, 67) is ~pure red
    const { r, g, b } = res.colors[0].rgb;
    expect(r).toBeGreaterThan(245);
    expect(g).toBeLessThan(20);
    expect(b).toBeLessThan(20);
  });

  it('keeps real black swatches (bug: #000000 was treated as empty data)', async () => {
    const buf = buildAcb({
      title: 'CMYK',
      colorSpace: 2,
      // stored inverted: 255 = 0% ink, 0 = 100% ink
      records: [
        { name: 'Rich Black', components: [255, 255, 255, 0] },
        { name: 'Cyan', components: [0, 255, 255, 255] }
      ]
    });
    const res = await parseACB(buf);
    expect(res.colors.map((c) => c.hex)).toEqual(['#000000', '#00FFFF']);
  });

  it('skips nameless placeholder records', async () => {
    const buf = buildAcb({
      title: 'Pad',
      colorSpace: 0,
      records: [
        { name: '', components: [0, 0, 0] },
        { name: 'Blue', components: [0, 0, 255] }
      ]
    });
    const res = await parseACB(buf);
    expect(res.colors.map((c) => c.name)).toEqual(['Blue']);
  });

  it('rejects bad signature and truncated files with a clear error', async () => {
    await expect(parseACB(new TextEncoder().encode('XXXXxxxxxxxx').buffer)).rejects.toThrow(/Signature/);
    await expect(parseACB(new ArrayBuffer(3))).rejects.toThrow(/too small/);
    const truncated = buildAcb({
      title: 'T',
      colorSpace: 0,
      records: [{ name: 'Red', components: [255, 0, 0] }],
      truncateBy: 10 // cut inside the record (8 trailer bytes + 2 component bytes)
    });
    await expect(parseACB(truncated)).rejects.toThrow(/unexpected end|exceeds/);
  });

  it('stripLocalizationKey', () => {
    expect(stripLocalizationKey('$$$/a/b=Hello')).toBe('Hello');
    expect(stripLocalizationKey('$$$/a/b')).toBe('');
    expect(stripLocalizationKey('Plain')).toBe('Plain');
    // A second wrapper after the value is not part of it.
    expect(stripLocalizationKey('$$$/a/prefix=TEST 102 UP$$$/a/postfix=')).toBe('TEST 102 UP');
  });
});
