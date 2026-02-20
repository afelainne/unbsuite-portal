// ────────────────────────────────────────────────────────────────
// UnbsID — Tipos centrais do Manual de Identidade Visual
// ────────────────────────────────────────────────────────────────

export type ColorRole = 'primary' | 'secondary' | 'accent' | 'neutral';
export type IconStyleType = 'line' | 'filled' | 'duotone';
export type LogoVariantType = 'primary' | 'secondary' | 'icon' | 'mono' | 'negative';
export type GridType = 'modular' | 'baseline' | 'circular' | 'custom';
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export interface ColorEntry {
  id: string;
  name: string;
  hex: string;
  role: ColorRole;
  accessibilityNote?: string;
  usageNote?: string;
}

export interface NeutralEntry {
  id: string;
  hex: string;
  label: string; // '50' | '100' | ... | '900'
}

export interface GradientStop {
  hex: string;
  position: number; // 0–100
}

export interface GradientEntry {
  id: string;
  name: string;
  angle: number;
  stops: GradientStop[];
}

export interface LogoVariant {
  id: string;
  type: LogoVariantType;
  label: string;
  svgContent?: string;   // conteúdo SVG inline
  dataUrl?: string;      // data URL para PNG
  fileName?: string;
}

export interface GridRules {
  gridType: GridType;
  gridUnits: number;
  keyRatios: string[]; // ex: ['1:1', '4:3', '16:9']
  cornerRadiusRules?: string;
  notes?: string;
}

export interface TypefaceEntry {
  id: string;
  name: string;
  role: 'display' | 'body' | 'mono' | 'accent';
  weights: FontWeight[];
  fallback: string;
  source: 'google' | 'local' | 'system';
  previewText?: string;
}

export interface TypeStyle {
  id: string;
  styleName: string; // 'H1' | 'H2' | ... | 'Caption' | 'Button'
  fontFamily: string;
  size: number;       // px
  weight: FontWeight;
  lineHeight: number; // e.g. 1.4
  tracking: number;   // em, e.g. -0.02
}

export interface IconStyleConfig {
  style: IconStyleType;
  defaultSize: number;   // px
  strokeWidth: number;   // px
  cornerStyle: 'round' | 'square' | 'miter';
  gridSize: number;      // px
}

export interface VoiceTemplate {
  id: string;
  context: string; // 'error' | 'onboarding' | 'empty' | 'confirmation' | 'cta'
  example: string;
}

export interface MockupRef {
  templateId: string;
  imageUrl?: string;
  label?: string;
}

export interface BrandData {
  // ── Tema do manual ─────────────────────────────────────────────
  themeId: string;

  // ── Layout customizável ────────────────────────────────────────
  gridBreakpoints: {
    label: string;
    cols: number;
    gutter: number;
    margin: number;
    width: string;
  }[];

  // ── Donts do logo ──────────────────────────────────────────────
  logoDonts: string[];

  // ── Capa ───────────────────────────────────────────────────────
  name: string;
  tagline: string;
  version: string;
  date: string;
  studio: string;
  coverLogoUrl?: string;
  coverBgColor: string;
  coverAccentColor: string;

  // ── Introdução ─────────────────────────────────────────────────
  objective: string;
  archetype: string[];
  values: string[];
  tone: string;
  vibe: string;

  // ── Logo ───────────────────────────────────────────────────────
  logoVariants: LogoVariant[];
  gridRules: GridRules;
  clearSpaceRule: string;
  clearSpaceValue: number;
  minSizeDigital: number;
  minSizePrint: number;

  // ── Cores ──────────────────────────────────────────────────────
  palette: ColorEntry[];
  neutrals: NeutralEntry[];
  gradients: GradientEntry[];

  // ── Tipografia ─────────────────────────────────────────────────
  typefaces: TypefaceEntry[];
  typeStyles: TypeStyle[];

  // ── Elementos Gráficos ─────────────────────────────────────────
  iconStyle: IconStyleConfig;
  spacingBase: 4 | 8;
  cornerRadius: number;
  strokeWidth: number;

