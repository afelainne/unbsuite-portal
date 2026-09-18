/**
 * Ferramental de desenho da folha de marca: unidades, tema, pincel e os
 * blocos de asset novos (paleta, uso correto e incorreto, anatomia e fita de
 * fundos).
 *
 * UNIDADE — a folha trabalha numa unidade de canvas só, que muda com o
 * formato: uma página de papel mede em PONTOS (1 mm = 2,8346 pt) e uma página
 * de tela mede em PIXELS (1 px = 1 unidade). Por isso a tipografia e os
 * espaçamentos não podem ser constantes absolutas: `SheetUnits` converte um
 * corpo de referência em pontos (o que o A4 sempre usou) para a unidade da
 * página, multiplicando por um fator proporcional ao tamanho dela. Assim uma
 * folha de 1080 px não sai com texto de 8 pt ilegível.
 *
 * Este arquivo não importa `brandsheet.ts` — a dependência anda num sentido só.
 */
import paper from 'paper';
import { applyLogoAppearance } from './render-pipeline';
import { dominantColor, isLightColor, type PaletteSwatch } from './brandsheet-palette';
import { activeT } from '../i18n/runtime';
import { fill, plural } from '../i18n/format';

// ---------------------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------------------

/** Pontos por milímetro (72 / 25,4 arredondado como no contrato da folha). */
export const MM_TO_PT = 2.8346;
/** Pontos por pixel CSS (96 dpi). */
export const PX_TO_PT = 0.75;
/** Pixels CSS por milímetro (96 dpi). */
export const PX_PER_MM = 96 / 25.4;

export function mmToPt(mm: number): number {
  return Number.isFinite(mm) ? mm * MM_TO_PT : 0;
}
export function ptToMm(pt: number): number {
  return Number.isFinite(pt) ? pt / MM_TO_PT : 0;
}
export function pxToPt(px: number): number {
  return Number.isFinite(px) ? px * PX_TO_PT : 0;
}

/** Unidade nativa do formato: papel mede em milímetro, tela mede em pixel. */
export type PageUnit = 'mm' | 'px';
export type SheetDensity = 'comfortable' | 'compact';
export type SheetTheme = 'light' | 'dark' | 'transparent';

/** Página de referência da tipografia: o A4 retrato, em pontos. */
export const REFERENCE_PAGE = Math.sqrt(210 * MM_TO_PT * 297 * MM_TO_PT);

const DENSITY: Record<SheetDensity, { space: number; font: number }> = {
  comfortable: { space: 1, font: 1 },
  compact: { space: 0.72, font: 0.94 },
};

