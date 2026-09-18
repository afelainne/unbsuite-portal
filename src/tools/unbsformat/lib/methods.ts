// Métodos de construção. Cada um recebe a configuração atual e devolve outra,
// com margens, colunas e linhas tiradas da literatura (fontes em lib/README.md).
// Nenhum mexe no formato, na sangria nem na área de segurança.

import { closeGrid, GridConfig, Margins, MethodId, Rect } from './grid';
import { mmToPx, ptToMm, pxToMm } from './units';

export const PHI = (1 + Math.sqrt(5)) / 2;

export type MethodGroup = 'livre' | 'canon' | 'modular' | 'samara' | 'digital';

export interface MethodInfo {
  id: MethodId;
  name: string;
  group: MethodGroup;
  summary: string;
  source: string;
  /** Tem linhas de construção para desenhar. */
  construction: boolean;
}

export const METHOD_GROUP_LABEL: Record<MethodGroup, string> = {
  livre: 'Livre',
  canon: 'Cânones do livro',
  modular: 'Grade modular',
  samara: 'Tipos de grade (Samara)',
  digital: 'Digital',
};

export const METHODS: MethodInfo[] = [
  { id: 'livre', name: 'Livre', group: 'livre', summary: 'Margens, colunas e linhas definidas à mão.', source: '', construction: false },
  {
    id: 'vandegraaf', name: 'Cânone de Van de Graaf', group: 'canon',
    summary: 'Diagonais da página e do espelho. Margens de 1/9 e 2/9; mancha na proporção da página.',
    source: 'J. A. van de Graaf (1946), divulgado por Tschichold', construction: true,
  },
  {
    id: 'villard', name: 'Diagrama de Villard', group: 'canon',
    summary: 'Divisão harmônica de Villard de Honnecourt levada até o nono. Mesmo resultado do cânone.',
    source: 'Villard de Honnecourt (séc. XIII), segundo Tschichold', construction: true,
  },
  {
    id: 'tschichold', name: 'Tschichold 2:3:4:6', group: 'canon',
    summary: 'Margens interna, superior, externa e inferior na razão 2:3:4:6; altura da mancha igual à largura da página.',
    source: 'Jan Tschichold, The Form of the Book (1975)', construction: true,
  },
  {
    id: 'rosarivo9', name: 'Rosarivo, em nonos', group: 'canon',
    summary: 'Página dividida em 9 × 9. Uma parte na lombada e no topo, duas no corte e no pé.',
    source: 'Raúl Rosarivo, Divina proporción tipográfica (1947)', construction: true,
  },
  {
    id: 'rosarivo12', name: 'Rosarivo, em doze avos', group: 'canon',
    summary: 'Página dividida em 12 × 12. Mancha maior, para livros de uso.',
    source: 'Raúl Rosarivo, Divina proporción tipográfica (1947)', construction: true,
  },
  {
    id: 'aurea', name: 'Margens em seção áurea', group: 'canon',
    summary: 'Mancha com 1/φ da largura e da altura; lombada:corte e topo:pé na razão 1:φ.',
    source: 'Construção pela seção áurea, ver Bringhurst, cap. 8', construction: true,
  },
  {
    id: 'mullerbrockmann', name: 'Müller-Brockmann', group: 'modular',
    summary: 'Campos com número inteiro de linhas; medianiz de uma linha nas duas direções.',
    source: 'Josef Müller-Brockmann, Grid Systems in Graphic Design (1981)', construction: false,
  },
  {
    id: 'gerstner', name: 'Gerstner, 58 unidades', group: 'modular',
    summary: 'Mancha em 58 unidades: serve 1, 2, 3, 4, 5 e 6 colunas ao mesmo tempo, com medianiz de 2 unidades.',
    source: 'Karl Gerstner, Designing Programmes (1964), grade da revista Capital', construction: true,
  },
  { id: 'samara_manuscrito', name: 'Manuscrito', group: 'samara', summary: 'Um bloco de texto. Livro, ensaio.', source: 'Timothy Samara, Making and Breaking the Grid (2002)', construction: false },
  { id: 'samara_colunas', name: 'Colunas', group: 'samara', summary: 'Colunas independentes para informação descontínua.', source: 'Timothy Samara, Making and Breaking the Grid (2002)', construction: false },
  { id: 'samara_modular', name: 'Modular', group: 'samara', summary: 'Colunas e linhas formando módulos.', source: 'Timothy Samara, Making and Breaking the Grid (2002)', construction: false },
  { id: 'samara_hierarquico', name: 'Hierárquica', group: 'samara', summary: 'Colunas de larguras diferentes, pela importância do conteúdo.', source: 'Timothy Samara, Making and Breaking the Grid (2002)', construction: false },
  { id: 'digital12', name: '12 colunas', group: 'digital', summary: '12 colunas, medianiz de 24 px (16 px abaixo de 600 px).', source: 'Bootstrap 5, sistema de grade', construction: false },
  { id: 'material', name: 'Material responsivo', group: 'digital', summary: '4, 8 ou 12 colunas conforme a largura; margens de 16 ou 32.', source: 'Material Design 2, responsive layout grid', construction: false },
  { id: 'oitopt', name: 'Grade de 8 pt', group: 'digital', summary: 'Tudo em múltiplos de 8: margens, medianizes e linha de base.', source: 'Convenção de grade de 8 pontos (Material, iOS)', construction: false },
];