  // ── Tom de voz ─────────────────────────────────────────────────
  voiceDos: string[];
  voiceDonts: string[];
  voiceTemplates: VoiceTemplate[];

  // ── Aplicações ─────────────────────────────────────────────────
  mockupRefs: MockupRef[];
}

export const DEFAULT_BRAND_DATA: BrandData = {
  themeId: 'studio',

  gridBreakpoints: [
    { label: 'Mobile', cols: 4, gutter: 16, margin: 16, width: '375px' },
    { label: 'Tablet', cols: 8, gutter: 20, margin: 24, width: '768px' },
    { label: 'Desktop', cols: 12, gutter: 24, margin: 48, width: '1440px' },
  ],

  logoDonts: [
    'Não distorça ou deforme o logo',
    'Não aplique sombras ou efeitos',
    'Não altere as proporções',
    'Não use cores fora do sistema',
    'Não aplique sobre fundos conflitantes',
    'Não adicione elementos extras ao logo',
  ],

  name: 'Minha Marca',
  tagline: 'Uma tagline memorável',
  version: 'v1.0',
  date: new Date().toLocaleDateString('pt-BR'),
  studio: 'Studio Nome',
  coverLogoUrl: undefined,
  coverBgColor: '#0F0F0F',
  coverAccentColor: '#FFFFFF',

  objective:
    'Este manual define os padrões visuais e de comunicação da marca, garantindo consistência em todas as aplicações digitais e impressas.',
  archetype: ['Inovadora', 'Confiante', 'Acessível', 'Criativa'],
  values: ['Autenticidade', 'Excelência', 'Conexão', 'Impacto'],
  tone: 'Direto e caloroso',
  vibe: 'Tech acessível com energia criativa',

  logoVariants: [
    { id: 'primary', type: 'primary', label: 'Primária (Horizontal)' },
    { id: 'secondary', type: 'secondary', label: 'Secundária (Vertical)' },
    { id: 'icon', type: 'icon', label: 'Ícone / Marca' },
    { id: 'mono', type: 'mono', label: 'Monocromático' },
    { id: 'negative', type: 'negative', label: 'Negativo' },
  ],
  gridRules: {
    gridType: 'modular',
    gridUnits: 8,
    keyRatios: ['1:1', '4:3', '16:9'],
    cornerRadiusRules: 'Sem arredondamento — geometria pura',
    notes: '',
  },
  clearSpaceRule: 'x (altura do ícone)',
  clearSpaceValue: 1,
  minSizeDigital: 24,
  minSizePrint: 10,

  palette: [
    {
      id: 'p1',
      name: 'Brand Primary',
      hex: '#2563EB',
      role: 'primary',
      usageNote: 'Ações principais, links, CTAs',
      accessibilityNote: 'AA em fundo branco',
    },
    {
      id: 'p2',
      name: 'Brand Secondary',
      hex: '#7C3AED',
      role: 'secondary',
      usageNote: 'Elementos de suporte, ícones',
      accessibilityNote: 'AA em fundo branco',
    },
    {
      id: 'p3',
      name: 'Brand Accent',
      hex: '#F59E0B',
      role: 'accent',
      usageNote: 'Destaques, badges, alertas positivos',
      accessibilityNote: 'Usar com texto escuro',
    },
  ],
  neutrals: [
    { id: 'n1', hex: '#FFFFFF', label: '50' },
    { id: 'n2', hex: '#F8FAFC', label: '100' },
    { id: 'n3', hex: '#E2E8F0', label: '200' },
    { id: 'n4', hex: '#94A3B8', label: '400' },
    { id: 'n5', hex: '#475569', label: '600' },
    { id: 'n6', hex: '#1E293B', label: '800' },
    { id: 'n7', hex: '#0F172A', label: '900' },
  ],
  gradients: [
    {
      id: 'g1',
      name: 'Primary Gradient',
      angle: 135,
      stops: [
        { hex: '#2563EB', position: 0 },
        { hex: '#7C3AED', position: 100 },
      ],
    },
  ],

  typefaces: [
    {
      id: 'tf1',
      name: 'Inter',
      role: 'body',
      weights: [400, 500, 600, 700],
      fallback: 'sans-serif',
      source: 'google',
      previewText: 'The quick brown fox',
    },
    {
      id: 'tf2',
      name: 'Playfair Display',
      role: 'display',
      weights: [400, 700],
      fallback: 'serif',
      source: 'google',
      previewText: 'Display Heading',
    },
  ],
  typeStyles: [
    { id: 'ts1', styleName: 'H1', fontFamily: 'Playfair Display', size: 48, weight: 700, lineHeight: 1.1, tracking: -0.02 },
    { id: 'ts2', styleName: 'H2', fontFamily: 'Playfair Display', size: 36, weight: 700, lineHeight: 1.2, tracking: -0.01 },
    { id: 'ts3', styleName: 'H3', fontFamily: 'Inter', size: 24, weight: 600, lineHeight: 1.3, tracking: 0 },
    { id: 'ts4', styleName: 'Body', fontFamily: 'Inter', size: 16, weight: 400, lineHeight: 1.6, tracking: 0 },
    { id: 'ts5', styleName: 'Caption', fontFamily: 'Inter', size: 12, weight: 400, lineHeight: 1.4, tracking: 0.02 },
    { id: 'ts6', styleName: 'Button', fontFamily: 'Inter', size: 14, weight: 600, lineHeight: 1, tracking: 0.04 },
  ],

  iconStyle: {
    style: 'line',
    defaultSize: 24,
    strokeWidth: 2,
    cornerStyle: 'round',
    gridSize: 24,
  },
  spacingBase: 8,
  cornerRadius: 8,
  strokeWidth: 2,

  voiceDos: [
    'Use frases curtas e diretas',
    'Prefira a voz ativa',
    'Seja empático e próximo',
    'Use verbos de ação nos CTAs',
  ],
  voiceDonts: [
    'Evite jargão técnico sem explicação',
    'Não use voz passiva excessiva',
    'Não seja formal em excesso',
    'Evite palavras negativas como "erro" ou "falha"',
  ],
  voiceTemplates: [
    { id: 'vt1', context: 'error', example: 'Algo não saiu como esperado. Vamos tentar de novo?' },
    { id: 'vt2', context: 'onboarding', example: 'Bem-vindo! Vamos configurar tudo em 2 minutos.' },
    { id: 'vt3', context: 'empty', example: 'Nada aqui ainda — que tal começar criando o primeiro?' },
    { id: 'vt4', context: 'confirmation', example: 'Pronto! Suas alterações foram salvas.' },
    { id: 'vt5', context: 'cta', example: 'Comece agora — é grátis.' },
  ],

  mockupRefs: [],
};

