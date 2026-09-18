// Tolerant color input: "#abc", "abc", "a1b2c3", "rgb(255 0 0)", "tomato"... -> "#RRGGBB".

import { normalizeHex } from './colorMath';
import { normalizeColorToHex } from './imageExtraction';

/**
 * Parses free-form user input into an uppercase "#RRGGBB" hex.
 * Accepts hex with or without "#", 3/4/6/8-digit hex (alpha ignored),
 * rgb()/rgba() and common CSS color names. Returns null when not a color.
 */
export const parseColorInput = (raw: string): string | null => {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;

  const hex = normalizeHex(value);
  if (hex) return hex;

  // Bare 4/8-digit hex without "#"
  if (/^[0-9a-f]{4}$|^[0-9a-f]{8}$/i.test(value)) return normalizeColorToHex(`#${value}`);

  return normalizeColorToHex(value);
};
