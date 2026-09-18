// Grade recomendada para cada formato: a mais usada para aquele tipo de peça.
// Trocar de formato aplica esta grade; o método continua trocável à mão.
//
// Critérios, por família:
// - Livro: cânone de Van de Graaf, mancha na mesma proporção da página
//   (Tschichold, "The Form of the Book"; Bringhurst, cap. 8).
// - Revista, relatório e documento: grade modular sobre a linha de base
//   (Müller-Brockmann, "Grid Systems", 1981).
// - Cartaz: grade modular de campos maiores, a tradição suíça.
// - Folheto com dobra: uma coluna por painel, alinhada à dobra.
// - Papelaria, envelope, etiqueta: um bloco de texto (Samara, manuscrito).
// - Fotografia e post de rede social: terços, 3 × 3 campos.
// - Tela larga: 12 colunas (Bootstrap); celular e tablet: Material responsivo.
// - Banner pequeno e ícone: grade de 8.

import type { FormatPreset } from './formats';
import { FORMAT_PRESETS } from './formats';
import type { GridConfig, MethodId } from './grid';
import { methodInfo } from './methods';

export interface Recommendation {
  method: MethodId;
  columns?: number;
  rows?: number;
  /** Uma frase: por que esta é a grade do formato. */
  reason: string;
}

const rec = (method: MethodId, reason: string, columns?: number, rows?: number): Recommendation => ({ method, reason, columns, rows });

const BOOK = rec('vandegraaf', 'Livro: o cânone de Van de Graaf dá a mancha na proporção da página, com margens de 1/9.');
const MAGAZINE = rec('mullerbrockmann', 'Revista: grade modular de 6 × 8 campos sobre a linha de base, a base do layout editorial.', 6, 8);
const DOCUMENT = rec('mullerbrockmann', 'Documento e relatório: grade modular de 4 × 5 campos, com as linhas fechando na linha de base.', 4, 5);
const SMALL_DOC = rec('samara_colunas', 'Formato pequeno: duas colunas independentes bastam para texto e imagem.', 2);
const POSTER = rec('mullerbrockmann', 'Cartaz: grade modular de 4 × 5 campos, a tradição do cartaz suíço.', 4, 5);
const SQUARE_COVER = rec('mullerbrockmann', 'Capa quadrada: 3 × 3 campos iguais.', 3, 3);
const FOLDER = rec('samara_colunas', 'Folheto com dobra: uma coluna por painel, alinhada à dobra.', 1);
const BLOCK = rec('samara_manuscrito', 'Peça pequena de papelaria ou etiqueta: um bloco de texto com margens de 1/9.');
const THIRDS = rec('samara_modular', 'Imagem: terços, 3 × 3 campos, para compor o assunto nos cruzamentos.', 3, 3);
const WIDE_SCREEN = rec('digital12', 'Tela e banner largo: 12 colunas, que dividem em 2, 3, 4 e 6.');
const RESPONSIVE = rec('material', 'Celular, tablet e e-mail: Material responsivo, com 4, 8 ou 12 colunas pela largura.');
const EIGHT = rec('oitopt', 'Banner pequeno e ícone: tudo em múltiplos de 8.');

