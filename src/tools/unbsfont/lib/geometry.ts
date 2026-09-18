import type { Cmd } from './types';

export type Pt = [number, number];
export interface Box { x0: number; y0: number; x1: number; y1: number }

export const emptyBox = (): Box => ({ x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
export const boxWidth = (b: Box) => b.x1 - b.x0;
export const boxHeight = (b: Box) => b.y1 - b.y0;
export const unionBox = (a: Box, b: Box): Box => ({
  x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1),
});

/** Divide comandos numa lista de contornos, cada um começando em M. */
export function splitContours(cmds: Cmd[]): Cmd[][] {
  const out: Cmd[][] = [];
  let cur: Cmd[] = [];
  for (const c of cmds) {
    if (c.type === 'M') {
      if (cur.length > 1) out.push(cur);
      cur = [c];
    } else if (c.type === 'Z') {
      if (cur.length > 1) out.push([...cur, c]);
      cur = [];
    } else if (cur.length) {
      cur.push(c);
    }
  }
  if (cur.length > 1) out.push([...cur, { type: 'Z' }]);
  return out;
}

/** Transformação afim [a b c d e f] aplicada a todos os pontos. Curvas continuam exatas. */
export function mapCmds(cmds: Cmd[], f: (x: number, y: number) => Pt): Cmd[] {
  return cmds.map((c): Cmd => {
    switch (c.type) {
      case 'M':
      case 'L': {
        const [x, y] = f(c.x, c.y);
        return { type: c.type, x, y };
      }
      case 'Q': {
        const [x1, y1] = f(c.x1, c.y1);
        const [x, y] = f(c.x, c.y);
        return { type: 'Q', x1, y1, x, y };
      }
      case 'C': {
        const [x1, y1] = f(c.x1, c.y1);
        const [x2, y2] = f(c.x2, c.y2);
        const [x, y] = f(c.x, c.y);
        return { type: 'C', x1, y1, x2, y2, x, y };
      }
      default:
        return c;
    }
  });
}

/** Aproxima um contorno por um polígono, só para medir (nunca para exportar). */
export function flatten(contour: Cmd[], tolerance = 1): Pt[] {
  const pts: Pt[] = [];
  let cx = 0;
  let cy = 0;
  for (const c of contour) {
    if (c.type === 'M' || c.type === 'L') {
      pts.push([c.x, c.y]);
      cx = c.x;
      cy = c.y;
    } else if (c.type === 'Q') {
      const len = Math.hypot(c.x1 - cx, c.y1 - cy) + Math.hypot(c.x - c.x1, c.y - c.y1);
      const n = Math.max(2, Math.min(48, Math.ceil(len / (tolerance * 6))));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        pts.push([u * u * cx + 2 * u * t * c.x1 + t * t * c.x, u * u * cy + 2 * u * t * c.y1 + t * t * c.y]);
      }
      cx = c.x;
      cy = c.y;
    } else if (c.type === 'C') {
      const len = Math.hypot(c.x1 - cx, c.y1 - cy) + Math.hypot(c.x2 - c.x1, c.y2 - c.y1) + Math.hypot(c.x - c.x2, c.y - c.y2);
      const n = Math.max(3, Math.min(64, Math.ceil(len / (tolerance * 6))));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        pts.push([
          u * u * u * cx + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
          u * u * u * cy + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y,
        ]);
      }
      cx = c.x;
      cy = c.y;
    }
  }
  if (pts.length > 1) {
    const [fx, fy] = pts[0];
    const [lx, ly] = pts[pts.length - 1];
    if (Math.abs(fx - lx) < 1e-9 && Math.abs(fy - ly) < 1e-9) pts.pop();
  }
  return pts;
}

export function polyBox(pts: Pt[]): Box {
  const b = emptyBox();
  for (const [x, y] of pts) {
    if (x < b.x0) b.x0 = x;
    if (x > b.x1) b.x1 = x;
    if (y < b.y0) b.y0 = y;
    if (y > b.y1) b.y1 = y;
  }
  return b;
}

/** Área com sinal (fórmula do laço). Positiva = anti-horário num sistema com y para cima. */
export function signedArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += (pts[j][0] - pts[i][0]) * (pts[j][1] + pts[i][1]);
  }
  return a / 2;
}

/** Ponto dentro de polígono pela regra par-ímpar. */
export function pointInPoly(x: number, y: number, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Inverte o sentido de um contorno sem mudar nenhum ponto. */
export function reverseContour(contour: Cmd[]): Cmd[] {
  const segs = contour.filter(c => c.type !== 'Z');
  if (!segs.length || segs[0].type !== 'M') return contour;
  const ends: Pt[] = segs.map(c => [(c as { x: number }).x, (c as { y: number }).y]);
  const last = ends[ends.length - 1];
  // Percorre de trás para frente: começa no último ponto, cada segmento volta ao ponto anterior,
  // e o Z fecha com a mesma reta implícita (agora no outro sentido).
  const out: Cmd[] = [{ type: 'M', x: last[0], y: last[1] }];
  for (let i = segs.length - 1; i >= 1; i--) {
    const c = segs[i];
    const [px, py] = ends[i - 1];
    if (c.type === 'L') out.push({ type: 'L', x: px, y: py });
    else if (c.type === 'Q') out.push({ type: 'Q', x1: c.x1, y1: c.y1, x: px, y: py });
    else if (c.type === 'C') out.push({ type: 'C', x1: c.x2, y1: c.y2, x2: c.x1, y2: c.y1, x: px, y: py });
  }
  out.push({ type: 'Z' });
  return out;
}

/** Todos os pontos (extremos e de controle) de uma lista de comandos, na ordem. */
export function cmdPoints(cmds: Cmd[]): Pt[] {
  const pts: Pt[] = [];
  for (const c of cmds) {
    if (c.type === 'M' || c.type === 'L') pts.push([c.x, c.y]);
    else if (c.type === 'Q') pts.push([c.x1, c.y1], [c.x, c.y]);
    else if (c.type === 'C') pts.push([c.x1, c.y1], [c.x2, c.y2], [c.x, c.y]);
  }
  return pts;
}

export function cmdsBox(cmds: Cmd[]): Box {
  let b = emptyBox();
  for (const contour of splitContours(cmds)) b = unionBox(b, polyBox(flatten(contour, 0.5)));
  return b;
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

/** Comandos para o atributo `d` de um `<path>` (para desenhar na tela). */
export function toPathData(cmds: Cmd[]): string {
  let d = '';
  for (const c of cmds) {
    if (c.type === 'M' || c.type === 'L') d += `${c.type}${fmt(c.x)} ${fmt(c.y)}`;
    else if (c.type === 'Q') d += `Q${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x)} ${fmt(c.y)}`;
    else if (c.type === 'C') d += `C${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x2)} ${fmt(c.y2)} ${fmt(c.x)} ${fmt(c.y)}`;
    else d += 'Z';
  }
  return d;
}
