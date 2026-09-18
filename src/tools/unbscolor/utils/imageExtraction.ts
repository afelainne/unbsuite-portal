import { rgbToHex } from './colorMath';

// CSS named colors map (subset of most common ones)
const CSS_NAMED_COLORS: Record<string, string> = {
  red: '#FF0000', green: '#008000', blue: '#0000FF', yellow: '#FFFF00',
  orange: '#FFA500', purple: '#800080', pink: '#FFC0CB', black: '#000000',
  white: '#FFFFFF', gray: '#808080', grey: '#808080', cyan: '#00FFFF',
  magenta: '#FF00FF', lime: '#00FF00', maroon: '#800000', navy: '#000080',
  olive: '#808000', teal: '#008080', aqua: '#00FFFF', silver: '#C0C0C0',
  fuchsia: '#FF00FF', brown: '#A52A2A', coral: '#FF7F50', crimson: '#DC143C',
  darkblue: '#00008B', darkgreen: '#006400', darkred: '#8B0000',
  gold: '#FFD700', indigo: '#4B0082', ivory: '#FFFFF0', khaki: '#F0E68C',
  lavender: '#E6E6FA', lightblue: '#ADD8E6', lightgreen: '#90EE90',
  lightyellow: '#FFFFE0', orangered: '#FF4500', orchid: '#DA70D6',
  salmon: '#FA8072', sienna: '#A0522D', skyblue: '#87CEEB', tan: '#D2B48C',
  tomato: '#FF6347', turquoise: '#40E0D0', violet: '#EE82EE', wheat: '#F5DEB3',
};

const SKIP_VALUES = new Set([
  'none', 'transparent', 'inherit', 'currentcolor', 'initial', 'unset',
]);

const parseRgbComponent = (token: string): number => {
  const t = token.trim();
  if (t.endsWith('%')) return (parseFloat(t) / 100) * 255;
  return parseFloat(t);
};

export function normalizeColorToHex(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.replace(/!important/i, '').trim().toLowerCase();

  if (!value || SKIP_VALUES.has(value) || value.startsWith('url(')) return null;

  // Hex: #RGB, #RGBA, #RRGGBB, #RRGGBBAA (alpha ignored). Characters are validated.
  if (value.startsWith('#')) {
    const body = value.slice(1);
    if (!/^[0-9a-f]+$/.test(body)) return null;
    if (body.length === 3 || body.length === 4) {
      return `#${body[0]}${body[0]}${body[1]}${body[1]}${body[2]}${body[2]}`.toUpperCase();
    }
    if (body.length === 6 || body.length === 8) return `#${body.slice(0, 6)}`.toUpperCase();
    return null;
  }

  // rgb()/rgba(): comma or space syntax, integers, decimals or percentages.
  // rgbToHex clamps out-of-range values (e.g. rgb(300, 0, 0) -> #FF0000).
  const fn = value.match(/^rgba?\(([^)]*)\)/);
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const [r, g, b] = parts.slice(0, 3).map(parseRgbComponent);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return rgbToHex(r, g, b);
  }

  // CSS named color
  if (CSS_NAMED_COLORS[value]) return CSS_NAMED_COLORS[value];

  return null;
}

function extractColorFromStyle(styleStr: string): string[] {
  const colors: string[] = [];
  const props = ['fill', 'stroke', 'stop-color', 'color', 'background-color', 'background'];
  for (const prop of props) {
    const regex = new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'gi');
    let match;
    while ((match = regex.exec(styleStr)) !== null) {
      const hex = normalizeColorToHex(match[1]);
      if (hex) colors.push(hex);
    }
  }
  return colors;
}

/**
 * Extract unique colors from SVG XML content by parsing fill, stroke, stop-color attributes
 * and inline style declarations.
 */
export const extractColorsFromSvg = (svgContent: string): string[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');

  // Check for parse errors
  const errorNode = doc.querySelector('parsererror');
  if (errorNode) {
    console.warn('SVG parse error:', errorNode.textContent);
    return [];
  }

  const colorSet = new Set<string>();
  const elements = doc.querySelectorAll('*');

  const COLOR_ATTRS = ['fill', 'stroke', 'stop-color', 'color'];

  elements.forEach((el) => {
    // Check direct attributes
    for (const attr of COLOR_ATTRS) {
      const val = el.getAttribute(attr);
      if (val) {
        const hex = normalizeColorToHex(val);
        if (hex) colorSet.add(hex);
      }
    }

    // Check inline style attribute
    const styleAttr = el.getAttribute('style');
    if (styleAttr) {
      const found = extractColorFromStyle(styleAttr);
      found.forEach((c) => colorSet.add(c));
    }
  });

  // Also check <style> elements for CSS rules
  const styleEls = doc.querySelectorAll('style');
  styleEls.forEach((styleEl) => {
    const cssText = styleEl.textContent || '';
    const found = extractColorFromStyle(cssText);
    found.forEach((c) => colorSet.add(c));
  });

  return Array.from(colorSet);
};

/**
 * Clusters RGBA pixel data into dominant colors (greedy running-mean clustering).
 * Pixels with alpha < 128 are ignored. Pure function, exported for testing.
 */
export const clusterPixels = (
  data: ArrayLike<number>,
  maxColors: number = 6,
  threshold: number = 20
): string[] => {
  const colorMap: { r: number; g: number; b: number; count: number }[] = [];
  const thresholdSq = threshold * threshold;

  for (let i = 0; i + 3 < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 128) continue;
    let found = false;
    for (let j = 0; j < colorMap.length; j++) {
      const c = colorMap[j];
      const dr = c.r - r, dg = c.g - g, db = c.b - b;
      if (dr * dr + dg * dg + db * db < thresholdSq) {
        c.r = (c.r * c.count + r) / (c.count + 1);
        c.g = (c.g * c.count + g) / (c.count + 1);
        c.b = (c.b * c.count + b) / (c.count + 1);
        c.count++;
        found = true;
        break;
      }
    }
    if (!found) colorMap.push({ r, g, b, count: 1 });
  }

  colorMap.sort((a, b) => b.count - a.count);

  // Running means can make two clusters converge on the same hex: dedupe.
  const out: string[] = [];
  const limit = Math.max(0, maxColors);
  for (const c of colorMap) {
    if (out.length >= limit) break;
    const hex = rgbToHex(c.r, c.g, c.b);
    if (!out.includes(hex)) out.push(hex);
  }
  return out;
};

/**
 * Extract dominant colors from a raster image File (JPG/PNG/WEBP).
 * Reads as dataURL, draws to a small canvas, then clusters by proximity.
 */
export const extractDominantColors = (file: File, maxColors: number = 8): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));
    if (file.type && !file.type.startsWith('image/')) {
      return reject(new Error(`Unsupported file type: ${file.type}`));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return reject(new Error('Failed to read file'));
      extractColorsFromImage(e.target.result as string, maxColors).then(resolve).catch(reject);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.onabort = () => reject(new Error('File read aborted'));
    reader.readAsDataURL(file);
  });
};

export const extractColorsFromImage = (imageSrc: string, maxColors: number = 6): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas unavailable'));

        const SAMPLE_SIZE = 100;
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

        // getImageData throws SecurityError on tainted (cross-origin) canvases
        const imageData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
        resolve(clusterPixels(imageData, maxColors));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
};