export const methodInfo = (id: MethodId) => METHODS.find(m => m.id === id) ?? METHODS[0];

// ---------- Margens dos cânones ----------

/** Van de Graaf, Villard e Rosarivo em n partes: 1/n na lombada e no topo, 2/n no corte e no pé. */
export function canonMargins(width: number, height: number, n = 9): Margins {
  return { inside: width / n, outside: (2 * width) / n, top: height / n, bottom: (2 * height) / n };
}

/**
 * Tschichold: interna:superior:externa:inferior = 2:3:4:6 e altura da mancha igual
 * à largura da página. Com u a unidade: H − 9u = W, logo u = (H − W)/9.
 * Numa página 2:3 dá exatamente o cânone de Van de Graaf. Em página deitada ou
 * quadrada a condição não tem solução; cai para o cânone em nonos.
 */
export function tschicholdMargins(width: number, height: number): Margins | null {
  if (height <= width) return null;
  const u = (height - width) / 9;
  return { inside: 2 * u, top: 3 * u, outside: 4 * u, bottom: 6 * u };
}

/** Seção áurea: mancha com W/φ × H/φ; sobras repartidas na razão 1:φ. */
export function goldenMargins(width: number, height: number): Margins {
  const restW = width - width / PHI;
  const restH = height - height / PHI;
  const inside = restW / (1 + PHI);
  const top = restH / (1 + PHI);
  return { inside, outside: restW - inside, top, bottom: restH - top };
}

/** Largura de uma unidade Gerstner e as larguras de coluna para 1 a 6 colunas. */
export function gerstnerDivisions(textWidth: number) {
  const unit = textWidth / 58;
  return [1, 2, 3, 4, 5, 6].map(columns => {
    const gutterUnits = 2;
    const columnUnits = (58 - gutterUnits * (columns - 1)) / columns;
    return { columns, columnUnits, columnWidth: columnUnits * unit, gutter: gutterUnits * unit, unit };
  });
}

const snap = (v: number, step: number) => Math.max(step, Math.round(v / step) * step);

// ---------- Aplicar ----------

export interface MethodOptions {
  columns?: number;
  rows?: number;
}

