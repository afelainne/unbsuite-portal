
// Declare external library loaded via CDN
declare const opentype: any;

export interface GlyphComponent {
    char: string;
    dx: number;
    dy: number;
    scale: number;
}

export interface GlyphAnchor {
    name: string;
    x: number;
    y: number;
}

export type ShapeCategory = "straight" | "diagonal" | "round" | "overhang";
export type ScriptId = "latin" | "numbers" | "symbols" | "punctuation" | "other";

export interface TrackingRules {
    applyToWhitespace: boolean;
    whitespaceFactor: number;
    punctuationFactor: number; // 0 to 1
    applyToNumbers: boolean;
    capsLockExtraTracking: number;
}

export interface TrackingProfile {
    id: string;
    label: string;
    defaultTracking: number; 
    sizeCompensation: {
        enable: boolean;
        minSize: number;
        maxSize: number;
        minFactor: number;
        maxFactor: number;
    };
    rules: TrackingRules;
}

export const DEFAULT_TRACKING_PROFILES: Record<string, TrackingProfile> = {
    'custom': {
        id: "custom",
        label: "Custom / Manual",
        defaultTracking: 0,
        sizeCompensation: { enable: false, minSize: 12, maxSize: 72, minFactor: 1, maxFactor: 1 },
        rules: { applyToWhitespace: true, whitespaceFactor: 1, punctuationFactor: 1, applyToNumbers: true, capsLockExtraTracking: 0 }
    },
    'body-text': {
        id: "body-text",
        label: "1. Body Text",
        defaultTracking: 6,
        sizeCompensation: { enable: true, minSize: 8, maxSize: 16, minFactor: 1.15, maxFactor: 1.0 },
        rules: { applyToWhitespace: true, whitespaceFactor: 1.0, punctuationFactor: 0.8, applyToNumbers: true, capsLockExtraTracking: 0 }
    },
    'display-headline': {
        id: "display-headline",
        label: "2. Display Headline",
        defaultTracking: -12,
        sizeCompensation: { enable: true, minSize: 24, maxSize: 120, minFactor: 1.0, maxFactor: 0.85 },
        rules: { applyToWhitespace: true, whitespaceFactor: 0.7, punctuationFactor: 0.5, applyToNumbers: true, capsLockExtraTracking: 18 }
    },
    'ultra-tight': {
        id: "ultra-tight",
        label: "3. Ultra Tight Mark",
        defaultTracking: -50,
        sizeCompensation: { enable: true, minSize: 24, maxSize: 120, minFactor: 1.0, maxFactor: 0.9 },
        rules: { applyToWhitespace: true, whitespaceFactor: 0.5, punctuationFactor: 0.3, applyToNumbers: true, capsLockExtraTracking: 14 }
    },
    'luxury': {
        id: "luxury",
        label: "4. Luxury Spaced",
        defaultTracking: 40,
        sizeCompensation: { enable: true, minSize: 12, maxSize: 60, minFactor: 1.1, maxFactor: 1.0 },
        rules: { applyToWhitespace: true, whitespaceFactor: 0.8, punctuationFactor: 0.4, applyToNumbers: true, capsLockExtraTracking: 24 }
    },
    'geo-display': {
        id: "geo-display",
        label: "5. Geometric Sans Display",
        defaultTracking: -20,
        sizeCompensation: { enable: true, minSize: 36, maxSize: 120, minFactor: 1.0, maxFactor: 0.85 },
        rules: { applyToWhitespace: true, whitespaceFactor: 0.7, punctuationFactor: 0.6, applyToNumbers: true, capsLockExtraTracking: 10 }
    },
    'humanist-text': {
        id: "humanist-text",
        label: "6. Humanist Sans Text",
        defaultTracking: 4,
        sizeCompensation: { enable: true, minSize: 9, maxSize: 18, minFactor: 1.1, maxFactor: 1.0 },
        rules: { applyToWhitespace: true, whitespaceFactor: 0.9, punctuationFactor: 0.65, applyToNumbers: false, capsLockExtraTracking: 4 }
    },
    'serif-book': {
        id: "serif-book",
        label: "7. Serif Book",
        defaultTracking: 2,
        sizeCompensation: { enable: true, minSize: 10, maxSize: 14, minFactor: 1.05, maxFactor: 1.0 },
        rules: { applyToWhitespace: true, whitespaceFactor: 0.95, punctuationFactor: 0.7, applyToNumbers: false, capsLockExtraTracking: 0 }
    },
    'serif-display': {
        id: "serif-display",
        label: "8. High-Contrast Serif Display",
        defaultTracking: -15,
        sizeCompensation: { enable: true, minSize: 36, maxSize: 96, minFactor: 1.0, maxFactor: 0.9 },
        rules: { applyToWhitespace: true, whitespaceFactor: 0.7, punctuationFactor: 0.55, applyToNumbers: true, capsLockExtraTracking: 8 }
    },
    'rounded': {
        id: "rounded",
        label: "9. Rounded Display",
        defaultTracking: -25,
        sizeCompensation: { enable: true, minSize: 24, maxSize: 72, minFactor: 1.0, maxFactor: 0.9 },
        rules: { applyToWhitespace: true, whitespaceFactor: 0.65, punctuationFactor: 0.55, applyToNumbers: true, capsLockExtraTracking: 6 }
    },
    'condensed': {
        id: "condensed",
        label: "10. Condensed Sans Headline",
        defaultTracking: -10,
        sizeCompensation: { enable: true, minSize: 48, maxSize: 120, minFactor: 1.0, maxFactor: 0.9 },
        rules: { applyToWhitespace: true, whitespaceFactor: 0.6, punctuationFactor: 0.55, applyToNumbers: true, capsLockExtraTracking: 8 }
    },
    'wide-sans': {
        id: "wide-sans",
        label: "11. Wide Sans",
        defaultTracking: -35,
        sizeCompensation: { enable: true, minSize: 24, maxSize: 72, minFactor: 1.0, maxFactor: 0.9 },
        rules: { applyToWhitespace: true, whitespaceFactor: 0.7, punctuationFactor: 0.6, applyToNumbers: true, capsLockExtraTracking: 10 }
    },
    'script': {
        id: "script",
        label: "12. Script / Brush",
        defaultTracking: 0,
        sizeCompensation: { enable: false, minSize: 12, maxSize: 72, minFactor: 1, maxFactor: 1 },
        rules: { applyToWhitespace: true, whitespaceFactor: 0.7, punctuationFactor: 0.5, applyToNumbers: true, capsLockExtraTracking: 0 }
    }
};

