/**
 * Modelo de dados do UNBSFONT.
 *
 * O desenho de cada glifo é guardado como veio do SVG, em unidades da fonte
 * de origem: x a partir da borda esquerda da tinta, y para cima com a linha de
 * base em 0. Na hora de montar a fonte ele passa por uma única transformação
 * afim (escala e translação), então os pontos que o designer desenhou chegam
 * intactos ao arquivo.
 */

export type Cmd =
  | { type: 'M'; x: number; y: number }
  | { type: 'L'; x: number; y: number }
  | { type: 'Q'; x1: number; y1: number; x: number; y: number }
  | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: 'Z' };

export interface Glyph {
  char: string;
  /** Contornos em unidades de origem: tinta começa em x = 0, linha de base em y = 0, y para cima. */
  outline: Cmd[];
  /** Altura das maiúsculas na unidade de origem. A escala do glifo é `capHeight / srcCap`. */
  srcCap: number;
  /** Fator extra de escala só deste glifo (1 = o mesmo da folha). */
  scale: number;
  /** Deslocamento vertical em unidades da fonte. */
  yOffset: number;
  /** Margens laterais em unidades da fonte. */
  lsb: number;
  rsb: number;
  /** Margens ajustadas à mão: o espaçamento automático não mexe. */
  locked: boolean;
  /** Glifo que não foi desenhado: sai de outro (unicase) ou da letra-base com um sinal (composto). */
  derived?: Derivation;
}

/**
 * De onde vem um glifo derivado. Ele é refeito a cada mudança a partir da
 * origem, então o desenho, as margens e o kerning acompanham.
 */
export interface Derivation {
  kind: 'unicase' | 'composite';
  /** Unicase: o caractere copiado. Composto: a letra-base usada (pode ser o ı sem pingo). */
  from: string;
  /** Composto: o sinal de acento (caractere de espaçamento, como ´). */
  mark?: string;
  /** Criado pelo modo unicase ou pela composição automática (some quando ela desliga). */
  auto: boolean;
  /** Composto: observação para quem desenha (por exemplo, o pingo do i retirado). */
  note?: string;
}

/** Unicase: 'upper' põe as maiúsculas no lugar das minúsculas; 'lower', o contrário. */
export type UnicaseMode = 'off' | 'upper' | 'lower';

export interface CaseSettings {
  unicase: UnicaseMode;
  /** Compõe os acentuados que faltam a partir da letra-base e do sinal desenhados. */
  compose: boolean;
  /** Compõe também os acentuados do Latin Extended-A (Ă, Č, Ő…), além dos do Latin-1. */
  composeExtended: boolean;
  /** Unidades somadas à distância do acento sobre as maiúsculas (negativo: mais baixo). */
  capAccentOffset: number;
  /** Ajuste fino do acento de cada composto, em unidades. */
  nudges: Record<string, { dx: number; dy: number }>;
  /** Caracteres cuja derivação foi desfeita: ficam vazios até serem desenhados ou copiados. */
  detached: string[];
}

export interface Metrics {
  unitsPerEm: number;
  ascender: number;
  /** Negativo. */
  descender: number;
  capHeight: number;
  xHeight: number;
  lineGap: number;
  spaceWidth: number;
}

export interface SpacingSettings {
  /** Multiplica o espaço de referência (1 = 100%). */
  factor: number;
  /** Unidades somadas a cada glifo, metade de cada lado. */
  tracking: number;
}

export interface KerningSettings {
  /** 0 a 1,5. */
  strength: number;
  scope: 'common' | 'all';
  useClasses: boolean;
}

export interface KerningState {
  /** Valores automáticos, por par de classes (`esq|dir`, cada lado a letra-líder da classe). */
  auto: Record<string, number>;
  /** Ajustes à mão, que o automático nunca sobrescreve. */
  manual: Record<string, number>;
  settings: KerningSettings;
}

export interface FontStyle {
  id: string;
  name: string;
  glyphs: Record<string, Glyph>;
  spacing: SpacingSettings;
  kerning: KerningState;
  /** Altura das maiúsculas da última fonte de origem (para colar glifo avulso na mesma escala). */
  srcCap?: number;
  /** Unicase e acentos compostos. Ausente em projetos antigos: vale o padrão. */
  cases?: CaseSettings;
}

export interface Project {
  version: 1;
  family: string;
  designer: string;
  metrics: Metrics;
  styles: FontStyle[];
}
