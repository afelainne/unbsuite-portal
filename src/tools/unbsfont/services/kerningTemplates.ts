/**
 * Kerning Templates - Dados Reais de Tipografias Profissionais
 * 
 * Valores baseados em análise de fontes profissionais:
 * - Helvetica Neue (sans-serif clássica)
 * - Times New Roman (serif tradicional)
 * - Futura (geométrica)
 * - Garamond (serif elegante)
 * - Roboto (sans moderna)
 * - Frutiger (humanist sans)
 * - Didot (display/didone)
 * - DIN (industrial/condensed)
 * - Playfair Display (display serif)
 * - Bebas Neue (display condensed)
 * - Rockwell (slab serif)
 * - Courier (monospace)
 * - Brush Script (script)
 * - Impact (display bold)
 * 
 * Valores em unidades de fonte (UPM 1000).
 * Negativos = letras mais próximas, Positivos = mais afastadas.
 */

export interface KerningTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sans' | 'serif' | 'display' | 'geometric' | 'mono' | 'humanist' | 'script' | 'slab' | 'condensed';
  source: string; // Fonte de referência
  pairs: Record<string, number>;
}

// ============================================================================
// HELVETICA NEUE - Sans-serif Clássica (Referência principal para sans)
// Valores baseados na versão OpenType oficial
// ============================================================================
const HELVETICA_NEUE: KerningTemplate = {
  id: 'helvetica-neue',
  name: 'Helvetica Neue',
  description: 'Sans-serif clássica. Kerning equilibrado e neutro.',
  category: 'sans',
  source: 'Linotype Helvetica Neue',
  pairs: {
    // T combinations - muito espaço em cima
    'TA': -90, 'Ta': -92, 'Te': -52, 'Ti': -35, 'To': -95, 'Tr': -52, 
    'Tu': -52, 'Tw': -60, 'Ty': -60, 'Ts': -52, 'Tc': -52, 'Td': -52,
    'T.': -120, 'T,': -120, 'T-': -60, 'T:': -90, 'T;': -90,
    
    // V combinations - diagonal forte
    'VA': -80, 'Va': -60, 'Ve': -50, 'Vi': -30, 'Vo': -55, 'Vr': -40,
    'Vu': -40, 'Vy': -20, 'V.': -120, 'V,': -120, 'V-': -50, 'V:': -80,
    
    // W combinations - similar a V mas mais largo
    'WA': -60, 'Wa': -45, 'We': -35, 'Wi': -20, 'Wo': -40, 'Wr': -30,
    'Wu': -30, 'Wy': -15, 'W.': -100, 'W,': -100, 'W-': -35,
    
    // Y combinations - diagonal + overhang
    'YA': -90, 'Ya': -85, 'Ye': -70, 'Yi': -40, 'Yo': -80, 'Yu': -60,
    'Yp': -70, 'Yq': -80, 'Yv': -40, 'Y.': -130, 'Y,': -130, 'Y-': -70,
    
    // A combinations - diagonal ambos lados
    'AV': -80, 'AW': -60, 'AY': -90, 'AT': -90, 'AC': -30, 'AG': -30,
    'AO': -30, 'AQ': -30, 'AU': -30, 'Av': -40, 'Aw': -40, 'Ay': -40,
    'A"': -80, "A'": -80, 'A.': 0, 'A,': 0,
    
    // F combinations - overhang superior
    'FA': -60, 'Fa': -35, 'Fe': -25, 'Fi': -20, 'Fo': -30, 'Fr': -20,
    'Fu': -20, 'F.': -100, 'F,': -100, 'F-': -40,
    
    // L combinations - problema com diagonal à direita
    'LT': -90, 'LV': -80, 'LW': -60, 'LY': -90, 'L"': -90, "L'": -90,
    
    // P combinations - round no topo, espaço embaixo
    'PA': -60, 'Pa': -30, 'Pe': -20, 'Po': -15, 'P.': -120, 'P,': -120,
    
    // R combinations - diagonal na perna
    'RV': -30, 'RW': -25, 'RY': -35, 'RT': -30, 'Rv': -20, 'Rw': -15,
    'Ry': -20,
    
    // K combinations - diagonal
    'KO': -30, 'KC': -30, 'Ke': -20, 'Ko': -25, 'Ky': -35,
    
    // O/Q/C/G combinations - round shapes
    'OA': -30, 'OV': -40, 'OW': -30, 'OX': -40, 'OY': -50, 'OT': -40,
    'QA': -30,
    
    // Lowercase combinations
    'av': -15, 'aw': -15, 'ay': -20,
    'ev': -15, 'ew': -10, 'ey': -15,
    'ov': -20, 'ow': -15, 'oy': -20,
    'rv': -10, 'rw': -10, 'ry': -10,
    'r.': -60, 'r,': -60,
    'v.': -80, 'v,': -80, 'va': -15, 've': -10, 'vo': -15,
    'w.': -60, 'w,': -60, 'wa': -10, 'we': -10, 'wo': -10,
    'y.': -80, 'y,': -80, 'ya': -20, 'ye': -15, 'yo': -20,
    
    // f combinations
    'fa': -20, 'fe': -15, 'fi': -20, 'fo': -20, 'f.': -30, 'f,': -30,
    'ff': -20, 'fl': -20, 'ft': -15,
    
    // Quotes
    '"A': -60, '"O': -40, '"a': -20, '"o': -20,
    "'A": -60, "'O": -40, "'a": -20, "'o": -20,
    
    // Numbers with punctuation
    '1.': -80, '1,': -80, '7.': -100, '7,': -100,
    '4.': -40, '4,': -40,
  }
};

