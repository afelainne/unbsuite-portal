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
}

export interface Project {
  version: 1;
  family: string;
  designer: string;
  metrics: Metrics;
  styles: FontStyle[];
}
