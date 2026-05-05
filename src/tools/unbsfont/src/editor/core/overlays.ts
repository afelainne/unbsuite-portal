import { FontMetrics, GlyphModelState } from './glyphModel';
import { AlignmentZone } from './fontState';

export interface OverlayOptions {
  showZones: boolean;
  showStems: boolean;
  showGrid: boolean;
}

export type SnapHighlight =
  | { type: 'zone'; zoneId: string }
  | { type: 'stem'; stemId: string };

export interface ZoneRenderInfo extends AlignmentZone {
  color: string;
}

export interface StemOverlay {
  id: string;
  orientation: 'vertical' | 'horizontal';
  bounds: { x1: number; x2: number; y1: number; y2: number };
  actualWidth: number;
  targetStem: number;
  color: string;
}

export interface OverlaySnapshot {
  metrics: FontMetrics;
  zones: ZoneRenderInfo[];
  stems: StemOverlay[];
  options: OverlayOptions;
  snapHighlight: SnapHighlight | null;
}

export type OverlayListener = (snapshot: OverlaySnapshot) => void;

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const ZONE_COLORS: Record<string, string> = {
  ascender: '#00A6A6',
  capHeight: '#0081A7',
  xHeight: '#F07167',
  baseline: '#0A1128',
  overshoot: '#C03221',
  descender: '#6C757D',
  custom: '#5E5CE6'
};

const STEM_COLORS = {
  vertical: '#5E5CE6',
  horizontal: '#FF7B54'
};

const DEFAULT_OPTIONS: OverlayOptions = {
  showZones: true,
  showStems: true,
  showGrid: true
};

const MIN_OVERLAP = 40;

export class OverlayController {
  private metrics: FontMetrics;
  private zones: AlignmentZone[] = [];
  private verticalTargets: number[] = [];
  private horizontalTargets: number[] = [];
  private glyph: GlyphModelState | null = null;
  private options: OverlayOptions = { ...DEFAULT_OPTIONS };
  private snapHighlight: SnapHighlight | null = null;
  private detectedStems: StemOverlay[] = [];
  private listeners = new Set<OverlayListener>();

  constructor(initialMetrics: FontMetrics) {
    this.metrics = deepClone(initialMetrics);
  }

  subscribe(listener: OverlayListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  updateMetrics(metrics: FontMetrics): void {
    this.metrics = deepClone(metrics);
    this.emit();
  }

  setAlignmentZones(zones: AlignmentZone[]): void {
    this.zones = deepClone(zones);
    this.emit();
  }

  setStemTargets(orientation: 'vertical' | 'horizontal', values: number[]): void {
    if (orientation === 'vertical') {
      this.verticalTargets = [...values];
    } else {
      this.horizontalTargets = [...values];
    }
    this.rebuildStems();
    this.emit();
  }

  setGlyphState(state: GlyphModelState): void {
    this.glyph = deepClone(state);
    this.rebuildStems();
    this.emit();
  }

  setOption(option: keyof OverlayOptions, value: boolean): void {
    this.options = { ...this.options, [option]: value };
    this.emit();
  }

  setSnapHighlight(highlight: SnapHighlight | null): void {
    this.snapHighlight = highlight;
    this.emit();
  }

  getSnapshot(): OverlaySnapshot {
    const zones = this.zones.map(zone => ({
      ...zone,
      color: ZONE_COLORS[zone.type] ?? ZONE_COLORS.custom
    }));

    return {
      metrics: deepClone(this.metrics),
      zones,
      stems: deepClone(this.detectedStems),
      options: { ...this.options },
      snapHighlight: this.snapHighlight
    };
  }

  private rebuildStems() {
    if (!this.glyph) {
      this.detectedStems = [];
      return;
    }
    this.detectedStems = [
      ...detectVerticalStems(this.glyph, this.verticalTargets),
      ...detectHorizontalStems(this.glyph, this.horizontalTargets)
    ];
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(listener => listener(snapshot));
  }
}

const getSegments = (glyph: GlyphModelState) => {
  const segments: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    dx: number;
    dy: number;
  }> = [];