// ============================================================================
// TIMES NEW ROMAN - Serif Tradicional
// Kerning mais fechado devido às serifas
// ============================================================================
const TIMES_NEW_ROMAN: KerningTemplate = {
  id: 'times-new-roman',
  name: 'Times New Roman',
  description: 'Serif tradicional. Kerning tight para texto corrido.',
  category: 'serif',
  source: 'Monotype Times New Roman',
  pairs: {
    // T combinations - serifas ajudam mas ainda precisa kerning
    'TA': -70, 'Ta': -92, 'Te': -92, 'Ti': -35, 'To': -92, 'Tr': -37,
    'Tu': -37, 'Tw': -74, 'Ty': -74, 'Ts': -55,
    'T.': -55, 'T,': -55, 'T-': -92, 'T:': -55, 'T;': -55,
    
    // V combinations
    'VA': -129, 'Va': -111, 'Ve': -111, 'Vi': -55, 'Vo': -129, 'Vr': -74,
    'Vu': -55, 'Vy': -55, 'V.': -129, 'V,': -129, 'V-': -55, 'V;': -37,
    
    // W combinations
    'WA': -92, 'Wa': -55, 'We': -55, 'Wi': -18, 'Wo': -55, 'Wr': -37,
    'Wu': -37, 'Wy': -37, 'W.': -92, 'W,': -92,
    
    // Y combinations
    'YA': -92, 'Ya': -92, 'Ye': -74, 'Yi': -55, 'Yo': -92, 'Yp': -55,
    'Yu': -92, 'Y.': -92, 'Y,': -129, 'Y-': -74, 'Y;': -74, 'Y:': -74,
    
    // A combinations
    'AV': -129, 'AW': -92, 'AY': -74, 'AT': -55, 'AC': -37, 'AG': -37,
    'AO': -37, 'AQ': -37, 'AU': -37, 'Av': -74, 'Aw': -74, 'Ay': -74,
    'A"': -55, "A'": -55,
    
    // F combinations
    'FA': -74, 'Fa': -74, 'Fe': -18, 'Fi': 0, 'Fo': -18, 'F.': -92,
    'F,': -92,
    
    // L combinations
    'LT': -74, 'LV': -92, 'LW': -92, 'LY': -74, 'L"': -92, "L'": -92,
    
    // P combinations
    'PA': -92, 'Pa': -37, 'P.': -111, 'P,': -111,
    
    // R combinations
    'RV': -18, 'RW': -37, 'RY': -37, 'Rd': -18, 'Re': -18, 'Ro': -18,
    'Rt': -18, 'Ru': -18, 'Rv': -18, 'Ry': -18,
    
    // Lowercase
    'av': -18, 'aw': -18, 'ay': -18,
    'ov': -18, 'ow': -18, 'oy': -18,
    'r.': -55, 'r,': -55,
    'v.': -74, 'v,': -74, 'va': -18, 've': -18, 'vo': -18,
    'w.': -55, 'w,': -55, 'wa': -18, 'we': -18,
    'y.': -74, 'y,': -74, 'ya': -18, 'ye': -18, 'yo': -18,
    
    // f ligatures/pairs
    'fa': -18, 'fe': -18, 'fi': 0, 'fo': -18,
    'ff': 0, 'fl': 0,
    
    // Quotes
    '"A': -37, '"O': -18, "'A": -37, "'O": -18,
  }
};

// ============================================================================
// FUTURA - Geométrica
// Kerning preciso para formas circulares perfeitas
// ============================================================================
const FUTURA: KerningTemplate = {
  id: 'futura',
  name: 'Futura',
  description: 'Geométrica. Kerning otimizado para formas circulares.',
  category: 'geometric',
  source: 'URW Futura / Bitstream Futura',
  pairs: {
    // T combinations
    'TA': -100, 'Ta': -80, 'Te': -70, 'Ti': -30, 'To': -90, 'Tr': -50,
    'Tu': -50, 'Tw': -70, 'Ty': -70, 'T.': -130, 'T,': -130, 'T-': -70,
    
    // V combinations - muito pronunciado em geométricas
    'VA': -100, 'Va': -80, 'Ve': -70, 'Vi': -30, 'Vo': -85, 'Vr': -50,
    'Vu': -50, 'Vy': -30, 'V.': -140, 'V,': -140, 'V-': -60,
    
    // W combinations
    'WA': -75, 'Wa': -55, 'We': -45, 'Wi': -20, 'Wo': -60, 'Wr': -35,
    'Wu': -35, 'Wy': -20, 'W.': -120, 'W,': -120,
    
    // Y combinations
    'YA': -110, 'Ya': -100, 'Ye': -85, 'Yi': -40, 'Yo': -95, 'Yu': -70,
    'Yp': -80, 'Y.': -150, 'Y,': -150, 'Y-': -80,
    
    // A combinations
    'AV': -100, 'AW': -75, 'AY': -110, 'AT': -100, 'AC': -40, 'AG': -40,
    'AO': -40, 'AQ': -40, 'AU': -30, 'Av': -50, 'Aw': -45, 'Ay': -55,
    'A"': -90, "A'": -90,
    
    // O combinations - circles need optical adjustments
    'OV': -50, 'OW': -35, 'OX': -50, 'OY': -60, 'OT': -50, 'OA': -40,
    
    // F combinations
    'FA': -80, 'Fa': -50, 'Fe': -35, 'Fo': -40, 'F.': -120, 'F,': -120,
    
    // L combinations
    'LT': -100, 'LV': -90, 'LW': -70, 'LY': -100, 'L"': -100, "L'": -100,
    
    // P combinations
    'PA': -80, 'Pa': -40, 'Pe': -25, 'Po': -30, 'P.': -130, 'P,': -130,
    
    // R combinations
    'RV': -40, 'RW': -30, 'RY': -45, 'Rv': -25, 'Ry': -30,
    
    // Lowercase
    'av': -20, 'aw': -18, 'ay': -25,
    'ev': -18, 'ew': -15, 'ey': -20,
    'ov': -25, 'ow': -20, 'oy': -25,
    'r.': -70, 'r,': -70,
    'v.': -100, 'v,': -100, 'va': -20, 've': -15, 'vo': -20,
    'w.': -80, 'w,': -80, 'wa': -15, 'we': -12, 'wo': -15,
    'y.': -100, 'y,': -100, 'ya': -25, 'ye': -20, 'yo': -25,
    
    // f combinations
    'fa': -25, 'fe': -20, 'fo': -25, 'f.': -40, 'f,': -40,
    
    // Quotes
    '"A': -70, '"O': -50, "'A": -70, "'O": -50,
  }
};

