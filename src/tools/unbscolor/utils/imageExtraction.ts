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

function normalizeColorToHex(raw: string): string | null {
  const value = raw.trim().toLowerCase();

  if (!value || SKIP_VALUES.has(value) || value.startsWith('url(')) return null;

  // Already hex
  if (value.startsWith('#')) {
    if (value.length === 4) {
      // #RGB -> #RRGGBB
      return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toUpperCase();
    }
    if (value.length === 7) return value.toUpperCase();
    return null;
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return rgbToHex(Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3]));
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

// Keep legacy function for backward compatibility but it's no longer used
export const extractColorsFromImage = (imageSrc: string, maxColors: number = 6): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("Canvas unavailable");

      const SAMPLE_SIZE = 100;
      canvas.width = SAMPLE_SIZE;
      canvas.height = SAMPLE_SIZE;
      ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

      const imageData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
      const colorMap: { r: number; g: number; b: number; count: number }[] = [];
      const COLOR_THRESHOLD = 20;

      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i], g = imageData[i + 1], b = imageData[i + 2], a = imageData[i + 3];
        if (a < 128) continue;
        const newColor = { r, g, b, count: 1 };
        let found = false;
        for (let j = 0; j < colorMap.length; j++) {
          const dr = colorMap[j].r - r, dg = colorMap[j].g - g, db = colorMap[j].b - b;
          if (Math.sqrt(dr * dr + dg * dg + db * db) < COLOR_THRESHOLD) {
            colorMap[j].r = (colorMap[j].r * colorMap[j].count + r) / (colorMap[j].count + 1);
            colorMap[j].g = (colorMap[j].g * colorMap[j].count + g) / (colorMap[j].count + 1);
            colorMap[j].b = (colorMap[j].b * colorMap[j].count + b) / (colorMap[j].count + 1);
            colorMap[j].count++;
            found = true;
            break;
          }
        }
        if (!found) colorMap.push(newColor);
      }

      colorMap.sort((a, b) => b.count - a.count);
      resolve(colorMap.slice(0, maxColors).map(c => rgbToHex(Math.round(c.r), Math.round(c.g), Math.round(c.b))));
    };

    img.onerror = (e) => reject(e);
    img.src = imageSrc;
  });
};
