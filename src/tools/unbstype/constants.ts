export type FontCategory = 'serif' | 'sans' | 'mono' | 'display' | 'handwriting';

export interface FontEntry {
  name: string;
  category: FontCategory;
  weights: number[];
  isLocal?: boolean;
}

export interface FontPair {
  heading: string;
  body: string;
  label: string;
}

export interface ColorPalette {
  name: string;
  fg: string;
  bg: string;
}

export const FONTS: FontEntry[] = [
  // Serif
  { name: 'Playfair Display', category: 'serif', weights: [400, 700] },
  { name: 'Lora', category: 'serif', weights: [400, 700] },
  { name: 'Merriweather', category: 'serif', weights: [400, 700] },
  { name: 'EB Garamond', category: 'serif', weights: [400, 700] },
  { name: 'Cormorant Garamond', category: 'serif', weights: [400, 700] },
  { name: 'Libre Baskerville', category: 'serif', weights: [400, 700] },
  { name: 'DM Serif Display', category: 'serif', weights: [400] },
  { name: 'Bitter', category: 'serif', weights: [400, 700] },
  { name: 'Crimson Text', category: 'serif', weights: [400, 700] },
  { name: 'Noto Serif', category: 'serif', weights: [400, 700] },
  { name: 'Source Serif 4', category: 'serif', weights: [400, 700] },
  { name: 'Fraunces', category: 'serif', weights: [400, 700] },
  { name: 'Spectral', category: 'serif', weights: [400, 700] },
  { name: 'Vollkorn', category: 'serif', weights: [400, 700] },
  { name: 'PT Serif', category: 'serif', weights: [400, 700] },

  // Sans-serif
  { name: 'Inter', category: 'sans', weights: [400, 700] },
  { name: 'Roboto', category: 'sans', weights: [400, 700] },
  { name: 'Open Sans', category: 'sans', weights: [400, 700] },
  { name: 'Lato', category: 'sans', weights: [400, 700] },
  { name: 'Montserrat', category: 'sans', weights: [400, 700] },
  { name: 'Poppins', category: 'sans', weights: [400, 700] },
  { name: 'Nunito', category: 'sans', weights: [400, 700] },
  { name: 'Work Sans', category: 'sans', weights: [400, 700] },
  { name: 'DM Sans', category: 'sans', weights: [400, 700] },
  { name: 'Outfit', category: 'sans', weights: [400, 700] },
  { name: 'Space Grotesk', category: 'sans', weights: [400, 700] },
  { name: 'Manrope', category: 'sans', weights: [400, 700] },
  { name: 'Plus Jakarta Sans', category: 'sans', weights: [400, 700] },
  { name: 'Sora', category: 'sans', weights: [400, 700] },
  { name: 'Figtree', category: 'sans', weights: [400, 700] },
  { name: 'Albert Sans', category: 'sans', weights: [400, 700] },
  { name: 'Urbanist', category: 'sans', weights: [400, 700] },
  { name: 'Archivo', category: 'sans', weights: [400, 700] },
  { name: 'Barlow', category: 'sans', weights: [400, 700] },
  { name: 'Rubik', category: 'sans', weights: [400, 700] },
  { name: 'Karla', category: 'sans', weights: [400, 700] },
  { name: 'Josefin Sans', category: 'sans', weights: [400, 700] },
  { name: 'Raleway', category: 'sans', weights: [400, 700] },
  { name: 'Cabin', category: 'sans', weights: [400, 700] },
  { name: 'Mulish', category: 'sans', weights: [400, 700] },
  { name: 'Source Sans 3', category: 'sans', weights: [400, 700] },
  { name: 'Nunito Sans', category: 'sans', weights: [400, 700] },
  { name: 'Libre Franklin', category: 'sans', weights: [400, 700] },
  { name: 'Red Hat Display', category: 'sans', weights: [400, 700] },
  { name: 'General Sans', category: 'sans', weights: [400, 700] },

  // Monospace
  { name: 'JetBrains Mono', category: 'mono', weights: [400, 700] },
  { name: 'Fira Code', category: 'mono', weights: [400, 700] },
  { name: 'Source Code Pro', category: 'mono', weights: [400, 700] },
  { name: 'IBM Plex Mono', category: 'mono', weights: [400, 700] },
  { name: 'Space Mono', category: 'mono', weights: [400, 700] },
  { name: 'Roboto Mono', category: 'mono', weights: [400, 700] },
  { name: 'Inconsolata', category: 'mono', weights: [400, 700] },

  // Display
  { name: 'Bebas Neue', category: 'display', weights: [400] },
  { name: 'Oswald', category: 'display', weights: [400, 700] },
  { name: 'Anton', category: 'display', weights: [400] },
  { name: 'Righteous', category: 'display', weights: [400] },
  { name: 'Abril Fatface', category: 'display', weights: [400] },
  { name: 'Alfa Slab One', category: 'display', weights: [400] },
  { name: 'Passion One', category: 'display', weights: [400, 700] },
  { name: 'Staatliches', category: 'display', weights: [400] },
  { name: 'Bungee', category: 'display', weights: [400] },
  { name: 'Fredoka', category: 'display', weights: [400, 700] },

  // Handwriting
  { name: 'Caveat', category: 'handwriting', weights: [400, 700] },
  { name: 'Dancing Script', category: 'handwriting', weights: [400, 700] },
  { name: 'Pacifico', category: 'handwriting', weights: [400] },
  { name: 'Great Vibes', category: 'handwriting', weights: [400] },
  { name: 'Sacramento', category: 'handwriting', weights: [400] },
  { name: 'Satisfy', category: 'handwriting', weights: [400] },
  { name: 'Lobster', category: 'handwriting', weights: [400] },
];