export interface GlyphData {
  char: string;
  name: string;
  unicode: number;
  pathData: string; // SVG Path 'd' attribute
  // Dados SVG-first opcionais para preservar fidelidade quando o path original vem de um arquivo SVG.
  svgPathData?: string; // Caminho bruto do SVG (se diferente de pathData)
  svgViewBox?: [number, number, number, number]; // viewBox original [minX, minY, width, height]
  svgRaw?: string; // SVG completo, quando disponível
  isIconLike?: boolean; // Marcação para ícones/personagens complexos
  advanceWidth: number;
  leftSideBearing: number;
  baselineOffset: number;
  scale: number;
  groups: {
    left: string;
    right: string;
  };
    inheritsFrom?: string | null;
  // Shape classification for Auto-Kerning
  shapeLeft: ShapeCategory;
  shapeRight: ShapeCategory;
  
  // Semantic Flags for Tracking
  script: ScriptId;
  isWhitespace: boolean;
  isPunctuation: boolean;
  isUppercase: boolean;
  isLowercase: boolean;

  components: GlyphComponent[];
  anchors: GlyphAnchor[];
  anchorOverrides: Record<string, {x: number, y: number}>;
  kerningBias: number;
  manualPosition?: boolean;
}

export interface FontMetadata {
  familyName: string;
  styleName: string;
  designer: string;
  version: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  baselineShift?: number;
  xHeight?: number;
  capHeight?: number;
  lineGap: number;           // Entrelinhas (line gap) - espaço adicional entre linhas
  wordSpacing: number;       // Espaço entre palavras (multiplicador do espaço normal)
  tracking: number; // Keep for simple slider mapping
  trackingProfile: TrackingProfile; // Advanced rules
  isUnicase: boolean;
  kerning: Record<string, number>; 
  kerningProfile?: string;
  autoPosition?: {
    targetVisualHeight: number;
    baselineOffset: number;
    leftSideBearing: number;
    sourceChar: string;
    sourceScale: number;
  };
}