/** Aplica um método à configuração. Métodos modulares já saem com a grade fechada. */
export function applyMethod(id: MethodId, c: GridConfig, opts: MethodOptions = {}): GridConfig {
  const W = c.width;
  const H = c.height;
  const screen = c.docUnit === 'px';
  const base: GridConfig = { ...c, method: id, margins: { ...c.margins }, baseline: { ...c.baseline }, columnRatios: null };
  const oneBlock = { columns: 1, rows: 1 };
  // Cânones pensam o espelho: ligam páginas espelhadas no impresso sem dobra.
  const book = c.fold === 'none' && !screen ? true : c.facing;

  switch (id) {
    case 'livre':
      return { ...base, columnRatios: c.columnRatios };

    case 'vandegraaf':
    case 'villard':
    case 'rosarivo9':
      return { ...base, ...oneBlock, facing: book, margins: canonMargins(W, H, 9) };

    case 'rosarivo12':
      return { ...base, ...oneBlock, facing: book, margins: canonMargins(W, H, 12) };

    case 'tschichold':
      return {
        ...base, ...oneBlock,
        facing: book,
        margins: tschicholdMargins(W, H) ?? canonMargins(W, H, 9),
      };

    case 'aurea':
      return { ...base, ...oneBlock, facing: book, margins: goldenMargins(W, H) };

    case 'samara_manuscrito':
      return { ...base, ...oneBlock, margins: canonMargins(W, H, 9) };

    case 'samara_colunas':
      return { ...base, columns: opts.columns ?? 3, rows: 1, baseline: { ...base.baseline, columnGutterLines: base.baseline.enabled ? 1 : 0 } };

    case 'samara_hierarquico':
      return { ...base, columns: 2, rows: 1, columnRatios: [1, 2] };

    case 'samara_modular':
    case 'mullerbrockmann': {
      const leading = base.baseline.leading > 0 ? base.baseline.leading : ptToMm(12);
      const next: GridConfig = {
        ...base,
        columns: opts.columns ?? (id === 'mullerbrockmann' ? 4 : 3),
        rows: opts.rows ?? (id === 'mullerbrockmann' ? 5 : 3),
        baseline: { ...base.baseline, enabled: true, leading, rowGutterLines: 1, columnGutterLines: 1 },
      };
      return closeGrid(next).config;
    }

    case 'gerstner': {
      // Gerstner na Capital: unidade = entrelinha do texto (10 pt), 58 unidades na largura.
      const textW = W - base.margins.inside - base.margins.outside;
      const unit = textW / 58;
      const cols = Math.min(6, Math.max(1, Math.round(opts.columns ?? (c.columns >= 1 && c.columns <= 6 ? c.columns : 6))));
      const next: GridConfig = {
        ...base,
        columns: cols,
        columnGutter: 2 * unit,
        rows: opts.rows ?? c.rows,
        baseline: { ...base.baseline, enabled: true, leading: unit, offset: 0, rowGutterLines: 2, columnGutterLines: 0 },
      };
      return closeGrid(next).config;
    }

    case 'digital12': {
      const wPx = mmToPx(W);
      const gutterPx = wPx < 600 ? 16 : 24;
      const marginPx = screen ? snap(wPx * 0.05, 8) : 0;
      return {
        ...base,
        columns: 12,
        rows: 1,
        columnGutter: screen ? pxToMm(gutterPx) : ptToMm(12),
        baseline: { ...base.baseline, columnGutterLines: 0 },
        margins: screen
          ? { top: pxToMm(marginPx), bottom: pxToMm(marginPx), inside: pxToMm(marginPx), outside: pxToMm(marginPx) }
          : base.margins,
      };
    }

    case 'material': {
      const wPx = mmToPx(W);
      const cols = wPx < 600 ? 4 : wPx < 905 ? 8 : 12;
      const marginPx = wPx < 600 ? 16 : 32;
      const gutterPx = wPx < 600 ? 16 : 24;
      return {
        ...base,
        columns: cols,
        rows: 1,
        columnGutter: pxToMm(gutterPx),
        baseline: { ...base.baseline, columnGutterLines: 0 },
        margins: { top: pxToMm(marginPx), bottom: pxToMm(marginPx), inside: pxToMm(marginPx), outside: pxToMm(marginPx) },
      };
    }

    case 'oitopt': {
      // Em tela, 8 px; em impresso, 8 pt.
      const step = screen ? pxToMm(8) : ptToMm(8);
      const m = base.margins;
      const next: GridConfig = {
        ...base,
        columnGutter: snap(base.columnGutter, 2 * step),
        margins: { top: snap(m.top, step), bottom: snap(m.bottom, step), inside: snap(m.inside, step), outside: snap(m.outside, step) },
        baseline: { ...base.baseline, enabled: true, leading: step, offset: 0, rowGutterLines: 2, columnGutterLines: 0 },
      };
      // Margens laterais ficam nos múltiplos de 8; a coluna é que flutua.
      return closeGrid(next, { horizontal: false }).config;
    }
  }
  return base;
}

// ---------- Linhas de construção ----------

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Linha principal (diagonal) ou auxiliar. */
  kind: 'main' | 'aux';
}