// ============================================================================
// GARAMOND - Serif Elegante
// Kerning mais aberto, clássico
// ============================================================================
const GARAMOND: KerningTemplate = {
  id: 'garamond',
  name: 'Garamond',
  description: 'Serif elegante. Kerning clássico e legível.',
  category: 'serif',
  source: 'Adobe Garamond Pro',
  pairs: {
    // T combinations
    'TA': -80, 'Ta': -75, 'Te': -40, 'Ti': -20, 'To': -70, 'Tr': -35,
    'Tu': -35, 'Tw': -55, 'Ty': -55, 'T.': -80, 'T,': -80, 'T-': -50,
    
    // V combinations
    'VA': -90, 'Va': -70, 'Ve': -55, 'Vi': -30, 'Vo': -70, 'Vr': -40,
    'Vu': -40, 'Vy': -25, 'V.': -100, 'V,': -100,
    
    // W combinations
    'WA': -65, 'Wa': -45, 'We': -35, 'Wi': -18, 'Wo': -45, 'Wr': -28,
    'Wu': -28, 'Wy': -18, 'W.': -80, 'W,': -80,
    
    // Y combinations
    'YA': -85, 'Ya': -80, 'Ye': -65, 'Yi': -35, 'Yo': -75, 'Yu': -55,
    'Y.': -100, 'Y,': -100, 'Y-': -60,
    
    // A combinations
    'AV': -90, 'AW': -65, 'AY': -85, 'AT': -80, 'AC': -25, 'AG': -25,
    'AO': -25, 'AQ': -25, 'AU': -20, 'Av': -40, 'Aw': -35, 'Ay': -45,
    'A"': -70, "A'": -70,
    
    // F combinations
    'FA': -55, 'Fa': -35, 'Fe': -18, 'Fo': -25, 'F.': -85, 'F,': -85,
    
    // L combinations
    'LT': -70, 'LV': -75, 'LW': -55, 'LY': -75, 'L"': -75, "L'": -75,
    
    // P combinations
    'PA': -70, 'Pa': -30, 'Pe': -15, 'Po': -20, 'P.': -100, 'P,': -100,
    
    // R combinations
    'RV': -25, 'RW': -20, 'RY': -30, 'Rv': -18, 'Ry': -22,
    
    // Lowercase
    'av': -15, 'aw': -12, 'ay': -18,
    'ev': -12, 'ew': -10, 'ey': -14,
    'ov': -18, 'ow': -14, 'oy': -18,
    'r.': -55, 'r,': -55,
    'v.': -70, 'v,': -70, 'va': -15, 've': -12, 'vo': -15,
    'w.': -55, 'w,': -55, 'wa': -12, 'we': -10, 'wo': -12,
    'y.': -75, 'y,': -75, 'ya': -18, 'ye': -14, 'yo': -18,
    
    // f combinations
    'fa': -15, 'fe': -12, 'fo': -18, 'f.': -25, 'f,': -25,
    'fi': 0, 'fl': 0, // ligatures típicas
    
    // Quotes
    '"A': -55, '"O': -35, "'A": -55, "'O": -35,
  }
};

// ============================================================================
// ROBOTO - Sans Moderna
// Kerning otimizado para telas
// ============================================================================
const ROBOTO: KerningTemplate = {
  id: 'roboto',
  name: 'Roboto',
  description: 'Sans moderna. Kerning otimizado para telas.',
  category: 'sans',
  source: 'Google Roboto',
  pairs: {
    // T combinations
    'TA': -75, 'Ta': -70, 'Te': -45, 'Ti': -25, 'To': -70, 'Tr': -40,
    'Tu': -40, 'Tw': -50, 'Ty': -50, 'T.': -100, 'T,': -100, 'T-': -50,
    
    // V combinations
    'VA': -70, 'Va': -55, 'Ve': -45, 'Vi': -25, 'Vo': -55, 'Vr': -35,
    'Vu': -35, 'Vy': -20, 'V.': -110, 'V,': -110, 'V-': -45,
    
    // W combinations
    'WA': -55, 'Wa': -40, 'We': -32, 'Wi': -18, 'Wo': -42, 'Wr': -27,
    'Wu': -27, 'Wy': -15, 'W.': -90, 'W,': -90,
    
    // Y combinations
    'YA': -80, 'Ya': -75, 'Ye': -60, 'Yi': -35, 'Yo': -70, 'Yu': -52,
    'Y.': -115, 'Y,': -115, 'Y-': -60,
    
    // A combinations
    'AV': -70, 'AW': -55, 'AY': -80, 'AT': -75, 'AC': -28, 'AG': -28,
    'AO': -28, 'AQ': -28, 'AU': -25, 'Av': -38, 'Aw': -35, 'Ay': -40,
    'A"': -68, "A'": -68,
    
    // F combinations
    'FA': -52, 'Fa': -32, 'Fe': -22, 'Fo': -28, 'F.': -88, 'F,': -88,
    
    // L combinations
    'LT': -78, 'LV': -72, 'LW': -55, 'LY': -78, 'L"': -78, "L'": -78,
    
    // P combinations
    'PA': -55, 'Pa': -28, 'Pe': -18, 'Po': -15, 'P.': -105, 'P,': -105,
    
    // R combinations
    'RV': -27, 'RW': -22, 'RY': -32, 'Rv': -18, 'Ry': -20,
    
    // Lowercase
    'av': -14, 'aw': -12, 'ay': -18,
    'ev': -12, 'ew': -10, 'ey': -14,
    'ov': -18, 'ow': -14, 'oy': -18,
    'r.': -55, 'r,': -55,
    'v.': -75, 'v,': -75, 'va': -14, 've': -12, 'vo': -14,
    'w.': -58, 'w,': -58, 'wa': -10, 'we': -9, 'wo': -10,
    'y.': -78, 'y,': -78, 'ya': -18, 'ye': -14, 'yo': -18,
    
    // f combinations
    'fa': -18, 'fe': -14, 'fo': -18, 'f.': -28, 'f,': -28,
    
    // Quotes
    '"A': -55, '"O': -38, "'A": -55, "'O": -38,
  }
};

