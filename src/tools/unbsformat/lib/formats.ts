// Formatos. Medidas conferidas contra as normas de cada família:
// ISO 216 (séries A e B), ISO 269 (série C e DL, envelopes), ANSI/ASME Y14.1 e
// uso norte-americano (Letter, Legal, Tabloid), formatos de livro correntes,
// e as medidas em pixel publicadas pelas próprias plataformas.
// Impressos ficam em mm; telas e redes sociais ficam em px e convertem a 96 px/in.

import { pxToMm } from './units';

export type FormatCategory =
  | 'iso'
  | 'us'
  | 'editorial'
  | 'dobra'
  | 'papelaria'
  | 'cartaz'
  | 'foto'
  | 'embalagem'
  | 'social'
  | 'tela'
  | 'custom';

export type FoldType = 'none' | 'half' | 'roll' | 'z' | 'gate';

export interface Sides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface FormatPreset {
  id: string;
  name: string;
  /** Na unidade nativa: mm para impresso, px para tela. */
  width: number;
  height: number;
  unit: 'mm' | 'px';
  category: FormatCategory;
  /** Área segura da plataforma, na unidade nativa (interface do app por cima da arte). */
  safeArea?: Sides;
  /** Dobra do folheto aberto. */
  fold?: FoldType;
  note?: string;
}

export const CATEGORY_LABEL: Record<FormatCategory, string> = {
  iso: 'ISO A, B e C',
  us: 'Norte-americano',
  editorial: 'Livros e revistas',
  dobra: 'Folhetos com dobra',
  papelaria: 'Papelaria',
  cartaz: 'Cartazes e sinalização',
  foto: 'Fotografia',
  embalagem: 'Etiquetas e embalagem',
  social: 'Redes sociais',
  tela: 'Telas e web',
  custom: 'Personalizado',
};

export const CATEGORY_ORDER: FormatCategory[] = [
  'iso', 'us', 'editorial', 'dobra', 'papelaria', 'cartaz', 'foto', 'embalagem', 'social', 'tela',
];

const mm = (id: string, name: string, width: number, height: number, category: FormatCategory, extra: Partial<FormatPreset> = {}): FormatPreset =>
  ({ id, name, width, height, unit: 'mm', category, ...extra });
const px = (id: string, name: string, width: number, height: number, category: FormatCategory, extra: Partial<FormatPreset> = {}): FormatPreset =>
  ({ id, name, width, height, unit: 'px', category, ...extra });

// Área segura de Reels e Stories: a Meta não publica um número único; estes são os
// valores de referência usados pelos guias de produção (topo 220 px, base 450 px,
// 35 px nas laterais). Ver lib/README.md.
const REELS_SAFE: Sides = { top: 220, right: 35, bottom: 450, left: 35 };
// Post 4:5 aparece recortado em 3:4 na grade do perfil: 1012,5 px de largura úteis.
const IG_45_GRID_SAFE: Sides = { top: 0, right: 33.75, bottom: 0, left: 33.75 };