export interface SheetUnits {
  unit: PageUnit;
  density: SheetDensity;
  /** Fator aplicado à tipografia e ao ritmo da folha (1 em papel). */
  typeScale: number;
  /** Ritmo interno: margens, respiros e cantos, a partir de uma medida em mm de papel. */
  space(mm: number): number;
  /** Corpo de texto, a partir do tamanho em pontos que o A4 usa. */
  font(pt: number): number;
  /** Medida física em milímetros (amostra de tamanho mínimo). */
  fromMm(mm: number): number;
  /** Medida física em pixels (amostra de tamanho mínimo). */
  fromPx(px: number): number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/**
 * Unidades de uma página já medida na sua unidade de canvas.
 * Em papel o fator é 1 (8 pt continuam 8 pt, como manda a impressão); em tela
 * ele cresce com a média geométrica dos lados, limitado a 3×.
 */
export function createSheetUnits(
  page: { width: number; height: number },
  unit: PageUnit,
  density: SheetDensity = 'comfortable',
): SheetUnits {
  const w = Number.isFinite(page.width) && page.width > 0 ? page.width : REFERENCE_PAGE;
  const h = Number.isFinite(page.height) && page.height > 0 ? page.height : REFERENCE_PAGE;
  const typeScale = unit === 'mm' ? 1 : clamp(Math.sqrt(w * h) / REFERENCE_PAGE, 1, 3);
  const d = DENSITY[density] ?? DENSITY.comfortable;
  return {
    unit,
    density,
    typeScale,
    space: mm => (Number.isFinite(mm) ? mm * MM_TO_PT * typeScale * d.space : 0),
    font: pt => (Number.isFinite(pt) ? pt * typeScale * d.font : 0),
    fromMm: mm => (Number.isFinite(mm) ? mm * (unit === 'mm' ? MM_TO_PT : PX_PER_MM) : 0),
    fromPx: px => (Number.isFinite(px) ? px * (unit === 'mm' ? PX_TO_PT : 1) : 0),
  };
}

// ---------------------------------------------------------------------------
// Tema
// ---------------------------------------------------------------------------

export interface SheetPalette {
  /** Fundo da página; `null` deixa a folha transparente. */
  page: string | null;
  ink: string;
  muted: string;
  hairline: string;
  /** Fundo dos painéis; `null` não pinta (folha transparente). */
  panel: string | null;
  /** Fundo dos painéis de apoio (respiro, células). */
  panelSoft: string | null;
  /** Fundo escuro das células de versão negativa. */
  panelInvert: string;
  /** Traço da malha de construção. */
  grid: string;
  /** Versão do logo grande neste tema. */
  logoVariant: LogoVariant;
}

export type LogoVariant = 'positive' | 'negative' | 'outline' | 'mono';

const LIGHT: SheetPalette = {
  page: '#FFFFFF',
  ink: '#1C1C1E',
  muted: '#6E6E73',
  hairline: '#D6D6DB',
  panel: '#FFFFFF',
  panelSoft: '#F4F4F6',
  panelInvert: '#1C1C1E',
  grid: '#E3E3E6',
  logoVariant: 'positive',
};

const DARK: SheetPalette = {
  page: '#141416',
  ink: '#F5F5F7',
  muted: '#A1A1A6',
  hairline: '#3A3A3C',
  panel: '#1C1C1E',
  panelSoft: '#232326',
  panelInvert: '#000000',
  grid: '#2C2C2F',
  logoVariant: 'negative',
};

const TRANSPARENT: SheetPalette = {
  ...LIGHT,
  page: null,
  panel: null,
  panelSoft: null,
};

export function sheetPalette(theme: SheetTheme): SheetPalette {
  if (theme === 'dark') return { ...DARK };
  if (theme === 'transparent') return { ...TRANSPARENT };
  return { ...LIGHT };
}

// ---------------------------------------------------------------------------
// Geometria básica
// ---------------------------------------------------------------------------

export interface Frame { x: number; y: number; width: number; height: number }

export const insetFrame = (f: Frame, pad: number): Frame => ({
  x: f.x + pad,
  y: f.y + pad,
  width: Math.max(1, f.width - pad * 2),
  height: Math.max(1, f.height - pad * 2),
});

/** Número curto em português: 1,5 em vez de 1.5, sem zeros à toa. */
export function trimNumber(v: number): string {
  if (!Number.isFinite(v)) return '0';
  const r = Math.round(v * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r).replace('.', ',');
}

// ---------------------------------------------------------------------------
// Pincel
// ---------------------------------------------------------------------------

export interface TextOptions {
  size?: number;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string;
}

export interface BoxOptions {
  fill?: string | null;
  stroke?: string | null;
  width?: number;
  dash?: number[];
  radius?: number;
  opacity?: number;
}

export interface PlaceLogoOptions {
  height?: number;
  longest?: number;
  center: paper.Point;
  variant?: LogoVariant;
}

export interface SheetTypeScale {
  title: number;
  subtitle: number;
  meta: number;
  section: number;
  body: number;
  caption: number;
}

export interface SheetPainter {
  units: SheetUnits;
  palette: SheetPalette;
  type: SheetTypeScale;
  hasTemplate: boolean;
  /** Proporção natural do logo (largura / altura). */
  logoAspect: number;
  text(content: string, x: number, y: number, o?: TextOptions): paper.PointText;
  box(frame: Frame, o?: BoxOptions): paper.Path;
  rule(x1: number, y: number, x2: number, color?: string, width?: number): paper.Path;
  /** Encolhe (nunca amplia) e centraliza um item no quadro; devolve o fator aplicado. */
  fitInto(item: paper.Item, frame: Frame): number;
  placeLogo(parent: paper.Item, o: PlaceLogoOptions): paper.Item | null;
  /** Moldura + título do bloco; devolve o palco livre por dentro. */
  panel(frame: Frame, title: string, o?: { caption?: string; soft?: boolean }): Frame;
  /** Selo discreto de certo / errado, sem emoji e sem vermelho. */
  seal(x: number, y: number, label: string, ok: boolean): paper.Group;
}

export interface PainterInput {
  units: SheetUnits;
  palette: SheetPalette;
  /** Item modelo do logo, já importado no projeto (ou `null`). */
  template: paper.Item | null;
}

export function createSheetPainter({ units, palette, template }: PainterInput): SheetPainter {
  const type: SheetTypeScale = {
    title: units.font(15),
    subtitle: units.font(9),
    meta: units.font(7.5),
    section: units.font(8.5),
    body: units.font(8),
    caption: units.font(7),
  };
  const naturalW = template?.bounds.width || 0;
  const naturalH = template?.bounds.height || 0;
  const logoAspect = naturalH > 0 ? naturalW / naturalH : 1;
  const hairlineWidth = Math.max(0.3, 0.5 * units.typeScale);

  const text: SheetPainter['text'] = (content, x, y, o = {}) => {
    const t = new paper.PointText(new paper.Point(x, y));
    t.content = content;
    t.fontFamily = "'BDO Grotesk', sans-serif";
    t.fontSize = o.size ?? type.body;
    if (o.bold) t.fontWeight = 'bold';
    t.justification = o.align ?? 'left';
    t.fillColor = new paper.Color(o.color ?? palette.ink);
    return t;
  };

  const box: SheetPainter['box'] = (f, o = {}) => {
    const rectangle = new paper.Rectangle(f.x, f.y, Math.max(0.01, f.width), Math.max(0.01, f.height));
    const r = o.radius ?? 0;
    const path = r > 0
      ? new paper.Path.Rectangle(rectangle, new paper.Size(r, r))
      : new paper.Path.Rectangle(rectangle);
    path.fillColor = o.fill ? new paper.Color(o.fill) : null;
    if (o.stroke) {
      path.strokeColor = new paper.Color(o.stroke);
      path.strokeWidth = o.width ?? hairlineWidth;
      if (o.dash?.length) path.dashArray = o.dash;
    } else {
      path.strokeColor = null;
    }
    if (o.opacity !== undefined) path.opacity = clamp(o.opacity, 0, 1);
    return path;
  };

  const rule: SheetPainter['rule'] = (x1, y, x2, color = palette.hairline, width = hairlineWidth) => {
    const line = new paper.Path.Line(new paper.Point(x1, y), new paper.Point(x2, y));
    line.strokeColor = new paper.Color(color);
    line.strokeWidth = width;
    return line;
  };

  const fitInto: SheetPainter['fitInto'] = (item, frame) => {
    const b = item.strokeBounds;
    if (!b || !(b.width > 0 || b.height > 0)) return 1;
    const k = Math.min(frame.width / (b.width || frame.width), frame.height / (b.height || frame.height), 1);
    if (k < 1 && k > 0) item.scale(k, b.center);
    item.position = new paper.Point(frame.x + frame.width / 2, frame.y + frame.height / 2);
    return k > 0 ? k : 1;
  };

  const applyVariant = (item: paper.Item, variant: LogoVariant, outlineWidth: number) => {
    if (variant === 'positive') return;
    if (variant === 'negative') {
      applyLogoAppearance(item, { svgColorOverride: '#FFFFFF' });
    } else if (variant === 'mono') {
      applyLogoAppearance(item, { svgColorOverride: palette.ink });
    } else {
      applyLogoAppearance(item, {
        svgColorOverride: palette.ink,
        svgOutlineMode: true,
        svgOutlineWidth: Math.max(0.3, outlineWidth),
        svgOutlineDash: [],
        svgOutlineLineCap: 'butt',
      });
    }
  };

  const placeLogo: SheetPainter['placeLogo'] = (parent, o) => {
    if (!template) return null;
    const copy = template.clone({ insert: false }) as paper.Item;
    parent.addChild(copy);
    const b = copy.bounds;
    const useHeight = o.height !== undefined;
    const natural = useHeight ? b.height || 1e-9 : Math.max(b.width || 0, b.height || 0, 1e-9);
    const target = Math.max(0.5, useHeight ? (o.height as number) : (o.longest ?? 100));
    const k = target / natural;
    if (Number.isFinite(k) && k > 0 && k !== 1) copy.scale(k, copy.bounds.center);
    copy.position = o.center;
    applyVariant(copy, o.variant ?? 'positive', target * 0.012);
    return copy;
  };

  const panel: SheetPainter['panel'] = (frame, title, o = {}) => {
    const fill = o.soft ? palette.panelSoft : palette.panel;
    box(frame, {
      fill,
      stroke: palette.hairline,
      width: hairlineWidth,
      radius: units.space(1.5),
    });
    const pad = units.space(3);
    const headBaseline = frame.y + pad + type.section;
    if (title) text(title, frame.x + pad, headBaseline, { size: type.section, bold: true });
    if (o.caption) {
      text(o.caption, frame.x + frame.width - pad, headBaseline, {
        size: type.caption, align: 'right', color: palette.muted,
      });
    }
    const top = headBaseline + units.space(2);
    return {
      x: frame.x + pad,
      y: top,
      width: Math.max(1, frame.width - pad * 2),
      height: Math.max(1, frame.y + frame.height - pad - top),
    };
  };

  const seal: SheetPainter['seal'] = (x, y, label, ok) => {
    const size = type.caption;
    const padX = size * 0.62;
    const padY = size * 0.38;
    const width = size * 0.52 * label.length + padX * 2;
    const height = size + padY * 2;
    const group = new paper.Group();
    group.name = `seal-${ok ? 'ok' : 'nok'}`;
    group.addChild(box({ x, y, width, height }, {
      fill: ok ? palette.ink : null,
      stroke: ok ? null : palette.muted,
      width: hairlineWidth,
      radius: height / 2,
    }));
    group.addChild(text(label, x + width / 2, y + padY + size * 0.82, {
      size,
      align: 'center',
      color: ok ? (palette.page ?? '#FFFFFF') : palette.muted,
    }));
    return group;
  };

  return {
    units, palette, type, logoAspect,
    hasTemplate: Boolean(template),
    text, box, rule, fitInto, placeLogo, panel, seal,
  };
}

// ---------------------------------------------------------------------------
// Blocos de asset
// ---------------------------------------------------------------------------

/** Amostras de cor com o hex, na largura disponível. */
export function drawPaletteBlock(p: SheetPainter, frame: Frame, swatches: PaletteSwatch[], title: string): void {
  const list = (swatches ?? []).slice(0, 6);
  const stage = p.panel(frame, title, { caption: plural(list.length, activeT().brandSheet.sheetColorOne, activeT().brandSheet.sheetColorOther) });
  if (!list.length) {
    p.text('—', stage.x + stage.width / 2, stage.y + stage.height / 2, {
      size: p.type.body, align: 'center', color: p.palette.muted,
    });
    return;
  }
  const group = new paper.Group();
  group.name = 'palette-swatches';
  const gap = p.units.space(2);
  const cellW = Math.max(6, (stage.width - gap * (list.length - 1)) / list.length);
  const captionH = p.type.caption * 2 + p.units.space(1);
  const cellH = Math.max(6, stage.height - captionH);
  list.forEach((swatch, i) => {
    const x = stage.x + (cellW + gap) * i;
    group.addChild(p.box({ x, y: stage.y, width: cellW, height: cellH }, {
      fill: swatch.hex,
      stroke: p.palette.hairline,
      radius: p.units.space(1),
    }));
    group.addChild(p.text(swatch.hex, x + cellW / 2, stage.y + cellH + p.type.caption + p.units.space(1), {
      size: p.type.caption, align: 'center', color: p.palette.ink,
    }));
    const note = swatch.role === 'neutral' ? swatch.label : i === 0 ? activeT().brandSheet.sheetDominant : activeT().brandSheet.sheetSupport;
    group.addChild(p.text(note, x + cellW / 2, stage.y + cellH + p.type.caption * 2 + p.units.space(1.6), {
      size: p.type.caption, align: 'center', color: p.palette.muted,
    }));
  });
  p.fitInto(group, stage);
}

export interface UsageCell {
  key: 'correct' | 'stretched' | 'rotated' | 'crowded';
  label: string;
  ok: boolean;
}

export const USAGE_CELLS: UsageCell[] = [
  { key: 'correct', get label() { return activeT().brandSheet.sheetUsageCorrect; }, ok: true },
  { key: 'stretched', get label() { return activeT().brandSheet.sheetUsageStretched; }, ok: false },
  { key: 'rotated', get label() { return activeT().brandSheet.sheetUsageRotated; }, ok: false },
  { key: 'crowded', get label() { return activeT().brandSheet.sheetUsageCrowded; }, ok: false },
];

/** Quatro quadros: o logo bem aplicado e três erros clássicos. */
export function drawUsageBlock(p: SheetPainter, frame: Frame, title: string): void {
  const stage = p.panel(frame, title, { caption: activeT().brandSheet.sheetUsageCaption });
  if (!p.hasTemplate) {
    p.text('—', stage.x + stage.width / 2, stage.y + stage.height / 2, {
      size: p.type.body, align: 'center', color: p.palette.muted,
    });
    return;
  }
  const gap = p.units.space(2);
  const captionH = p.type.caption + p.units.space(1.5);
  const cellW = Math.max(6, (stage.width - gap * (USAGE_CELLS.length - 1)) / USAGE_CELLS.length);
  const cellH = Math.max(6, stage.height - captionH);
  const group = new paper.Group();
  group.name = 'usage-cells';

  USAGE_CELLS.forEach((cell, i) => {
    const x = stage.x + (cellW + gap) * i;
    const cellFrame: Frame = { x, y: stage.y, width: cellW, height: cellH };
    group.addChild(p.box(cellFrame, {
      fill: p.palette.panelSoft,
      stroke: p.palette.hairline,
      radius: p.units.space(1),
    }));

    const holder = new paper.Group();
    holder.name = `usage-${cell.key}`;
    group.addChild(holder);
    const center = new paper.Point(x + cellW / 2, stage.y + cellH * 0.52);
    const longest = Math.min(cellW * 0.52, cellH * 0.44);

    if (cell.key === 'crowded') {
      const logo = p.placeLogo(holder, { center, longest, variant: 'mono' });
      if (logo) {
        const b = logo.bounds;
        const bar = p.box(
          { x: b.right + longest * 0.06, y: b.top, width: Math.max(1, longest * 0.16), height: b.height },
          { fill: p.palette.muted, opacity: 0.55 },
        );
        holder.addChild(bar);
        const ring = p.box(
          { x: b.left - longest * 0.2, y: b.top - longest * 0.2, width: b.width + longest * 0.4, height: b.height + longest * 0.4 },
          { stroke: p.palette.muted, dash: [p.units.space(0.8), p.units.space(0.6)] },
        );
        holder.addChild(ring);
      }
    } else {
      const logo = p.placeLogo(holder, { center, longest, variant: 'mono' });
      if (logo && cell.key === 'stretched') logo.scale(1, 0.62, logo.bounds.center);
      if (logo && cell.key === 'rotated') logo.rotate(12, logo.bounds.center);
    }

    // O desenho do erro pode vazar do quadro: reencaixa antes do selo.
    p.fitInto(holder, insetFrame(cellFrame, p.units.space(2.2)));

    const sealSize = p.type.caption;
    group.addChild(p.seal(
      x + p.units.space(1.4),
      stage.y + cellH - sealSize * 1.76 - p.units.space(1.4),
      cell.ok ? activeT().brandSheet.sheetRight : activeT().brandSheet.sheetWrong,
      cell.ok,
    ));
    group.addChild(p.text(cell.label, x + cellW / 2, stage.y + cellH + p.type.caption + p.units.space(1), {
      size: p.type.caption, align: 'center', color: p.palette.muted,
    }));
  });

  p.fitInto(group, stage);
}

export interface AnatomyPart {
  bounds: { left: number; top: number; width: number; height: number };
}

/** O logo com as partes numeradas na ordem do arquivo. */
export function drawAnatomyBlock(
  p: SheetPainter,
  frame: Frame,
  parts: AnatomyPart[],
  fullBounds: { left: number; top: number; width: number; height: number } | null,
  title: string,
): void {
  const list = (parts ?? []).slice(0, 12);
  const caption = !p.hasTemplate ? '—' : list.length > 1 ? fill(activeT().brandSheet.sheetPartsOther, { n: list.length }) : activeT().brandSheet.sheetSinglePart;
  const stage = p.panel(frame, title, { caption });
  if (!p.hasTemplate) {
    p.text('—', stage.x + stage.width / 2, stage.y + stage.height / 2, {
      size: p.type.body, align: 'center', color: p.palette.muted,
    });
    return;
  }
  const group = new paper.Group();
  group.name = 'anatomy';
  const noteH = p.type.caption + p.units.space(1.5);
  const inner: Frame = { x: stage.x, y: stage.y, width: stage.width, height: Math.max(1, stage.height - noteH) };
  const center = new paper.Point(inner.x + inner.width / 2, inner.y + inner.height / 2);
  const logo = p.placeLogo(group, {
    center,
    longest: Math.min(inner.width * 0.62, inner.height * 0.82),
    variant: 'mono',
  });

  if (logo && fullBounds && fullBounds.width > 0 && fullBounds.height > 0 && list.length > 1) {
    const b = logo.bounds;
    const kx = b.width / fullBounds.width;
    const ky = b.height / fullBounds.height;
    const r = Math.max(p.type.caption * 0.78, p.units.space(1.6));
    list.forEach((part, i) => {
      const cx = b.left + (part.bounds.left + part.bounds.width / 2 - fullBounds.left) * kx;
      const cy = b.top + (part.bounds.top + part.bounds.height / 2 - fullBounds.top) * ky;
      const dot = new paper.Path.Circle(new paper.Point(cx, cy), r);
      dot.fillColor = new paper.Color(p.palette.ink);
      dot.strokeColor = new paper.Color(p.palette.page ?? '#FFFFFF');
      dot.strokeWidth = Math.max(0.3, 0.6 * p.units.typeScale);
      group.addChild(dot);
      group.addChild(p.text(String(i + 1), cx, cy + p.type.caption * 0.34, {
        size: p.type.caption * 0.92,
        align: 'center',
        color: p.palette.page ?? '#FFFFFF',
      }));
    });
  }

  p.fitInto(group, inner);
  const note = list.length > 1
    ? activeT().brandSheet.sheetPartsNote
    : activeT().brandSheet.sheetSinglePartNote;
  p.text(note, stage.x + stage.width / 2, stage.y + stage.height - p.units.space(0.5), {
    size: p.type.caption, align: 'center', color: p.palette.muted,
  });
}

/** O logo sobre branco, preto, cinza e a cor dominante, para checar contraste. */
export function drawBackgroundsBlock(
  p: SheetPainter,
  frame: Frame,
  swatches: PaletteSwatch[],
  title: string,
): void {
  const dominant = dominantColor(swatches);
  const cells = [
    { hex: '#FFFFFF', label: activeT().brandSheet.sheetWhite },
    { hex: '#000000', label: activeT().brandSheet.sheetBlack },
    { hex: '#AAA9AB', label: activeT().brandSheet.sheetGray },
    { hex: dominant, label: activeT().brandSheet.sheetDominant },
  ];
  const stage = p.panel(frame, title, { caption: activeT().brandSheet.sheetContrast });
  if (!p.hasTemplate) {
    p.text('—', stage.x + stage.width / 2, stage.y + stage.height / 2, {
      size: p.type.body, align: 'center', color: p.palette.muted,
    });
    return;
  }
  const group = new paper.Group();
  group.name = 'backgrounds-strip';
  const gap = p.units.space(1.6);
  const captionH = p.type.caption * 2 + p.units.space(1.4);
  const cellW = Math.max(6, (stage.width - gap * (cells.length - 1)) / cells.length);
  const cellH = Math.max(6, stage.height - captionH);
  cells.forEach((cell, i) => {
    const x = stage.x + (cellW + gap) * i;
    group.addChild(p.box({ x, y: stage.y, width: cellW, height: cellH }, {
      fill: cell.hex,
      stroke: p.palette.hairline,
      radius: p.units.space(1),
    }));
    const holder = new paper.Group();
    holder.name = `background-${i + 1}`;
    group.addChild(holder);
    p.placeLogo(holder, {
      center: new paper.Point(x + cellW / 2, stage.y + cellH / 2),
      longest: Math.min(cellW * 0.6, cellH * 0.56),
      variant: isLightColor(cell.hex) ? 'positive' : 'negative',
    });
    group.addChild(p.text(cell.label, x + cellW / 2, stage.y + cellH + p.type.caption + p.units.space(1), {
      size: p.type.caption, align: 'center', color: p.palette.ink,
    }));
    group.addChild(p.text(cell.hex, x + cellW / 2, stage.y + cellH + p.type.caption * 2 + p.units.space(1.6), {
      size: p.type.caption, align: 'center', color: p.palette.muted,
    }));
  });
  p.fitInto(group, stage);
}

/** Malha de construção discreta, desenhada por trás dos blocos. */
export function drawSheetGrid(
  p: SheetPainter,
  page: { width: number; height: number },
  margin: number,
  gap: number,
  columns = 12,
): void {
  const color = p.palette.grid;
  const width = Math.max(0.25, 0.4 * p.units.typeScale);
  const contentW = Math.max(1, page.width - margin * 2);
  const contentH = Math.max(1, page.height - margin * 2);
  const group = new paper.Group();
  group.name = 'sheet-grid';

  group.addChild(p.box({ x: margin, y: margin, width: contentW, height: contentH }, {
    stroke: color, width,
  }));
  const cols = Math.max(2, Math.min(24, Math.round(columns)));
  for (let i = 1; i < cols; i++) {
    const x = margin + (contentW * i) / cols;
    const line = new paper.Path.Line(new paper.Point(x, margin), new paper.Point(x, margin + contentH));
    line.strokeColor = new paper.Color(color);
    line.strokeWidth = width;
    group.addChild(line);
  }
  const step = Math.max(gap * 2, contentH / 48);
  for (let y = margin + step; y < margin + contentH - 0.5; y += step) {
    group.addChild(p.rule(margin, y, margin + contentW, color, width));
  }
  group.opacity = 0.7;
}