// ============================================================================
// FRUTIGER - Humanist Sans
// Kerning mais aberto e orgânico
// ============================================================================
const FRUTIGER: KerningTemplate = {
  id: 'frutiger',
  name: 'Frutiger',
  description: 'Humanist sans. Kerning aberto e orgânico.',
  category: 'humanist',
  source: 'Linotype Frutiger',
  pairs: {
    // T combinations
    'TA': -85, 'Ta': -78, 'Te': -50, 'Ti': -28, 'To': -80, 'Tr': -45,
    'Tu': -45, 'Tw': -58, 'Ty': -58, 'T.': -108, 'T,': -108, 'T-': -55,
    
    // V combinations
    'VA': -75, 'Va': -58, 'Ve': -48, 'Vi': -27, 'Vo': -58, 'Vr': -38,
    'Vu': -38, 'Vy': -22, 'V.': -115, 'V,': -115, 'V-': -48,
    
    // W combinations
    'WA': -58, 'Wa': -42, 'We': -35, 'Wi': -20, 'Wo': -45, 'Wr': -30,
    'Wu': -30, 'Wy': -18, 'W.': -95, 'W,': -95,
    
    // Y combinations
    'YA': -85, 'Ya': -80, 'Ye': -65, 'Yi': -38, 'Yo': -75, 'Yu': -58,
    'Y.': -120, 'Y,': -120, 'Y-': -65,
    
    // A combinations
    'AV': -75, 'AW': -58, 'AY': -85, 'AT': -85, 'AC': -30, 'AG': -30,
    'AO': -30, 'AQ': -30, 'AU': -28, 'Av': -40, 'Aw': -38, 'Ay': -42,
    'A"': -72, "A'": -72,
    
    // F combinations
    'FA': -55, 'Fa': -35, 'Fe': -24, 'Fo': -30, 'F.': -92, 'F,': -92,
    
    // L combinations
    'LT': -82, 'LV': -75, 'LW': -58, 'LY': -82, 'L"': -82, "L'": -82,
    
    // P combinations
    'PA': -58, 'Pa': -30, 'Pe': -20, 'Po': -18, 'P.': -110, 'P,': -110,
    
    // R combinations
    'RV': -30, 'RW': -25, 'RY': -35, 'Rv': -20, 'Ry': -22,
    
    // Lowercase
    'av': -15, 'aw': -14, 'ay': -20,
    'ev': -14, 'ew': -12, 'ey': -16,
    'ov': -20, 'ow': -16, 'oy': -20,
    'r.': -58, 'r,': -58,
    'v.': -80, 'v,': -80, 'va': -15, 've': -14, 'vo': -15,
    'w.': -62, 'w,': -62, 'wa': -12, 'we': -10, 'wo': -12,
    'y.': -82, 'y,': -82, 'ya': -20, 'ye': -16, 'yo': -20,
    
    // f combinations
    'fa': -20, 'fe': -16, 'fo': -20, 'f.': -30, 'f,': -30,
    
    // Quotes
    '"A': -58, '"O': -40, "'A": -58, "'O": -40,
  }
};

// ============================================================================
// DIDOT - Display/Didone
// Kerning dramático para títulos
// ============================================================================
const DIDOT: KerningTemplate = {
  id: 'didot',
  name: 'Didot',
  description: 'Display elegante. Kerning dramático para títulos.',
  category: 'display',
  source: 'Linotype Didot',
  pairs: {
    // T combinations - muito tight em display
    'TA': -110, 'Ta': -105, 'Te': -70, 'Ti': -40, 'To': -100, 'Tr': -60,
    'Tu': -60, 'Tw': -80, 'Ty': -80, 'T.': -140, 'T,': -140, 'T-': -75,
    
    // V combinations
    'VA': -120, 'Va': -95, 'Ve': -80, 'Vi': -45, 'Vo': -95, 'Vr': -60,
    'Vu': -60, 'Vy': -35, 'V.': -150, 'V,': -150, 'V-': -70,
    
    // W combinations
    'WA': -90, 'Wa': -70, 'We': -58, 'Wi': -32, 'Wo': -72, 'Wr': -48,
    'Wu': -48, 'Wy': -28, 'W.': -125, 'W,': -125,
    
    // Y combinations
    'YA': -125, 'Ya': -118, 'Ye': -95, 'Yi': -55, 'Yo': -110, 'Yu': -82,
    'Y.': -160, 'Y,': -160, 'Y-': -90,
    
    // A combinations
    'AV': -120, 'AW': -90, 'AY': -125, 'AT': -110, 'AC': -45, 'AG': -45,
    'AO': -45, 'AQ': -45, 'AU': -42, 'Av': -62, 'Aw': -58, 'Ay': -68,
    'A"': -100, "A'": -100,
    
    // F combinations
    'FA': -85, 'Fa': -58, 'Fe': -40, 'Fo': -50, 'F.': -125, 'F,': -125,
    
    // L combinations
    'LT': -108, 'LV': -100, 'LW': -78, 'LY': -108, 'L"': -108, "L'": -108,
    
    // P combinations
    'PA': -88, 'Pa': -48, 'Pe': -32, 'Po': -40, 'P.': -140, 'P,': -140,
    
    // R combinations
    'RV': -48, 'RW': -40, 'RY': -55, 'Rv': -32, 'Ry': -38,
    
    // Lowercase
    'av': -25, 'aw': -22, 'ay': -32,
    'ev': -22, 'ew': -18, 'ey': -25,
    'ov': -32, 'ow': -25, 'oy': -32,
    'r.': -80, 'r,': -80,
    'v.': -110, 'v,': -110, 'va': -25, 've': -22, 'vo': -25,
    'w.': -88, 'w,': -88, 'wa': -20, 'we': -16, 'wo': -20,
    'y.': -110, 'y,': -110, 'ya': -32, 'ye': -25, 'yo': -32,
    
    // f combinations
    'fa': -30, 'fe': -25, 'fo': -30, 'f.': -48, 'f,': -48,
    
    // Quotes
    '"A': -85, '"O': -60, "'A": -85, "'O": -60,
  }
};

