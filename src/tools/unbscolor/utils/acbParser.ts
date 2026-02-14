import { ReferenceColor } from '../types';
import { rgbToHex, labToHex, cmykToRgb } from './colorMath';

/**
 * Parses an Adobe Color Book (.acb) binary file.
 * Supports V1 (Legacy) and V4+ (Modern, UTF-16, 16-bit channels).
 */
export const parseACB = async (buffer: ArrayBuffer): Promise<{ name: string; colors: ReferenceColor[] }> => {
  const view = new DataView(buffer);
  let offset = 0;

  // 1. Signature "8BCB"
  const signature = getString(view, offset, 4);
  offset += 4;
  if (signature !== '8BCB') {
    throw new Error('Invalid ACB file: Signature mismatch (Expected 8BCB).');
  }

  // 2. Version
  const version = view.getUint16(offset);
  offset += 2;

  // 3. Identifier
  const id = view.getUint16(offset);
  offset += 2;

  // 4. Title
  // Try reading as Pascal String first.
  let titleData = readStringBlock(view, offset);
  let title = titleData.text;
  offset += titleData.bytesRead;

  // 5. Prefix
  let prefixData = readStringBlock(view, offset);
  let prefix = prefixData.text;
  offset += prefixData.bytesRead;

  // 6. Suffix
  let suffixData = readStringBlock(view, offset);
  let suffix = suffixData.text;
  offset += suffixData.bytesRead;

  // 7. Description
  let descData = readStringBlock(view, offset);
  offset += descData.bytesRead;

  // 8. Color Count
  const colorCount = view.getUint16(offset);
  offset += 2;

  // 9. Page Size
  const pageSize = view.getUint16(offset);
  offset += 2;

  // 10. Page Selector Offset
  offset += 2; // skip

  // 11. Color Space
  // 0=RGB, 2=CMYK, 7=Lab
  const colorSpace = view.getUint16(offset);
  offset += 2;

  // Detect if we are in 16-bit mode (V4/V5 files often use this)
  // Usually implied by version > 1, but we can verify by checking if next data looks like string len
  // For safety, we assume 8-bit for V1 and 16-bit for others if parsing fails later, but let's try a heuristic.
  const is16Bit = version >= 4 || (version === 0 && colorSpace === 7); // Heuristic

  const colors: ReferenceColor[] = [];

  for (let i = 0; i < colorCount; i++) {
    if (offset >= view.byteLength) break;

    // Color Name
    const nameData = readStringBlock(view, offset);
    const name = nameData.text;
    offset += nameData.bytesRead;

    // Color Code (6 bytes unique ID)
    const colorCode = getString(view, offset, 6);
    offset += 6;

    // Component Values
    let hex = '#000000';
    let rgb = { r: 0, g: 0, b: 0 };

    if (colorSpace === 0) { // RGB
      let r, g, b;
      if (is16Bit) {
         r = view.getUint16(offset) / 257; // 65535 -> 255
         g = view.getUint16(offset + 2) / 257;
         b = view.getUint16(offset + 4) / 257;
         offset += 6;
      } else {
         r = view.getUint8(offset);
         g = view.getUint8(offset + 1);
         b = view.getUint8(offset + 2);
         offset += 3;
      }
      hex = rgbToHex(Math.round(r), Math.round(g), Math.round(b));
      rgb = { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
    } 
    else if (colorSpace === 2) { // CMYK
      let c, m, y, k;
      if (is16Bit) {
        c = (1 - (view.getUint16(offset) / 65535)) * 100;
        m = (1 - (view.getUint16(offset + 2) / 65535)) * 100;
        y = (1 - (view.getUint16(offset + 4) / 65535)) * 100;
        k = (1 - (view.getUint16(offset + 6) / 65535)) * 100;
        offset += 8;
      } else {
        c = (1 - (view.getUint8(offset) / 255)) * 100;
        m = (1 - (view.getUint8(offset + 1) / 255)) * 100;
        y = (1 - (view.getUint8(offset + 2) / 255)) * 100;
        k = (1 - (view.getUint8(offset + 3) / 255)) * 100;
        offset += 4;
      }
      // Note: ACB CMYK is often stored as 'ink amount' (0-100) or 'lightness' (100-0).
      // Adobe usually stores 0 as 100% ink (255=white) for 8-bit, 
      // BUT for 16-bit it's often 65535 = 100% ink or 0 = 100% ink.
      // Standard behavior: 65535 is white (0% ink). So (1 - val/max) is correct.
      
      const cmyk = { c, m, y, k };
      rgb = cmykToRgb(cmyk);
      hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    } 
    else if (colorSpace === 7) { // Lab
      let l, a, bVal;
      
      if (is16Bit) {
         // L: 0..10000 -> 0..100
         // a: -12800..12700 -> -128..127
         // b: -12800..12700 -> -128..127
         // Adobe V4 Lab is encoded usually as:
         // L: uint16 (0..10000) => L / 100
         // a: int16 => a / 100
         // b: int16 => b / 100
         
         const lRaw = view.getUint16(offset);
         const aRaw = view.getInt16(offset + 2);
         const bRaw = view.getInt16(offset + 4);
         offset += 6;
         
         l = lRaw / 100.0;
         a = aRaw / 100.0;
         bVal = bRaw / 100.0;
      } else {
         const lRaw = view.getUint8(offset);
         const aRaw = view.getUint8(offset + 1);
         const bRaw = view.getUint8(offset + 2);
         offset += 3;
         l = (lRaw / 255) * 100;
         a = (aRaw / 255) * 255 - 128;
         bVal = (bRaw / 255) * 255 - 128;
      }

      hex = labToHex({ l, a: a, b: bVal });
      const cleanHex = hex.replace('#', '');
      const bigint = parseInt(cleanHex, 16);
      rgb = {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
      };
    } else {
      // Skip unknown space
      offset += is16Bit ? 6 : 3; // Guess
    }

    const fullCode = (prefix + " " + name + " " + suffix).trim();
    
    // Safety check for empty data
    if (fullCode.length > 0 && hex !== '#000000') {
        colors.push({
          code: fullCode,
          name: name || fullCode,
          hex: hex,
          rgb: rgb
        });
    }
  }

  return { name: title || "Imported Library", colors };
};

// --- Helpers ---

function getString(view: DataView, offset: number, length: number): string {
  let str = '';
  for (let i = 0; i < length; i++) {
    if (offset + i < view.byteLength) {
      str += String.fromCharCode(view.getUint8(offset + i));
    }
  }
  return str;
}

// Reads either a Pascal String (1 byte len) or a V4 String (4 byte len + UTF-16)
function readStringBlock(view: DataView, offset: number): { text: string, bytesRead: number } {
  if (offset >= view.byteLength) return { text: '', bytesRead: 0 };

  // Heuristic: Check for V4 32-bit length (Big Endian)
  // If the first 4 bytes are 00 00 00 XX (where XX > 0), it's likely V4
  const potentialLen32 = view.getUint32(offset);
  const isV4 = potentialLen32 < 500 && potentialLen32 > 0 && view.getUint8(offset) === 0;

  if (isV4) {
    // V4: 4 bytes length (in chars, not bytes, usually), followed by UTF-16BE
    const charCount = potentialLen32;
    if (charCount === 0) return { text: '', bytesRead: 4 };

    const byteLen = charCount * 2;
    let str = '';
    // Read UTF-16BE
    for (let i = 0; i < charCount; i++) {
       const charCode = view.getUint16(offset + 4 + (i * 2));
       if (charCode !== 0) str += String.fromCharCode(charCode); // Filter nulls just in case
    }
    return { text: str.trim(), bytesRead: 4 + byteLen };
  } else {
    // Legacy: Pascal String (1 byte length + ASCII/MacRoman)
    const len = view.getUint8(offset);
    let str = '';
    for (let i = 0; i < len; i++) {
        if (offset + 1 + i < view.byteLength) {
            str += String.fromCharCode(view.getUint8(offset + 1 + i));
        }
    }
    return { text: str.trim(), bytesRead: 1 + len };
  }
}