// Alias semântico para fluxos “SVG-first”. Mantém compatibilidade com GlyphData e acrescenta campos de fidelidade SVG.
export type SvgGlyphData = GlyphData;

export interface EditorState {
  selectedGlyphChar: string | null;
  zoom: number;
  previewText: string;
}

export interface Project {
  id: string;
  name: string;
  updatedAt: string;
  metadata: FontMetadata;
  styleMap: Record<string, GlyphData[]>;
}

export const INITIAL_METADATA: FontMetadata = {
  familyName: "MyCustomFont",
  styleName: "Regular",
  designer: "UNBSFONTS",
  version: "1.0",
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  baselineShift: 0,
  xHeight: 520,
  capHeight: 720,
  lineGap: 200,            // Default line gap (20% of UPM)
  wordSpacing: 250,        // Default word spacing in font units
  tracking: DEFAULT_TRACKING_PROFILES['body-text'].defaultTracking,
  trackingProfile: DEFAULT_TRACKING_PROFILES['body-text'],
  isUnicase: false,
  kerning: {},
  kerningProfile: 'sans'
};

export const COMPOSITE_RECIPES: Record<string, string[]> = {
    'Á': ['A', '´'], 'À': ['A', '`'], 'Â': ['A', '^'], 'Ä': ['A', '¨'], 'Ã': ['A', '~'],
    'É': ['E', '´'], 'È': ['E', '`'], 'Ê': ['E', '^'], 'Ë': ['E', '¨'],
    'Í': ['I', '´'], 'Ì': ['I', '`'], 'Î': ['I', '^'], 'Ï': ['I', '¨'],
    'Ó': ['O', '´'], 'Ò': ['O', '`'], 'Ô': ['O', '^'], 'Ö': ['O', '¨'], 'Õ': ['O', '~'],
    'Ú': ['U', '´'], 'Ù': ['U', '`'], 'Û': ['U', '^'], 'Ü': ['U', '¨'],
    'Ñ': ['N', '~'], 'Ç': ['C', '¸'],
    'á': ['a', '´'], 'à': ['a', '`'], 'â': ['a', '^'], 'ä': ['a', '¨'], 'ã': ['a', '~'],
    'é': ['e', '´'], 'è': ['e', '`'], 'ê': ['e', '^'], 'ë': ['e', '¨'],
    'í': ['i', '´'], 'ì': ['i', '`'], 'î': ['i', '^'], 'ï': ['i', '¨'],
    'ó': ['o', '´'], 'ò': ['o', '`'], 'ô': ['o', '^'], 'ö': ['o', '¨'], 'õ': ['o', '~'],
    'ú': ['u', '´'], 'ù': ['u', '`'], 'û': ['u', '^'], 'ü': ['u', '¨'],
    'ñ': ['n', '~'], 'ç': ['c', '¸'],
};

const guessShape = (char: string, side: 'left' | 'right'): ShapeCategory => {
    const c = char.toUpperCase();
    if (side === 'left') {
        if ("AVWY".includes(c)) return 'diagonal';
        if ("OQGC".includes(c)) return 'round';
        if ("J".includes(c)) return 'straight'; 
        if ("T".includes(c)) return 'overhang';
    } else {
        if ("AVWY".includes(c)) return 'diagonal';
        if ("OQG".includes(c)) return 'round';
        if ("D".includes(c)) return 'round';
        if ("FLT".includes(c)) return 'overhang';
        if ("P".includes(c)) return 'round';
    }
    if ("OQGCUDS".includes(c)) return 'round';
    if ("AVWYXZK".includes(c)) return 'diagonal';
    if ("TFP".includes(c)) return 'overhang';
    return 'straight';
};