// ── Slide / Navegação ──────────────────────────────────────────────────────────

export interface SlideDefinition {
  id: string;
  chapterId: string;
  chapterTitle: string;
  slideTitle: string;
  slideIndex: number;
}

export const CHAPTERS: { id: string; title: string; slides: string[] }[] = [
  { id: 'cover', title: 'Capa', slides: ['Capa'] },
  { id: 'intro', title: '1. Introdução', slides: ['Objetivo', 'Personalidade'] },
  { id: 'logo', title: '2. Logo', slides: ['Variações', 'Grid & Construção', 'Área de Proteção', 'Tamanho Mínimo', 'Usos Incorretos'] },
  { id: 'colors', title: '3. Cores', slides: ['Paleta Principal', 'Neutros', 'Contraste A11y', 'Gradientes'] },
  { id: 'typography', title: '4. Tipografia', slides: ['Fontes', 'Hierarquia'] },
  { id: 'graphics', title: '5. Elementos Gráficos', slides: ['Linguagem Visual', 'Ícones'] },
  { id: 'layout', title: '6. Layout & Grid', slides: ['Espaçamento', 'Grid Responsivo'] },
  { id: 'voice', title: '7. Tom de Voz', slides: ['Personalidade & Templates'] },
  { id: 'applications', title: '8. Aplicações', slides: ['Mockups'] },
  { id: 'deliverables', title: '9. Entregáveis', slides: ['Checklist & Export'] },
];