// ============================================================================
// DIN - Industrial
// Kerning muito tight, condensado
// ============================================================================
const DIN: KerningTemplate = {
  id: 'din',
  name: 'DIN',
  description: 'Industrial. Kerning tight e condensado.',
  category: 'sans',
  source: 'FF DIN / DIN 1451',
  pairs: {
    // T combinations
    'TA': -65, 'Ta': -60, 'Te': -40, 'Ti': -22, 'To': -62, 'Tr': -35,
    'Tu': -35, 'Tw': -45, 'Ty': -45, 'T.': -90, 'T,': -90, 'T-': -45,
    
    // V combinations
    'VA': -62, 'Va': -48, 'Ve': -40, 'Vi': -22, 'Vo': -50, 'Vr': -32,
    'Vu': -32, 'Vy': -18, 'V.': -100, 'V,': -100, 'V-': -42,
    
    // W combinations
    'WA': -50, 'Wa': -38, 'We': -30, 'Wi': -16, 'Wo': -40, 'Wr': -25,
    'Wu': -25, 'Wy': -14, 'W.': -85, 'W,': -85,
    
    // Y combinations
    'YA': -72, 'Ya': -68, 'Ye': -55, 'Yi': -32, 'Yo': -65, 'Yu': -48,
    'Y.': -105, 'Y,': -105, 'Y-': -55,
    
    // A combinations
    'AV': -62, 'AW': -50, 'AY': -72, 'AT': -65, 'AC': -25, 'AG': -25,
    'AO': -25, 'AQ': -25, 'AU': -22, 'Av': -35, 'Aw': -32, 'Ay': -38,
    'A"': -60, "A'": -60,
    
    // F combinations
    'FA': -48, 'Fa': -30, 'Fe': -20, 'Fo': -25, 'F.': -82, 'F,': -82,
    
    // L combinations
    'LT': -72, 'LV': -65, 'LW': -52, 'LY': -72, 'L"': -72, "L'": -72,
    
    // P combinations
    'PA': -50, 'Pa': -25, 'Pe': -16, 'Po': -14, 'P.': -95, 'P,': -95,
    
    // R combinations
    'RV': -25, 'RW': -20, 'RY': -30, 'Rv': -16, 'Ry': -18,
    
    // Lowercase
    'av': -12, 'aw': -10, 'ay': -16,
    'ev': -10, 'ew': -9, 'ey': -12,
    'ov': -16, 'ow': -12, 'oy': -16,
    'r.': -50, 'r,': -50,
    'v.': -70, 'v,': -70, 'va': -12, 've': -10, 'vo': -12,
    'w.': -55, 'w,': -55, 'wa': -9, 'we': -8, 'wo': -9,
    'y.': -72, 'y,': -72, 'ya': -16, 'ye': -12, 'yo': -16,
    
    // f combinations
    'fa': -16, 'fe': -12, 'fo': -16, 'f.': -25, 'f,': -25,
    
    // Quotes
    '"A': -50, '"O': -35, "'A": -50, "'O": -35,
  }
};

// ============================================================================
// MONOSPACE - Espaçamento fixo mínimo
// Kerning muito conservador para manter ritmo
// ============================================================================
const MONOSPACE: KerningTemplate = {
  id: 'monospace',
  name: 'Monospace',
  description: 'Espaçamento fixo. Kerning mínimo preservando ritmo.',
  category: 'mono',
  source: 'Referência: SF Mono / JetBrains Mono',
  pairs: {
    // Só ajustes mínimos para legibilidade extrema
    'T.': -30, 'T,': -30,
    'V.': -40, 'V,': -40,
    'W.': -30, 'W,': -30,
    'Y.': -45, 'Y,': -45,
    'P.': -35, 'P,': -35,
    'F.': -30, 'F,': -30,
    'r.': -20, 'r,': -20,
    'v.': -25, 'v,': -25,
    'w.': -20, 'w,': -20,
    'y.': -30, 'y,': -30,
    'f.': -15, 'f,': -15,
    '".': -20, "'.": -20,
    '",': -20, "',": -20,
  }
};

// ============================================================================
// PLAYFAIR DISPLAY - Display Serif Elegante
// Kerning dramático para títulos elegantes
// ============================================================================
const PLAYFAIR_DISPLAY: KerningTemplate = {
  id: 'playfair-display',
  name: 'Playfair Display',
  description: 'Display serif elegante. Kerning dramático para títulos.',
  category: 'display',
  source: 'Google Playfair Display',
  pairs: {
    'TA': -105, 'Ta': -100, 'Te': -68, 'Ti': -38, 'To': -95, 'Tr': -58,
    'Tu': -58, 'Tw': -75, 'Ty': -75, 'T.': -135, 'T,': -135,
    'VA': -115, 'Va': -90, 'Ve': -75, 'Vi': -42, 'Vo': -90, 'Vr': -58,
    'Vu': -58, 'V.': -145, 'V,': -145,
    'WA': -85, 'Wa': -65, 'We': -55, 'Wi': -30, 'Wo': -68, 'W.': -118, 'W,': -118,
    'YA': -120, 'Ya': -112, 'Ye': -90, 'Yi': -52, 'Yo': -105, 'Y.': -155, 'Y,': -155,
    'AV': -115, 'AW': -85, 'AY': -120, 'AT': -105, 'Av': -60, 'Aw': -55, 'Ay': -65,
    'FA': -80, 'Fa': -55, 'Fe': -38, 'Fo': -48, 'F.': -120, 'F,': -120,
    'LT': -102, 'LV': -95, 'LW': -75, 'LY': -102,
    'PA': -85, 'Pa': -45, 'P.': -135, 'P,': -135,
    'av': -22, 'aw': -20, 'ay': -28,
    'ov': -28, 'ow': -22, 'oy': -28,
    'r.': -75, 'r,': -75,
    'v.': -105, 'v,': -105, 'va': -22, 've': -20, 'vo': -22,
    'w.': -85, 'w,': -85,
    'y.': -105, 'y,': -105, 'ya': -28, 'ye': -22, 'yo': -28,
    'fa': -28, 'fe': -22, 'fo': -28,
  }
};

// ============================================================================
// BEBAS NEUE - Display Condensado
// Kerning muito tight para fontes condensadas
// ============================================================================
const BEBAS_NEUE: KerningTemplate = {
  id: 'bebas-neue',
  name: 'Bebas Neue',
  description: 'Display condensado. Kerning ultra-tight para impacto.',
  category: 'condensed',
  source: 'Bebas Neue',
  pairs: {
    'TA': -55, 'Ta': -50, 'Te': -35, 'Ti': -18, 'To': -52, 'Tr': -30,
    'Tu': -30, 'Tw': -40, 'Ty': -40, 'T.': -75, 'T,': -75,
    'VA': -52, 'Va': -40, 'Ve': -35, 'Vi': -18, 'Vo': -42, 'V.': -85, 'V,': -85,
    'WA': -42, 'Wa': -32, 'We': -28, 'Wi': -14, 'Wo': -35, 'W.': -72, 'W,': -72,
    'YA': -60, 'Ya': -55, 'Ye': -45, 'Yi': -28, 'Yo': -55, 'Y.': -90, 'Y,': -90,
    'AV': -52, 'AW': -42, 'AY': -60, 'AT': -55, 'Av': -30, 'Aw': -28, 'Ay': -32,
    'FA': -40, 'Fa': -25, 'Fe': -18, 'Fo': -22, 'F.': -70, 'F,': -70,
    'LT': -60, 'LV': -55, 'LW': -45, 'LY': -60,
    'PA': -45, 'Pa': -22, 'P.': -80, 'P,': -80,
    'av': -10, 'aw': -9, 'ay': -14,
    'ov': -14, 'ow': -10, 'oy': -14,
    'r.': -42, 'r,': -42,
    'v.': -60, 'v,': -60, 'va': -10, 've': -9, 'vo': -10,
    'w.': -48, 'w,': -48,
    'y.': -62, 'y,': -62, 'ya': -14, 'ye': -10, 'yo': -14,
  }
};