export const FORMAT_PRESETS: FormatPreset[] = [
  // ISO 216: A(n) = 841 × 1189 mm dividido ao meio n vezes, arredondado ao mm para baixo.
  mm('a0', 'A0', 841, 1189, 'iso'),
  mm('a1', 'A1', 594, 841, 'iso'),
  mm('a2', 'A2', 420, 594, 'iso'),
  mm('a3', 'A3', 297, 420, 'iso'),
  mm('a4', 'A4', 210, 297, 'iso'),
  mm('a5', 'A5', 148, 210, 'iso'),
  mm('a6', 'A6', 105, 148, 'iso'),
  mm('a7', 'A7', 74, 105, 'iso'),
  mm('a8', 'A8', 52, 74, 'iso'),
  mm('b0', 'B0', 1000, 1414, 'iso'),
  mm('b1', 'B1', 707, 1000, 'iso'),
  mm('b2', 'B2', 500, 707, 'iso'),
  mm('b3', 'B3', 353, 500, 'iso'),
  mm('b4', 'B4', 250, 353, 'iso'),
  mm('b5', 'B5', 176, 250, 'iso'),
  mm('b6', 'B6', 125, 176, 'iso'),
  mm('c4', 'C4 (envelope para A4)', 229, 324, 'iso'),
  mm('c5', 'C5 (envelope para A5)', 162, 229, 'iso'),
  mm('c6', 'C6 (envelope para A6)', 114, 162, 'iso'),
  mm('dl', 'DL (envelope, 1/3 de A4)', 110, 220, 'iso'),
  mm('sra3', 'SRA3 (folha de impressão)', 320, 450, 'iso'),
  mm('sra4', 'SRA4 (folha de impressão)', 225, 320, 'iso'),

  // Norte-americano, em polegadas exatas.
  mm('letter', 'Letter (8,5 × 11 in)', 215.9, 279.4, 'us'),
  mm('legal', 'Legal (8,5 × 14 in)', 215.9, 355.6, 'us'),
  mm('tabloid', 'Tabloid (11 × 17 in)', 279.4, 431.8, 'us'),
  mm('half_letter', 'Half Letter / Statement (5,5 × 8,5 in)', 139.7, 215.9, 'us'),
  mm('executive', 'Executive (7,25 × 10,5 in)', 184.15, 266.7, 'us'),
  mm('gov_letter', 'Government Letter (8 × 10,5 in)', 203.2, 266.7, 'us'),
  mm('super_b', 'Super B (13 × 19 in)', 330.2, 482.6, 'us'),
  mm('env10', 'Envelope nº 10 (4,125 × 9,5 in)', 104.775, 241.3, 'us'),
  mm('oficio', 'Ofício (Brasil)', 216, 330, 'us'),

  // Livros e revistas: formatos de miolo correntes.
  mm('livro_bolso', 'Livro de bolso (110 × 178)', 110, 178, 'editorial'),
  mm('livro_14x21', 'Livro 14 × 21 cm', 140, 210, 'editorial'),
  mm('livro_155x230', 'Livro 15,5 × 23 cm', 155, 230, 'editorial'),
  mm('livro_16x23', 'Livro 16 × 23 cm', 160, 230, 'editorial'),
  mm('livro_17x24', 'Livro 17 × 24 cm', 170, 240, 'editorial'),
  mm('livro_5x8', 'Livro 5 × 8 in', 127, 203.2, 'editorial'),
  mm('livro_6x9', 'Livro 6 × 9 in', 152.4, 228.6, 'editorial'),
  mm('royal', 'Royal (156 × 234)', 156, 234, 'editorial'),
  mm('revista_205x275', 'Revista 20,5 × 27,5 cm', 205, 275, 'editorial'),
  mm('revista_us', 'Revista US (8,375 × 10,875 in)', 212.725, 276.225, 'editorial'),
  mm('revista_23x30', 'Revista 23 × 30 cm', 230, 300, 'editorial'),
  mm('cd_encarte', 'Encarte de CD', 120, 120, 'editorial'),
  mm('vinil', 'Capa de vinil 12"', 314, 314, 'editorial'),

  // Folhetos abertos: a dobra divide a folha em painéis.
  mm('folder_a4_2', 'Folder A4, uma dobra (fecha em A5)', 297, 210, 'dobra', { fold: 'half' }),
  mm('folder_a4_roll', 'Folder A4, duas dobras carteira (fecha em DL)', 297, 210, 'dobra', { fold: 'roll' }),
  mm('folder_a4_z', 'Folder A4, sanfona em Z (fecha em DL)', 297, 210, 'dobra', { fold: 'z' }),
  mm('folder_a3_2', 'Folder A3, uma dobra (fecha em A4)', 420, 297, 'dobra', { fold: 'half' }),
  mm('folder_a3_gate', 'Folder A3, dobra janela', 420, 297, 'dobra', { fold: 'gate' }),
  mm('folder_letter_roll', 'Folder Letter, duas dobras carteira', 279.4, 215.9, 'dobra', { fold: 'roll' }),

  // Papelaria
  mm('cartao_br', 'Cartão de visita 9 × 5 cm', 90, 50, 'papelaria'),
  mm('cartao_eu', 'Cartão de visita 85 × 55 mm', 85, 55, 'papelaria'),
  mm('cartao_us', 'Cartão de visita US (3,5 × 2 in)', 88.9, 50.8, 'papelaria'),
  mm('cartao_id1', 'Cartão ISO/IEC 7810 ID-1', 85.6, 53.98, 'papelaria'),
  mm('timbrado', 'Papel timbrado A4', 210, 297, 'papelaria'),
  mm('tira_cortesia', 'Tira de cortesia (1/3 de A4)', 210, 99, 'papelaria'),
  mm('marcador', 'Marcador de página', 50, 180, 'papelaria'),
  mm('certificado', 'Certificado A4 paisagem', 297, 210, 'papelaria'),

  // Cartazes e sinalização
  mm('cartaz_50x70', 'Cartaz 50 × 70 cm', 500, 700, 'cartaz'),
  mm('cartaz_70x100', 'Cartaz 70 × 100 cm', 700, 1000, 'cartaz'),
  mm('cartaz_18x24', 'Cartaz 18 × 24 in', 457.2, 609.6, 'cartaz'),
  mm('cartaz_24x36', 'Cartaz 24 × 36 in', 609.6, 914.4, 'cartaz'),
  mm('one_sheet', 'Cartaz de cinema 27 × 40 in', 685.8, 1016, 'cartaz'),
  mm('rollup', 'Roll-up 85 × 200 cm', 850, 2000, 'cartaz'),
  mm('4_sheet', 'Mídia exterior 4-sheet (40 × 60 in)', 1016, 1524, 'cartaz'),
  mm('outdoor_9x3', 'Outdoor 9 × 3 m', 9000, 3000, 'cartaz'),
  mm('mupi', 'Mobiliário urbano (MUPI) 120 × 176 cm', 1200, 1760, 'cartaz'),

  // Fotografia
  mm('foto_10x15', 'Foto 10 × 15 (4 × 6 in)', 101.6, 152.4, 'foto'),
  mm('foto_13x18', 'Foto 13 × 18 (5 × 7 in)', 127, 177.8, 'foto'),
  mm('foto_20x25', 'Foto 20 × 25 (8 × 10 in)', 203.2, 254, 'foto'),
  mm('foto_11x14', 'Foto 11 × 14 in', 279.4, 355.6, 'foto'),
  mm('foto_30x45', 'Foto 30 × 45 cm', 300, 450, 'foto'),
  mm('foto_3x4', 'Foto 3 × 4 cm', 30, 40, 'foto'),
  mm('passaporte', 'Foto de passaporte 35 × 45', 35, 45, 'foto'),

  // Etiquetas e embalagem (básico)
  mm('etiqueta_100x50', 'Etiqueta 100 × 50', 100, 50, 'embalagem'),
  mm('etiqueta_vinho', 'Rótulo de vinho 90 × 120', 90, 120, 'embalagem'),
  mm('tag', 'Tag de roupa 55 × 90', 55, 90, 'embalagem'),
  mm('etiqueta_redonda', 'Etiqueta redonda 60 mm', 60, 60, 'embalagem'),

  // Redes sociais, em pixels
  px('ig_quadrado', 'Instagram quadrado', 1080, 1080, 'social'),
  px('ig_retrato', 'Instagram retrato 4:5', 1080, 1350, 'social', { safeArea: IG_45_GRID_SAFE, note: 'Na grade do perfil aparece recortado em 3:4' }),
  px('ig_perfil', 'Instagram grade do perfil 3:4', 1080, 1440, 'social'),
  px('ig_story', 'Instagram Stories', 1080, 1920, 'social', { safeArea: REELS_SAFE }),
  px('ig_reels', 'Instagram Reels', 1080, 1920, 'social', { safeArea: REELS_SAFE }),
  px('fb_capa', 'Facebook capa', 851, 315, 'social'),
  px('fb_post', 'Facebook post', 1080, 1080, 'social'),
  px('fb_evento', 'Facebook capa de evento', 1920, 1005, 'social'),
  px('x_cabecalho', 'X cabeçalho', 1500, 500, 'social'),
  px('x_post', 'X imagem no post 16:9', 1600, 900, 'social'),
  px('li_capa', 'LinkedIn capa pessoal', 1584, 396, 'social'),
  px('li_empresa', 'LinkedIn capa de página', 1128, 191, 'social'),
  px('li_post', 'LinkedIn post com link', 1200, 627, 'social'),
  px('li_carrossel', 'LinkedIn carrossel 4:5', 1080, 1350, 'social'),
  px('yt_thumb', 'YouTube miniatura', 1280, 720, 'social'),
  px('yt_banner', 'YouTube banner do canal', 2560, 1440, 'social', { safeArea: { top: 508.5, right: 507, bottom: 508.5, left: 507 }, note: 'Área segura para todos os aparelhos: 1546 × 423 px' }),
  px('shorts', 'YouTube Shorts', 1080, 1920, 'social', { safeArea: REELS_SAFE }),
  px('tiktok', 'TikTok', 1080, 1920, 'social', { safeArea: REELS_SAFE }),
  px('pinterest', 'Pinterest pin 2:3', 1000, 1500, 'social'),
  px('og', 'Open Graph (prévia de link)', 1200, 630, 'social'),

  // Telas e web
  px('fhd', 'Full HD 1920 × 1080', 1920, 1080, 'tela'),
  px('qhd', 'QHD 2560 × 1440', 2560, 1440, 'tela'),
  px('uhd', '4K UHD 3840 × 2160', 3840, 2160, 'tela'),
  px('desktop_1440', 'Desktop 1440 × 900', 1440, 900, 'tela'),
  px('desktop_1280', 'Desktop 1280 × 800', 1280, 800, 'tela'),
  px('tablet', 'Tablet 768 × 1024', 768, 1024, 'tela'),
  px('mobile', 'Celular 390 × 844', 390, 844, 'tela'),
  px('mobile_s', 'Celular 360 × 800', 360, 800, 'tela'),
  px('slides_169', 'Apresentação 16:9', 1920, 1080, 'tela'),
  px('slides_43', 'Apresentação 4:3', 1024, 768, 'tela'),
  px('email', 'E-mail marketing (600 px)', 600, 1200, 'tela'),
  px('leaderboard', 'Banner leaderboard', 728, 90, 'tela'),
  px('retangulo_medio', 'Banner retângulo médio', 300, 250, 'tela'),
  px('arranha_ceu', 'Banner arranha-céu', 160, 600, 'tela'),
  px('app_icon', 'Ícone de app', 1024, 1024, 'tela'),
];