const getSemanticInfo = (char: string) => {
    const code = char.charCodeAt(0);
    const isWhitespace = char === ' ' || char === '\u00A0';
    const isUppercase = code >= 65 && code <= 90;
    const isLowercase = code >= 97 && code <= 122;
    const isNumbers = code >= 48 && code <= 57;
    const isPunctuation = (code >= 33 && code <= 47) || (code >= 58 && code <= 64) || (code >= 91 && code <= 96) || (code >= 123 && code <= 126);
    
    let script: ScriptId = 'other';
    if (isUppercase || isLowercase) script = 'latin';
    else if (isNumbers) script = 'numbers';
    else if (isPunctuation) script = 'punctuation';
    
    return { isWhitespace, isUppercase, isLowercase, isPunctuation, script };
};

export const generateInitialGlyphs = (): GlyphData[] => {
  const glyphs: GlyphData[] = [];
  
  const add = (char: string, name?: string) => {
    if (glyphs.some(g => g.char === char)) return;
    
    let group = "";
    if (char.match(/[A-Z]/)) group = char;
    if (char.match(/[a-z]/)) group = char;
    if ("ÀÁÂÃÄ".includes(char)) group = "A";
    if ("ÈÉÊË".includes(char)) group = "E";
    if ("ÌÍÎÏ".includes(char)) group = "I";
    if ("ÒÓÔÕÖ".includes(char)) group = "O";
    if ("ÙÚÛÜ".includes(char)) group = "U";
    if ("àáâãä".includes(char)) group = "a";

    const semantics = getSemanticInfo(char);

    glyphs.push({
      char,
      name: name || char,
      unicode: char.charCodeAt(0),
      pathData: "",
      advanceWidth: char === ' ' ? 250 : 600, 
      leftSideBearing: 50,
      baselineOffset: 0,
      scale: 1,
      groups: { left: group, right: group },
    inheritsFrom: null,
      shapeLeft: guessShape(char, 'left'),
      shapeRight: guessShape(char, 'right'),
      ...semantics,
      components: [],
      anchors: [],
      anchorOverrides: {},
      kerningBias: 0
    });

  };

  add(" ", "space");
  for (let i = 65; i <= 90; i++) add(String.fromCharCode(i));
  for (let i = 97; i <= 122; i++) add(String.fromCharCode(i));
  for (let i = 48; i <= 57; i++) add(String.fromCharCode(i));
  const basic = ".,:;!?";
  const basicNames = ['period', 'comma', 'colon', 'semicolon', 'exclam', 'question'];
  for (let i = 0; i < basic.length; i++) add(basic[i], basicNames[i]);
  const symbols = [
      { c: '-', n: 'hyphen' }, { c: '_', n: 'underscore' },
      { c: '=', n: 'equal' }, { c: '+', n: 'plus' },
      { c: '*', n: 'asterisk' }, { c: '#', n: 'numbersign' },
      { c: '/', n: 'slash' }, { c: '\\', n: 'backslash' },
      { c: '|', n: 'bar' }, { c: '@', n: 'at' },
      { c: '&', n: 'ampersand' }, { c: '$', n: 'dollar' },
      { c: '%', n: 'percent' },
      { c: '(', n: 'parenleft' }, { c: ')', n: 'parenright' },
      { c: '[', n: 'bracketleft' }, { c: ']', n: 'bracketright' },
      { c: '{', n: 'braceleft' }, { c: '}', n: 'braceright' },
      { c: '<', n: 'less' }, { c: '>', n: 'greater' },
      { c: '"', n: 'quotedbl' }, { c: "'", n: 'quotesingle' },
      { c: '`', n: 'grave' }, { c: '^', n: 'circumflex' }, 
      { c: '~', n: 'asciitilde' },
      { c: '©', n: 'copyright' }, { c: '®', n: 'registered' }, { c: '™', n: 'trademark' },
      { c: '°', n: 'degree' }, { c: '•', n: 'bullet' }
  ];
  symbols.forEach(s => add(s.c, s.n));
  const diacritics = [{ c: '´', n: 'acute' }, { c: '¨', n: 'dieresis' }, { c: '¸', n: 'cedilla' }];
  diacritics.forEach(s => add(s.c, s.n));
  Object.keys(COMPOSITE_RECIPES).forEach(c => add(c));

  return glyphs;
};