const BY_ID: Record<string, Recommendation> = {
  // ISO: grandes viram cartaz, envelopes e folhas de impressão são um bloco, pequenos têm duas colunas.
  a0: POSTER, a1: POSTER, a2: POSTER, b0: POSTER, b1: POSTER, b2: POSTER, b3: POSTER,
  a3: DOCUMENT, a4: DOCUMENT, b4: DOCUMENT, b5: SMALL_DOC,
  a5: SMALL_DOC, b6: SMALL_DOC, a6: BLOCK, a7: BLOCK, a8: BLOCK,
  c4: BLOCK, c5: BLOCK, c6: BLOCK, dl: BLOCK, sra3: BLOCK, sra4: BLOCK,
  // Norte-americano
  letter: DOCUMENT, legal: DOCUMENT, tabloid: DOCUMENT, executive: DOCUMENT, gov_letter: DOCUMENT, oficio: DOCUMENT,
  half_letter: SMALL_DOC, super_b: POSTER, env10: BLOCK,
  // Editorial
  livro_bolso: BOOK, livro_14x21: BOOK, livro_155x230: BOOK, livro_16x23: BOOK, livro_17x24: BOOK,
  livro_5x8: BOOK, livro_6x9: BOOK, royal: BOOK,
  revista_205x275: MAGAZINE, revista_us: MAGAZINE, revista_23x30: MAGAZINE,
  cd_encarte: SQUARE_COVER, vinil: SQUARE_COVER,
  // Papelaria
  certificado: rec('aurea', 'Certificado: margens em seção áurea, com a mancha centrada e mais ar no pé.'),
  // Redes sociais: posts e verticais em terços; capas e banners largos em 12 colunas.
  fb_capa: WIDE_SCREEN, fb_evento: WIDE_SCREEN, x_cabecalho: WIDE_SCREEN, x_post: WIDE_SCREEN,
  li_capa: WIDE_SCREEN, li_empresa: WIDE_SCREEN, li_post: WIDE_SCREEN, yt_thumb: WIDE_SCREEN,
  yt_banner: WIDE_SCREEN, og: WIDE_SCREEN,
  // Telas
  tablet: RESPONSIVE, mobile: RESPONSIVE, mobile_s: RESPONSIVE, email: RESPONSIVE,
  leaderboard: EIGHT, retangulo_medio: EIGHT, arranha_ceu: EIGHT, app_icon: EIGHT,
};

const BY_CATEGORY: Partial<Record<FormatPreset['category'], Recommendation>> = {
  editorial: BOOK,
  dobra: FOLDER,
  papelaria: BLOCK,
  cartaz: POSTER,
  foto: THIRDS,
  embalagem: BLOCK,
  social: THIRDS,
  tela: WIDE_SCREEN,
};

/** A grade mais usada para o formato. */
export function recommendFor(preset: Pick<FormatPreset, 'id' | 'category' | 'unit' | 'width' | 'height'>): Recommendation {
  const byId = BY_ID[preset.id];
  if (byId) return byId;
  const byCategory = BY_CATEGORY[preset.category];
  if (byCategory) return byCategory;
  // Personalizado: tela pela largura, impresso pelo tamanho.
  if (preset.unit === 'px') return preset.width >= 905 ? WIDE_SCREEN : RESPONSIVE;
  const long = Math.max(preset.width, preset.height);
  if (long >= 420) return POSTER;
  if (long >= 250) return DOCUMENT;
  return SMALL_DOC;
}

/** Recomendação para o formato da configuração atual. */
export function recommendForConfig(c: Pick<GridConfig, 'formatId' | 'docUnit' | 'width' | 'height'>): Recommendation {
  const preset = FORMAT_PRESETS.find(f => f.id === c.formatId);
  if (preset) return recommendFor(preset);
  return recommendFor({ id: 'custom', category: 'custom', unit: c.docUnit, width: c.width, height: c.height });
}

/** A configuração segue a recomendação? Método e, quando a recomendação fixa, colunas e linhas. */
export function followsRecommendation(c: Pick<GridConfig, 'method' | 'columns' | 'rows'>, r: Recommendation, columnCount: number): boolean {
  if (c.method !== r.method) return false;
  if (r.columns !== undefined && columnCount !== r.columns) return false;
  if (r.rows !== undefined && c.rows !== r.rows) return false;
  return true;
}

export const recommendationLabel = (r: Recommendation) => {
  const name = methodInfo(r.method).name;
  return r.columns && r.rows ? `${name}, ${r.columns} × ${r.rows}` : r.columns ? `${name}, ${r.columns} ${r.columns === 1 ? 'coluna' : 'colunas'}` : name;
};