  glyph.paths.forEach(path => {
    if (path.points.length < 2) return;
    for (let i = 0; i < path.points.length; i += 1) {
      const current = path.points[i];
      const next = path.points[(i + 1) % path.points.length];
      if (!path.closed && i === path.points.length - 1) break;
      segments.push({
        x1: current.x,
        y1: current.y,
        x2: next.x,
        y2: next.y,
        dx: next.x - current.x,
        dy: next.y - current.y
      });
    }
  });

  return segments;
};

const findTargetMatch = (value: number, targets: number[], tolerance: number): number | null => {
  let best: number | null = null;
  let minDiff = Infinity;
  targets.forEach(target => {
    const diff = Math.abs(target - value);
    if (diff <= tolerance && diff < minDiff) {
      minDiff = diff;
      best = target;
    }
  });
  return best;
};

const buildStemOverlay = (
  orientation: 'vertical' | 'horizontal',
  bounds: { x1: number; x2: number; y1: number; y2: number },
  actualWidth: number,
  targetStem: number
): StemOverlay => ({
  id: `${orientation}-stem-${Math.random().toString(36).slice(2, 9)}`,
  orientation,
  bounds,
  actualWidth,
  targetStem,
  color: STEM_COLORS[orientation]
});

/**
 * detectVerticalStems – procura pairs de segmentos quase verticais cuja distância bate com os targets.
 */
export const detectVerticalStems = (
  glyph: GlyphModelState,
  targets: number[],
  tolerance = 10
): StemOverlay[] => {
  if (!targets.length) return [];
  const segments = getSegments(glyph).filter(seg => Math.abs(seg.dx) < Math.abs(seg.dy) * 0.25);
  const overlays: StemOverlay[] = [];

  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      const a = segments[i];
      const b = segments[j];
      const yOverlapStart = Math.max(Math.min(a.y1, a.y2), Math.min(b.y1, b.y2));
      const yOverlapEnd = Math.min(Math.max(a.y1, a.y2), Math.max(b.y1, b.y2));
      if (yOverlapEnd - yOverlapStart < MIN_OVERLAP) continue;
      const centerA = (a.x1 + a.x2) / 2;
      const centerB = (b.x1 + b.x2) / 2;
      const width = Math.abs(centerA - centerB);
      const target = findTargetMatch(width, targets, tolerance);
      if (!target) continue;
      overlays.push(
        buildStemOverlay(
          'vertical',
          {
            x1: Math.min(centerA, centerB),
            x2: Math.max(centerA, centerB),
            y1: yOverlapStart,
            y2: yOverlapEnd
          },
          width,
          target
        )
      );
    }
  }

  return overlays;
};

/**
 * detectHorizontalStems – replica a lógica, mas considerando segmentos horizontais.
 */
export const detectHorizontalStems = (
  glyph: GlyphModelState,
  targets: number[],
  tolerance = 10
): StemOverlay[] => {
  if (!targets.length) return [];
  const segments = getSegments(glyph).filter(seg => Math.abs(seg.dy) < Math.abs(seg.dx) * 0.25);
  const overlays: StemOverlay[] = [];

  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      const a = segments[i];
      const b = segments[j];
      const xOverlapStart = Math.max(Math.min(a.x1, a.x2), Math.min(b.x1, b.x2));
      const xOverlapEnd = Math.min(Math.max(a.x1, a.x2), Math.max(b.x1, b.x2));
      if (xOverlapEnd - xOverlapStart < MIN_OVERLAP) continue;
      const centerA = (a.y1 + a.y2) / 2;
      const centerB = (b.y1 + b.y2) / 2;
      const width = Math.abs(centerA - centerB);
      const target = findTargetMatch(width, targets, tolerance);
      if (!target) continue;
      overlays.push(
        buildStemOverlay(
          'horizontal',
          {
            x1: xOverlapStart,
            x2: xOverlapEnd,
            y1: Math.min(centerA, centerB),
            y2: Math.max(centerA, centerB)
          },
          width,
          target
        )
      );
    }
  }

  return overlays;
};