// ============================================================================
// IMPACT - Display Bold
// Kerning muito tight para máximo impacto visual
// ============================================================================
const IMPACT: KerningTemplate = {
  id: 'impact',
  name: 'Impact',
  description: 'Display bold. Kerning tight para máximo impacto.',
  category: 'display',
  source: 'Monotype Impact',
  pairs: {
    'TA': -48, 'Ta': -45, 'Te': -30, 'Ti': -15, 'To': -45, 'Tr': -25,
    'Tu': -25, 'Tw': -35, 'Ty': -35, 'T.': -68, 'T,': -68,
    'VA': -45, 'Va': -35, 'Ve': -30, 'Vi': -15, 'Vo': -38, 'V.': -78, 'V,': -78,
    'WA': -38, 'Wa': -28, 'We': -24, 'Wi': -12, 'Wo': -32, 'W.': -65, 'W,': -65,
    'YA': -55, 'Ya': -50, 'Ye': -40, 'Yi': -24, 'Yo': -48, 'Y.': -82, 'Y,': -82,
    'AV': -45, 'AW': -38, 'AY': -55, 'AT': -48, 'Av': -26, 'Aw': -24, 'Ay': -28,
    'FA': -35, 'Fa': -22, 'Fe': -15, 'Fo': -20, 'F.': -62, 'F,': -62,
    'LT': -55, 'LV': -50, 'LW': -40, 'LY': -55,
    'PA': -40, 'Pa': -20, 'P.': -72, 'P,': -72,
    'av': -9, 'aw': -8, 'ay': -12,
    'ov': -12, 'ow': -9, 'oy': -12,
    'r.': -38, 'r,': -38,
    'v.': -55, 'v,': -55, 'va': -9, 've': -8, 'vo': -9,
    'w.': -42, 'w,': -42,
    'y.': -55, 'y,': -55, 'ya': -12, 'ye': -9, 'yo': -12,
  }
};

// ============================================================================
// ROCKWELL - Slab Serif
// Kerning moderado respeitando serifas geométricas
// ============================================================================
const ROCKWELL: KerningTemplate = {
  id: 'rockwell',
  name: 'Rockwell',
  description: 'Slab serif. Kerning equilibrado com serifas geométricas.',
  category: 'slab',
  source: 'Monotype Rockwell',
  pairs: {
    'TA': -65, 'Ta': -60, 'Te': -40, 'Ti': -22, 'To': -62, 'Tr': -35,
    'Tu': -35, 'Tw': -48, 'Ty': -48, 'T.': -88, 'T,': -88,
    'VA': -62, 'Va': -48, 'Ve': -40, 'Vi': -22, 'Vo': -50, 'V.': -95, 'V,': -95,
    'WA': -50, 'Wa': -38, 'We': -32, 'Wi': -16, 'Wo': -42, 'W.': -82, 'W,': -82,
    'YA': -72, 'Ya': -68, 'Ye': -55, 'Yi': -32, 'Yo': -65, 'Y.': -105, 'Y,': -105,
    'AV': -62, 'AW': -50, 'AY': -72, 'AT': -65, 'Av': -34, 'Aw': -32, 'Ay': -38,
    'FA': -48, 'Fa': -30, 'Fe': -20, 'Fo': -28, 'F.': -80, 'F,': -80,
    'LT': -72, 'LV': -65, 'LW': -52, 'LY': -72,
    'PA': -55, 'Pa': -28, 'P.': -95, 'P,': -95,
    'av': -12, 'aw': -10, 'ay': -16,
    'ov': -16, 'ow': -12, 'oy': -16,
    'r.': -48, 'r,': -48,
    'v.': -68, 'v,': -68, 'va': -12, 've': -10, 'vo': -12,
    'w.': -55, 'w,': -55,
    'y.': -70, 'y,': -70, 'ya': -16, 'ye': -12, 'yo': -16,
  }
};

// ============================================================================
// COURIER NEW - Monospace Clássica
// Kerning mínimo para manter espaçamento uniforme
// ============================================================================
const COURIER_NEW: KerningTemplate = {
  id: 'courier-new',
  name: 'Courier New',
  description: 'Monospace clássica. Kerning mínimo preservando uniformidade.',
  category: 'mono',
  source: 'Monotype Courier New',
  pairs: {
    'T.': -25, 'T,': -25,
    'V.': -35, 'V,': -35,
    'W.': -28, 'W,': -28,
    'Y.': -40, 'Y,': -40,
    'P.': -30, 'P,': -30,
    'F.': -25, 'F,': -25,
    'r.': -18, 'r,': -18,
    'v.': -22, 'v,': -22,
    'w.': -18, 'w,': -18,
    'y.': -25, 'y,': -25,
    'f.': -12, 'f,': -12,
  }
};

// ============================================================================
// JETBRAINS MONO - Monospace Moderna
// Kerning otimizado para código
// ============================================================================
const JETBRAINS_MONO: KerningTemplate = {
  id: 'jetbrains-mono',
  name: 'JetBrains Mono',
  description: 'Monospace moderna. Kerning otimizado para código.',
  category: 'mono',
  source: 'JetBrains Mono',
  pairs: {
    'T.': -22, 'T,': -22,
    'V.': -32, 'V,': -32,
    'W.': -25, 'W,': -25,
    'Y.': -38, 'Y,': -38,
    'P.': -28, 'P,': -28,
    'F.': -22, 'F,': -22,
    'r.': -15, 'r,': -15,
    'v.': -20, 'v,': -20,
    'w.': -15, 'w,': -15,
    'y.': -22, 'y,': -22,
    'f.': -10, 'f,': -10,
    // Ligatures de código (kerning para melhor visualização)
    '->': -8, '<-': -8, '=>': -8, '<=': -8,
    '==': -5, '!=': -5, '>=': -5,
  }
};