/** Largura e altura do formato em mm, na orientação dada. */
export function presetSizeMm(f: Pick<FormatPreset, 'width' | 'height' | 'unit'>): { width: number; height: number } {
  return f.unit === 'px'
    ? { width: pxToMm(f.width), height: pxToMm(f.height) }
    : { width: f.width, height: f.height };
}

// ---------- Proporções ----------

export interface ClassicRatio {
  id: string;
  name: string;
  /** Lado maior sobre lado menor, sempre ≥ 1. */
  value: number;
  label: string;
}

const PHI = (1 + Math.sqrt(5)) / 2;

/**
 * Escala cromática de proporções de página (Bringhurst, cap. 8), com os nomes
 * dos intervalos musicais, mais √3 e 16:9 por serem comuns em tela.
 */
export const CLASSIC_RATIOS: ClassicRatio[] = [
  { id: '1:1', name: 'Quadrado (uníssono)', value: 1, label: '1:1' },
  { id: '15:16', name: 'Segunda menor', value: 16 / 15, label: '15:16' },
  { id: '8:9', name: 'Segunda maior', value: 9 / 8, label: '8:9' },
  { id: '5:6', name: 'Terça menor', value: 6 / 5, label: '5:6' },
  { id: '4:5', name: 'Terça maior', value: 5 / 4, label: '4:5' },
  { id: '3:4', name: 'Quarta', value: 4 / 3, label: '3:4' },
  { id: 'iso', name: 'ISO, 1:√2 (quarta aumentada)', value: Math.SQRT2, label: '1:√2' },
  { id: '2:3', name: 'Quinta', value: 3 / 2, label: '2:3' },
  { id: '5:8', name: 'Sexta menor', value: 8 / 5, label: '5:8' },
  { id: 'golden', name: 'Seção áurea', value: PHI, label: '1:φ' },
  { id: '3:5', name: 'Sexta maior', value: 5 / 3, label: '3:5' },
  { id: '1:√3', name: 'Hexágono, 1:√3', value: Math.sqrt(3), label: '1:√3' },
  { id: '9:16', name: 'Sétima menor, 16:9', value: 16 / 9, label: '9:16' },
  { id: '8:15', name: 'Sétima maior', value: 15 / 8, label: '8:15' },
  { id: '1:2', name: 'Oitava', value: 2, label: '1:2' },
];

export interface RatioMatch {
  ratio: ClassicRatio;
  /** Desvio relativo, em %. */
  deviation: number;
}

/** Proporção clássica mais próxima de um retângulo, na orientação que for. */
export function nearestClassicRatio(width: number, height: number): RatioMatch | null {
  if (!(width > 0) || !(height > 0)) return null;
  const r = Math.max(width, height) / Math.min(width, height);
  let best: RatioMatch | null = null;
  for (const ratio of CLASSIC_RATIOS) {
    const deviation = (Math.abs(r - ratio.value) / ratio.value) * 100;
    if (!best || deviation < best.deviation) best = { ratio, deviation };
  }
  return best;
}