export const CURATED_PAIRS: FontPair[] = [
  { heading: 'Playfair Display', body: 'Source Sans 3', label: 'Clássico editorial' },
  { heading: 'Space Grotesk', body: 'Inter', label: 'Tech moderno' },
  { heading: 'DM Serif Display', body: 'DM Sans', label: 'DM Family' },
  { heading: 'Bebas Neue', body: 'Open Sans', label: 'Poster impactante' },
  { heading: 'Fraunces', body: 'Nunito Sans', label: 'Branding premium' },
  { heading: 'Cormorant Garamond', body: 'Montserrat', label: 'Luxo refinado' },
  { heading: 'Oswald', body: 'Lato', label: 'Clean & bold' },
  { heading: 'Lora', body: 'Roboto', label: 'Blog profissional' },
  { heading: 'Abril Fatface', body: 'Poppins', label: 'Statement design' },
  { heading: 'Merriweather', body: 'Work Sans', label: 'Leitura confortável' },
  { heading: 'Red Hat Display', body: 'IBM Plex Mono', label: 'Developer brand' },
  { heading: 'Sora', body: 'Source Serif 4', label: 'Contraste suave' },
  { heading: 'Anton', body: 'Nunito', label: 'Esportivo' },
  { heading: 'Bitter', body: 'Raleway', label: 'Contemporâneo' },
  { heading: 'Plus Jakarta Sans', body: 'Libre Baskerville', label: 'SaaS elegante' },
  { heading: 'Caveat', body: 'Karla', label: 'Artesanal' },
  { heading: 'Righteous', body: 'Outfit', label: 'Divertido' },
  { heading: 'Archivo', body: 'Spectral', label: 'Editorial moderno' },
  { heading: 'Urbanist', body: 'Crimson Text', label: 'Startup cultural' },
  { heading: 'Manrope', body: 'JetBrains Mono', label: 'Dev-first' },
];

export const CATEGORY_LABELS: Record<FontCategory, string> = {
  serif: 'Serif',
  sans: 'Sans-Serif',
  mono: 'Monospace',
  display: 'Display',
  handwriting: 'Script',
};

export const COLOR_PALETTES: ColorPalette[] = [
  { name: 'Dark', fg: '#f5f5f5', bg: '#0a0a0a' },
  { name: 'Light', fg: '#1a1a1a', bg: '#ffffff' },
  { name: 'Warm', fg: '#3d2b1f', bg: '#fdf6ec' },
  { name: 'Cool', fg: '#1a2332', bg: '#eef4fa' },
  { name: 'High Contrast', fg: '#000000', bg: '#ffff00' },
  { name: 'Pastel', fg: '#4a3f5c', bg: '#f0e6f6' },
  { name: 'Forest', fg: '#f0ebe3', bg: '#1b3a2d' },
  { name: 'Navy', fg: '#e8dcc8', bg: '#0f1b33' },
  { name: 'Cream', fg: '#2c1810', bg: '#f5e6d3' },
  { name: 'Slate', fg: '#e2e8f0', bg: '#1e293b' },
];

export const loadGoogleFont = (fontName: string, weights: number[] = [400, 700]) => {
  const id = `gf-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@${weights.join(';')}&display=swap`;
  document.head.appendChild(link);
};

// WCAG contrast ratio calculation
function luminance(hex: string): number {
  const rgb = hex.replace('#', '').match(/.{2}/g)!.map(c => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function randomHex(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

export function generateContrastingPair(): { fg: string; bg: string } {
  for (let i = 0; i < 100; i++) {
    const fg = randomHex();
    const bg = randomHex();
    if (contrastRatio(fg, bg) >= 4.5) return { fg, bg };
  }
  // fallback
  return Math.random() > 0.5
    ? { fg: '#f5f5f5', bg: '#0a0a0a' }
    : { fg: '#1a1a1a', bg: '#ffffff' };
}