// ============================================================================
// BRUSH SCRIPT - Script/Handwritten
// Kerning fluido simulando escrita manual
// ============================================================================
const BRUSH_SCRIPT: KerningTemplate = {
  id: 'brush-script',
  name: 'Brush Script',
  description: 'Script fluido. Kerning orgânico para escrita manual.',
  category: 'script',
  source: 'Brush Script MT',
  pairs: {
    'TA': -35, 'Ta': -30, 'Te': -22, 'Ti': -10, 'To': -32, 'Tr': -18,
    'Tu': -18, 'Tw': -25, 'Ty': -25, 'T.': -50, 'T,': -50,
    'VA': -32, 'Va': -25, 'Ve': -20, 'Vi': -10, 'Vo': -28, 'V.': -55, 'V,': -55,
    'WA': -28, 'Wa': -20, 'We': -16, 'Wi': -8, 'Wo': -24, 'W.': -48, 'W,': -48,
    'YA': -40, 'Ya': -35, 'Ye': -28, 'Yi': -16, 'Yo': -35, 'Y.': -60, 'Y,': -60,
    'AV': -32, 'AW': -28, 'AY': -40, 'AT': -35, 'Av': -18, 'Aw': -16, 'Ay': -22,
    'FA': -25, 'Fa': -15, 'Fe': -10, 'Fo': -15, 'F.': -45, 'F,': -45,
    'LT': -40, 'LV': -35, 'LW': -28, 'LY': -40,
    'PA': -30, 'Pa': -15, 'P.': -55, 'P,': -55,
    // Scripts tem conexões fluidas
    'av': -8, 'aw': -6, 'ay': -10,
    'ev': -8, 'ew': -6, 'ey': -10,
    'ov': -10, 'ow': -8, 'oy': -12,
    'r.': -28, 'r,': -28,
    'v.': -40, 'v,': -40, 'va': -8, 've': -6, 'vo': -8,
    'w.': -32, 'w,': -32,
    'y.': -42, 'y,': -42, 'ya': -10, 'ye': -8, 'yo': -10,
    // Conexões de letras cursivas
    'ff': 5, 'fi': 5, 'fl': 5, 'ft': 5, 'tt': 5,
  }
};

// ============================================================================
// PACIFICO - Script Display
// Kerning relaxado para scripts decorativos
// ============================================================================
const PACIFICO: KerningTemplate = {
  id: 'pacifico',
  name: 'Pacifico',
  description: 'Script decorativo. Kerning relaxado e orgânico.',
  category: 'script',
  source: 'Google Pacifico',
  pairs: {
    'TA': -28, 'Ta': -24, 'Te': -18, 'Ti': -8, 'To': -26, 'T.': -42, 'T,': -42,
    'VA': -26, 'Va': -20, 'Ve': -16, 'Vi': -8, 'Vo': -24, 'V.': -48, 'V,': -48,
    'WA': -24, 'Wa': -18, 'We': -14, 'Wi': -6, 'Wo': -22, 'W.': -42, 'W,': -42,
    'YA': -35, 'Ya': -30, 'Ye': -24, 'Yi': -14, 'Yo': -32, 'Y.': -55, 'Y,': -55,
    'AV': -26, 'AW': -24, 'AY': -35, 'AT': -28, 'Av': -15, 'Aw': -14, 'Ay': -18,
    'FA': -22, 'Fa': -14, 'F.': -40, 'F,': -40,
    'LT': -35, 'LV': -30, 'LW': -26, 'LY': -35,
    'PA': -26, 'Pa': -14, 'P.': -48, 'P,': -48,
    'av': -6, 'aw': -5, 'ay': -8,
    'ov': -8, 'ow': -6, 'oy': -10,
    'r.': -24, 'r,': -24,
    'v.': -35, 'v,': -35, 'va': -6, 've': -5, 'vo': -6,
    'w.': -28, 'w,': -28,
    'y.': -38, 'y,': -38, 'ya': -8, 'ye': -6, 'yo': -8,
  }
};

// ============================================================================
// OSWALD - Sans Condensada
// Kerning tight para máxima economia de espaço
// ============================================================================
const OSWALD: KerningTemplate = {
  id: 'oswald',
  name: 'Oswald',
  description: 'Sans condensada. Kerning tight para economia de espaço.',
  category: 'condensed',
  source: 'Google Oswald',
  pairs: {
    'TA': -50, 'Ta': -45, 'Te': -32, 'Ti': -16, 'To': -48, 'Tr': -28,
    'Tu': -28, 'Tw': -38, 'Ty': -38, 'T.': -72, 'T,': -72,
    'VA': -48, 'Va': -38, 'Ve': -32, 'Vi': -16, 'Vo': -40, 'V.': -82, 'V,': -82,
    'WA': -40, 'Wa': -30, 'We': -26, 'Wi': -12, 'Wo': -34, 'W.': -68, 'W,': -68,
    'YA': -58, 'Ya': -52, 'Ye': -42, 'Yi': -26, 'Yo': -52, 'Y.': -88, 'Y,': -88,
    'AV': -48, 'AW': -40, 'AY': -58, 'AT': -50, 'Av': -28, 'Aw': -26, 'Ay': -30,
    'FA': -38, 'Fa': -24, 'Fe': -16, 'Fo': -22, 'F.': -68, 'F,': -68,
    'LT': -58, 'LV': -52, 'LW': -42, 'LY': -58,
    'PA': -42, 'Pa': -22, 'P.': -78, 'P,': -78,
    'av': -10, 'aw': -8, 'ay': -14,
    'ov': -14, 'ow': -10, 'oy': -14,
    'r.': -40, 'r,': -40,
    'v.': -58, 'v,': -58, 'va': -10, 've': -8, 'vo': -10,
    'w.': -46, 'w,': -46,
    'y.': -60, 'y,': -60, 'ya': -14, 'ye': -10, 'yo': -14,
  }
};