/**
 * Linhas de construção de uma página W × H cuja lombada está em x = spineX.
 * `dir` = +1 quando a página se estende para a direita da lombada (recto),
 * −1 quando para a esquerda (verso). Coordenadas da folha, em mm.
 */
function canonSegmentsForPage(method: MethodId, spineX: number, dir: 1 | -1, W: number, H: number, textBlock: Rect): Segment[] {
  const X = (u: number) => spineX + dir * u; // u = distância a partir da lombada
  const segs: Segment[] = [];
  const seg = (u1: number, y1: number, u2: number, y2: number, kind: Segment['kind'] = 'aux') =>
    segs.push({ x1: X(u1), y1, x2: X(u2), y2, kind });

  if (method === 'rosarivo9' || method === 'rosarivo12') {
    const n = method === 'rosarivo9' ? 9 : 12;
    for (let i = 1; i < n; i++) {
      seg((W * i) / n, 0, (W * i) / n, H);
      seg(0, (H * i) / n, W, (H * i) / n);
    }
    seg(0, 0, W, H, 'main');
    return segs;
  }

  if (method === 'aurea') {
    seg(0, 0, W, H, 'main');
    seg(0, H, W, 0, 'main');
    return segs;
  }

  // Van de Graaf, Villard e Tschichold partilham as diagonais.
  // Diagonal da página: do topo da lombada ao pé do corte.
  seg(0, 0, W, H, 'main');
  // Diagonal do espelho, que nesta página vai do topo do corte ao pé da lombada, e continua além dela.
  seg(W, 0, -W, H, 'main');

  if (method === 'villard') {
    // Escada harmônica: a reta do pé da lombada ao ponto W/(k−1) no topo corta a
    // diagonal em W/k. A vertical desse ponto sobe ao topo e alimenta o passo seguinte.
    // (A diagonal da página e a diagonal da meia página dão o meio: k = 2.)
    for (let k = 2; k <= 9; k++) {
      const uk = W / k;
      const yk = H / k;
      seg(0, H, W / (k - 1), 0);
      seg(uk, yk, uk, 0);
    }
    return segs;
  }

  // Van de Graaf: P = W/3, H/3; vertical até o topo em Q; reta de Q ao ponto
  // simétrico na outra página; onde ela corta a diagonal fica o canto da mancha.
  // (Tschichold usa só as diagonais e a mancha.)
  if (method === 'vandegraaf') {
    seg(W / 3, H / 3, W / 3, 0);
    seg(W / 3, 0, -W / 3, H / 3);
  }
  // Mancha resultante: horizontal até a diagonal do espelho, vertical até a da página.
  const u0 = (textBlock.x - spineX) * dir;
  const u1 = u0 + textBlock.w;
  const uIn = Math.min(u0, u1);
  const uOut = Math.max(u0, u1);
  seg(uIn, textBlock.y, uOut, textBlock.y);
  seg(uOut, textBlock.y, uOut, textBlock.y + textBlock.h);
  return segs;
}

export interface ConstructionInput {
  method: MethodId;
  width: number;
  height: number;
  pages: { side: string; trim: Rect; textBlock: Rect }[];
  gerstnerUnit?: number;
}

/** Linhas de construção de todas as páginas do layout. */
export function constructionLines(input: ConstructionInput): Segment[] {
  const { method, height: H } = input;
  const info = methodInfo(method);
  if (!info.construction) return [];

  if (method === 'gerstner') {
    // As 58 unidades da mancha, em cada página.
    const segs: Segment[] = [];
    input.pages.forEach(p => {
      const unit = p.textBlock.w / 58;
      for (let i = 0; i <= 58; i++) {
        const x = p.textBlock.x + i * unit;
        segs.push({ x1: x, y1: p.textBlock.y, x2: x, y2: p.textBlock.y + p.textBlock.h, kind: i % 10 === 0 ? 'main' : 'aux' });
      }
    });
    return segs;
  }

  const segs: Segment[] = [];
  input.pages.forEach(p => {
    const W = p.trim.w;
    if (p.side === 'verso') {
      segs.push(...canonSegmentsForPage(method, p.trim.x + W, -1, W, H, p.textBlock));
    } else {
      segs.push(...canonSegmentsForPage(method, p.trim.x, 1, W, H, p.textBlock));
    }
  });
  return segs;
}
