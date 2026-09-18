import { ReferenceColor } from '../types';
import { rgbToHex, labToHex, cmykToRgb, hexToRgb } from './colorMath';

/**
 * Parses an Adobe Color Book (.acb) binary file.
 *
 * Layout (big-endian): "8BCB", u16 version, u16 id, title, prefix, suffix,
 * description, u16 colorCount, u16 pageSize, u16 pageSelectorOffset,
 * u16 colorSpace (0=RGB, 2=CMYK, 7=Lab), then per color: name, 6-byte code,
 * components. Strings are normally "Unicode strings" (u32 char count +
 * UTF-16BE); very old books use Pascal strings. The string format is detected
 * once (from the title) and used for the whole file, so empty strings
 * (u32 = 0) are read correctly.
 */
export const parseACB = async (buffer: ArrayBuffer): Promise<{ name: string; colors: ReferenceColor[] }> => {
  const view = new DataView(buffer);
  let offset = 0;

  const ensure = (bytes: number) => {
    if (offset + bytes > view.byteLength) {
      throw new Error('Invalid ACB file: unexpected end of data.');
    }
  };

  // 1. Signature "8BCB"
  if (view.byteLength < 8) throw new Error('Invalid ACB file: too small.');
  const signature = getString(view, offset, 4);
  offset += 4;
  if (signature !== '8BCB') {
    throw new Error('Invalid ACB file: Signature mismatch (Expected 8BCB).');
  }

  // 2. Version / 3. Identifier
  const version = view.getUint16(offset);
  offset += 2;
  offset += 2; // identifier (unused)

  // String format detection (once per file)
  ensure(4);
  const unicodeStrings = view.getUint32(offset) < 1024;

  const readStr = () => {
    const res = readStringBlock(view, offset, unicodeStrings);
    offset += res.bytesRead;
    return res.text;
  };

  // 4–7. Title, prefix, suffix, description
  const title = readStr();
  const prefix = readStr();
  const suffix = readStr();
  readStr(); // description

  // 8–11. Color count, page size, page selector offset, color space
  ensure(8);
  const colorCount = view.getUint16(offset);
  offset += 2;
  offset += 2; // page size
  offset += 2; // page selector offset
  const colorSpace = view.getUint16(offset);
  offset += 2;

  // Standard books are 8-bit per component. Keep the legacy heuristic for
  // non-standard 16-bit exports.
  const is16Bit = version >= 4 || (version === 0 && colorSpace === 7);
  const componentBytes =
    colorSpace === 2 ? (is16Bit ? 8 : 4) : is16Bit ? 6 : 3;

  const colors: ReferenceColor[] = [];

  for (let i = 0; i < colorCount; i++) {
    if (offset >= view.byteLength) break;

    const name = readStr();

    // Color Code (6 bytes unique ID)
    ensure(6);
    offset += 6;

    ensure(componentBytes);

    let hex: string | null = null;

    if (colorSpace === 0) {
      // RGB
      let r: number, g: number, b: number;
      if (is16Bit) {
        r = view.getUint16(offset) / 257;
        g = view.getUint16(offset + 2) / 257;
        b = view.getUint16(offset + 4) / 257;
      } else {
        r = view.getUint8(offset);
        g = view.getUint8(offset + 1);
        b = view.getUint8(offset + 2);
      }
      hex = rgbToHex(r, g, b);
    } else if (colorSpace === 2) {
      // CMYK: stored inverted (max = 0% ink)
      let c: number, m: number, y: number, k: number;
      if (is16Bit) {
        c = (1 - view.getUint16(offset) / 65535) * 100;
        m = (1 - view.getUint16(offset + 2) / 65535) * 100;
        y = (1 - view.getUint16(offset + 4) / 65535) * 100;
        k = (1 - view.getUint16(offset + 6) / 65535) * 100;
      } else {
        c = (1 - view.getUint8(offset) / 255) * 100;
        m = (1 - view.getUint8(offset + 1) / 255) * 100;
        y = (1 - view.getUint8(offset + 2) / 255) * 100;
        k = (1 - view.getUint8(offset + 3) / 255) * 100;
      }
      const rgb = cmykToRgb({ c, m, y, k });
      hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    } else if (colorSpace === 7) {
      // Lab
      let l: number, a: number, bVal: number;
      if (is16Bit) {
        l = view.getUint16(offset) / 100;
        a = view.getInt16(offset + 2) / 100;
        bVal = view.getInt16(offset + 4) / 100;
      } else {
        l = view.getUint8(offset) / 2.55;
        a = view.getUint8(offset + 1) - 128;
        bVal = view.getUint8(offset + 2) - 128;
      }
      hex = labToHex({ l, a, b: bVal });
    }
    offset += componentBytes;

    // Unknown color space, or empty placeholder records (books pad pages with nameless entries)
    if (!hex || name.length === 0) continue;

    const fullCode = [prefix, name, suffix].filter(Boolean).join(' ').trim();

    colors.push({
      code: fullCode,
      name,
      hex,
      rgb: hexToRgb(hex)
    });
  }

  return { name: title || 'Imported Library', colors };
};

// --- Helpers ---

function getString(view: DataView, offset: number, length: number): string {
  let str = '';
  for (let i = 0; i < length && offset + i < view.byteLength; i++) {
    str += String.fromCharCode(view.getUint8(offset + i));
  }
  return str;
}

/**
 * Photoshop books use localization keys like
 * "$$$/colorbook/<book>/title=<book> Solid Coated"; keep the display value.
 */
export function stripLocalizationKey(text: string): string {
  if (text.startsWith('$$$')) {
    const eq = text.indexOf('=');
    return eq >= 0 ? text.slice(eq + 1) : '';
  }
  return text;
}

function readStringBlock(view: DataView, offset: number, unicode: boolean): { text: string; bytesRead: number } {
  if (offset >= view.byteLength) return { text: '', bytesRead: 0 };

  if (unicode) {
    if (offset + 4 > view.byteLength) return { text: '', bytesRead: view.byteLength - offset };
    const charCount = view.getUint32(offset);
    const byteLen = charCount * 2;
    if (offset + 4 + byteLen > view.byteLength) {
      throw new Error('Invalid ACB file: string exceeds file size.');
    }
    let str = '';
    for (let i = 0; i < charCount; i++) {
      const charCode = view.getUint16(offset + 4 + i * 2);
      if (charCode !== 0) str += String.fromCharCode(charCode);
    }
    return { text: stripLocalizationKey(str).trim(), bytesRead: 4 + byteLen };
  }

  // Legacy: Pascal String (1 byte length + ASCII/MacRoman)
  const len = view.getUint8(offset);
  let str = '';
  for (let i = 0; i < len && offset + 1 + i < view.byteLength; i++) {
    str += String.fromCharCode(view.getUint8(offset + 1 + i));
  }
  return { text: stripLocalizationKey(str).trim(), bytesRead: 1 + len };
}