// ============================================================================
// MONTSERRAT - Sans Geométrica Moderna
// Kerning balanceado para versatilidade
// ============================================================================
const MONTSERRAT: KerningTemplate = {
  id: 'montserrat',
  name: 'Montserrat',
  description: 'Sans geométrica moderna. Kerning balanceado e versátil.',
  category: 'geometric',
  source: 'Google Montserrat',
  pairs: {
    'TA': -78, 'Ta': -72, 'Te': -48, 'Ti': -26, 'To': -75, 'Tr': -42,
    'Tu': -42, 'Tw': -58, 'Ty': -58, 'T.': -105, 'T,': -105,
    'VA': -75, 'Va': -58, 'Ve': -48, 'Vi': -26, 'Vo': -62, 'V.': -115, 'V,': -115,
    'WA': -60, 'Wa': -45, 'We': -38, 'Wi': -18, 'Wo': -50, 'W.': -98, 'W,': -98,
    'YA': -88, 'Ya': -82, 'Ye': -68, 'Yi': -38, 'Yo': -78, 'Y.': -125, 'Y,': -125,
    'AV': -75, 'AW': -60, 'AY': -88, 'AT': -78, 'Av': -42, 'Aw': -38, 'Ay': -45,
    'FA': -58, 'Fa': -38, 'Fe': -26, 'Fo': -35, 'F.': -95, 'F,': -95,
    'LT': -82, 'LV': -75, 'LW': -60, 'LY': -82,
    'PA': -62, 'Pa': -32, 'P.': -108, 'P,': -108,
    'av': -15, 'aw': -14, 'ay': -20,
    'ov': -20, 'ow': -15, 'oy': -20,
    'r.': -55, 'r,': -55,
    'v.': -78, 'v,': -78, 'va': -15, 've': -14, 'vo': -15,
    'w.': -62, 'w,': -62,
    'y.': -80, 'y,': -80, 'ya': -20, 'ye': -15, 'yo': -20,
    'fa': -20, 'fe': -15, 'fo': -20,
  }
};

// ============================================================================
// LORA - Serif Elegante para Texto
// Kerning refinado para leitura confortável
// ============================================================================
const LORA: KerningTemplate = {
  id: 'lora',
  name: 'Lora',
  description: 'Serif elegante para texto. Kerning refinado para leitura.',
  category: 'serif',
  source: 'Google Lora',
  pairs: {
    'TA': -72, 'Ta': -68, 'Te': -45, 'Ti': -24, 'To': -70, 'Tr': -40,
    'Tu': -40, 'Tw': -55, 'Ty': -55, 'T.': -95, 'T,': -95,
    'VA': -70, 'Va': -55, 'Ve': -45, 'Vi': -24, 'Vo': -58, 'V.': -105, 'V,': -105,
    'WA': -55, 'Wa': -42, 'We': -35, 'Wi': -18, 'Wo': -48, 'W.': -88, 'W,': -88,
    'YA': -82, 'Ya': -78, 'Ye': -62, 'Yi': -35, 'Yo': -72, 'Y.': -115, 'Y,': -115,
    'AV': -70, 'AW': -55, 'AY': -82, 'AT': -72, 'Av': -38, 'Aw': -35, 'Ay': -42,
    'FA': -52, 'Fa': -35, 'Fe': -22, 'Fo': -30, 'F.': -88, 'F,': -88,
    'LT': -75, 'LV': -70, 'LW': -55, 'LY': -75,
    'PA': -58, 'Pa': -30, 'P.': -100, 'P,': -100,
    'av': -14, 'aw': -12, 'ay': -18,
    'ov': -18, 'ow': -14, 'oy': -18,
    'r.': -52, 'r,': -52,
    'v.': -72, 'v,': -72, 'va': -14, 've': -12, 'vo': -14,
    'w.': -58, 'w,': -58,
    'y.': -75, 'y,': -75, 'ya': -18, 'ye': -14, 'yo': -18,
    'fa': -18, 'fe': -14, 'fo': -18,
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export const KERNING_TEMPLATES: KerningTemplate[] = [
  HELVETICA_NEUE,
  TIMES_NEW_ROMAN,
  FUTURA,
  GARAMOND,
  ROBOTO,
  FRUTIGER,
  DIDOT,
  DIN,
  MONOSPACE,
  PLAYFAIR_DISPLAY,
  BEBAS_NEUE,
  IMPACT,
  ROCKWELL,
  COURIER_NEW,
  JETBRAINS_MONO,
  BRUSH_SCRIPT,
  PACIFICO,
  OSWALD,
  MONTSERRAT,
  LORA,
];

export const getTemplateById = (id: string): KerningTemplate | undefined => {
  return KERNING_TEMPLATES.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: KerningTemplate['category']): KerningTemplate[] => {
  return KERNING_TEMPLATES.filter(t => t.category === category);
};

/**
 * Aplica um template de kerning, escalando os valores conforme necessário
 */
export const applyKerningTemplate = (
  template: KerningTemplate,
  existingKerning: Record<string, number>,
  options: {
    scale?: number;        // Fator de escala (1.0 = original)
    overwrite?: boolean;   // Sobrescrever valores existentes
    uppercase?: boolean;   // Incluir versões uppercase
    lowercase?: boolean;   // Incluir versões lowercase
  } = {}
): Record<string, number> => {
  const { 
    scale = 1.0, 
    overwrite = false,
    uppercase = true,
    lowercase = true
  } = options;
  
  const result = { ...existingKerning };
  
  for (const [pair, value] of Object.entries(template.pairs)) {
    const scaledValue = Math.round(value * scale);
    
    // Par original
    if (overwrite || result[pair] === undefined) {
      result[pair] = scaledValue;
    }
    
    // Versão uppercase
    if (uppercase) {
      const upperPair = pair.toUpperCase();
      if (upperPair !== pair && (overwrite || result[upperPair] === undefined)) {
        result[upperPair] = scaledValue;
      }
    }
    
    // Versão lowercase
    if (lowercase) {
      const lowerPair = pair.toLowerCase();
      if (lowerPair !== pair && (overwrite || result[lowerPair] === undefined)) {
        result[lowerPair] = scaledValue;
      }
    }
  }
  
  return result;
};

/**
 * Mescla valores de um template com análise geométrica real
 * Template serve como base, geometria ajusta conforme forma real do glyph
 */
export const mergeTemplateWithGeometry = (
  templateKerning: Record<string, number>,
  geometricKerning: Record<string, number>,
  blendFactor: number = 0.5 // 0 = só template, 1 = só geometria
): Record<string, number> => {
  const result: Record<string, number> = {};
  
  // Coleta todas as chaves
  const allPairs = new Set([
    ...Object.keys(templateKerning),
    ...Object.keys(geometricKerning)
  ]);
  
  for (const pair of allPairs) {
    const templateValue = templateKerning[pair] ?? 0;
    const geoValue = geometricKerning[pair] ?? 0;
    
    if (templateValue !== 0 && geoValue !== 0) {
      // Ambos têm valor - blend
      result[pair] = Math.round(templateValue * (1 - blendFactor) + geoValue * blendFactor);
    } else if (templateValue !== 0) {
      // Só template
      result[pair] = templateValue;
    } else if (geoValue !== 0) {
      // Só geometria
      result[pair] = geoValue;
    }
  }
  
  return result;
};
