// ────────────────────────────────────────────────────────────────
// UnbsID — Sistema de Temas de Design para os slides do manual
// ────────────────────────────────────────────────────────────────

export interface ManualTheme {
  id: string;
  name: string;
  description: string;
  emoji: string;

  // Slide background
  slideBackground: string;
  slideTextColor: string;

  // Accent (headers, chapter labels, watermark)
  accentColor: string;
  accentTextColor: string;

  // Card / panel inside slides
  cardBackground: string;
  cardBorderColor: string;

  // Typography for the manual structure (não da marca)
  headingFont: string;
  monoFont: string;

  // Geometric
  borderRadius: string; // CSS value: '0px' | '4px' | '12px' | '24px'

  // Watermark / decorator
  decoratorOpacity: number;

  // Cover page layout variant
  coverLayout: 'split' | 'centered' | 'diagonal' | 'magazine';
  coverBg: string;
  coverAccent: string;
  coverTextColor: string;

  // Chapter label style
  chapterLabelStyle: 'mono-uppercase' | 'serif-italic' | 'bold-condensed' | 'minimal';
}

export const THEMES: ManualTheme[] = [
  {
    id: 'studio',
    name: 'Studio',
    description: 'Minimalista industrial, sem serifas',
    emoji: '⬜',
    slideBackground: '#FFFFFF',
    slideTextColor: '#111111',
    accentColor: '#111111',
    accentTextColor: '#FFFFFF',
    cardBackground: '#F7F7F7',
    cardBorderColor: '#E5E5E5',
    headingFont: 'Inter, sans-serif',
    monoFont: 'JetBrains Mono, monospace',
    borderRadius: '4px',
    decoratorOpacity: 0.03,
    coverLayout: 'split',
    coverBg: '#0F0F0F',
    coverAccent: '#FFFFFF',
    coverTextColor: '#FFFFFF',
    chapterLabelStyle: 'mono-uppercase',
  },
  {
    id: 'luxe',
    name: 'Luxe',
    description: 'Editorial de moda, alto contraste',
    emoji: '🖤',
    slideBackground: '#FAFAF8',
    slideTextColor: '#0A0A0A',
    accentColor: '#0A0A0A',
    accentTextColor: '#F5F0E8',
    cardBackground: '#EDE7D9',
    cardBorderColor: '#C8BCA8',
    headingFont: '"Playfair Display", Georgia, serif',
    monoFont: 'Georgia, serif',
    borderRadius: '0px',
    decoratorOpacity: 0.03,
    coverLayout: 'magazine',
    coverBg: '#0A0A0A',
    coverAccent: '#C8A96E',
    coverTextColor: '#F5F0E8',
    chapterLabelStyle: 'serif-italic',
  },
  {
    id: 'tech',
    name: 'Tech',
    description: 'Dark mode com detalhes neon',
    emoji: '💚',
    slideBackground: '#141414',
    slideTextColor: '#E8E8E8',
    accentColor: '#CCFF00',
    accentTextColor: '#0A0A0A',
    cardBackground: '#1F1F1F',
    cardBorderColor: '#2A2A2A',
    headingFont: 'Inter, sans-serif',
    monoFont: '"JetBrains Mono", "Fira Code", monospace',
    borderRadius: '2px',
    decoratorOpacity: 0.04,
    coverLayout: 'diagonal',
    coverBg: '#0D0D0D',
    coverAccent: '#CCFF00',
    coverTextColor: '#FFFFFF',
    chapterLabelStyle: 'mono-uppercase',
  },
  {
    id: 'pastel',
    name: 'Pastel',
    description: 'Suave, startup SaaS, arredondado',
    emoji: '🌸',
    slideBackground: '#FDFCFF',
    slideTextColor: '#3D2B5C',
    accentColor: '#9B6ED4',
    accentTextColor: '#FFFFFF',
    cardBackground: '#F3ECFF',
    cardBorderColor: '#DDD0F5',
    headingFont: '"DM Sans", Inter, sans-serif',
    monoFont: 'monospace',
    borderRadius: '16px',
    decoratorOpacity: 0.03,
    coverLayout: 'centered',
    coverBg: '#EDE0FF',
    coverAccent: '#9B6ED4',
    coverTextColor: '#3D2B5C',
    chapterLabelStyle: 'minimal',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Tipografia expressiva, saturado',
    emoji: '⚡',
    slideBackground: '#FFFFFF',
    slideTextColor: '#0A0A0A',
    accentColor: '#0A0A0A',
    accentTextColor: '#FFF500',
    cardBackground: '#FFED00',
    cardBorderColor: '#D4C800',
    headingFont: '"Space Grotesk", "Arial Black", sans-serif',
    monoFont: 'monospace',
    borderRadius: '0px',
    decoratorOpacity: 0.04,
    coverLayout: 'diagonal',
    coverBg: '#0A0A0A',
    coverAccent: '#FFF500',
    coverTextColor: '#FFFFFF',
    chapterLabelStyle: 'bold-condensed',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Revista/jornal com réguas',
    emoji: '📰',
    slideBackground: '#FFFFFF',
    slideTextColor: '#1A1A1A',
    accentColor: '#CC0000',
    accentTextColor: '#FFFFFF',
    cardBackground: '#F5F5F5',
    cardBorderColor: '#1A1A1A',
    headingFont: 'Georgia, "Times New Roman", serif',
    monoFont: '"Courier New", monospace',
    borderRadius: '0px',
    decoratorOpacity: 0.03,
    coverLayout: 'magazine',
    coverBg: '#FFFFFF',
    coverAccent: '#CC0000',
    coverTextColor: '#1A1A1A',
    chapterLabelStyle: 'serif-italic',
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Cyberpunk/gaming, gradientes vivos',
    emoji: '🌈',
    slideBackground: '#0D0D0D',
    slideTextColor: '#F0F0F0',
    accentColor: '#FF00FF',
    accentTextColor: '#0D0D0D',
    cardBackground: '#181818',
    cardBorderColor: '#FF00FF44',
    headingFont: 'Inter, sans-serif',
    monoFont: '"JetBrains Mono", monospace',
    borderRadius: '4px',
    decoratorOpacity: 0.06,
    coverLayout: 'diagonal',
    coverBg: '#0D0D0D',
    coverAccent: '#FF00FF',
    coverTextColor: '#FFFFFF',
    chapterLabelStyle: 'mono-uppercase',
  },
  {
    id: 'eco',
    name: 'Eco',
    description: 'Sustentável, orgânico, tons de terra',
    emoji: '🌿',
    slideBackground: '#F8F5EF',
    slideTextColor: '#2D3A1E',
    accentColor: '#2D4A2D',
    accentTextColor: '#F9F4EC',
    cardBackground: '#EFE8DA',
    cardBorderColor: '#C5B89A',
    headingFont: '"Lora", Georgia, serif',
    monoFont: 'monospace',
    borderRadius: '8px',
    decoratorOpacity: 0.03,
    coverLayout: 'centered',
    coverBg: '#2D4A2D',
    coverAccent: '#A8C57A',
    coverTextColor: '#F9F4EC',
    chapterLabelStyle: 'serif-italic',
  },
];

export const DEFAULT_THEME_ID = 'studio';

export function getTheme(themeId: string): ManualTheme {
  return THEMES.find((t) => t.id === themeId) ?? THEMES[0];
}
