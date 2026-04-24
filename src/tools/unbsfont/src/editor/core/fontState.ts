import { DEFAULT_METRICS, FontMetrics, GlyphModelState } from './glyphModel';

export type AlignmentZoneType =
  | 'baseline'
  | 'xHeight'
  | 'capHeight'
  | 'ascender'
  | 'descender'
  | 'overshoot'
  | 'custom';

export interface AlignmentZone {
  id: string;
  type: AlignmentZoneType;
  label: string;
  position: number;
  size: number;
}

export interface FontState {
  metrics: FontMetrics;
  alignmentZones: AlignmentZone[];
  verticalStems: number[];
  horizontalStems: number[];
}

export type FontStateListener = (state: FontState) => void;

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const DEFAULT_VERTICAL_STEMS = [80];
const DEFAULT_HORIZONTAL_STEMS = [60];

const BASE_ZONE_SIZE = 12;

const resolveZonePosition = (type: AlignmentZoneType, metrics: FontMetrics): number => {
  switch (type) {
    case 'ascender':
      return metrics.ascender;
    case 'capHeight':
      return metrics.capHeight;
    case 'xHeight':
      return metrics.xHeight;
    case 'baseline':
      return metrics.baseline;
    case 'overshoot':
      return metrics.baseline - 12;
    case 'descender':
      return metrics.descender;
    default:
      return metrics.baseline;
  }
};

const resolveZoneSize = (type: AlignmentZoneType): number => {
  if (type === 'overshoot') return 8;
  if (type === 'custom') return BASE_ZONE_SIZE;
  return 10;
};

export const buildDefaultAlignmentZones = (metrics: FontMetrics): AlignmentZone[] => [
  { id: 'zone-asc', type: 'ascender', label: 'Ascender', position: metrics.ascender, size: 12 },
  { id: 'zone-cap', type: 'capHeight', label: 'Cap Height', position: metrics.capHeight, size: 10 },
  { id: 'zone-x', type: 'xHeight', label: 'x-Height', position: metrics.xHeight, size: 10 },
  { id: 'zone-baseline', type: 'baseline', label: 'Baseline', position: metrics.baseline, size: 8 },
  { id: 'zone-overshoot', type: 'overshoot', label: 'Overshoot', position: metrics.baseline - 12, size: 8 },
  { id: 'zone-desc', type: 'descender', label: 'Descender', position: metrics.descender, size: 12 }
];

const normalizeZones = (zones: AlignmentZone[] | undefined, metrics: FontMetrics): AlignmentZone[] => {
  if (!zones || !zones.length) {
    return buildDefaultAlignmentZones(metrics);
  }
  return zones.map(zone => ({
    id: zone.id ?? createId('zone'),
    type: zone.type ?? 'custom',
    label: zone.label ?? zone.type ?? 'Custom zone',
    position:
      zone.type && zone.type !== 'custom' && zone.position === undefined
        ? resolveZonePosition(zone.type, metrics)
        : (zone.position ?? metrics.baseline),
    size: zone.size ?? resolveZoneSize(zone.type ?? 'custom')
  }));
};

const sanitizeStems = (values: number[] | undefined, fallback: number[]): number[] => {
  if (!values || !values.length) return [...fallback];
  return values
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && Math.abs(value) > 0)
    .map(value => Math.abs(Math.round(value)));
};

export class FontStateStore {
  private state: FontState;
  private listeners = new Set<FontStateListener>();

  constructor(initial?: Partial<FontState>) {
    const metrics = deepClone(initial?.metrics ?? DEFAULT_METRICS);
    this.state = {
      metrics,
      alignmentZones: normalizeZones(initial?.alignmentZones, metrics),
      verticalStems: sanitizeStems(initial?.verticalStems, DEFAULT_VERTICAL_STEMS),
      horizontalStems: sanitizeStems(initial?.horizontalStems, DEFAULT_HORIZONTAL_STEMS)
    };
  }

  getState(): FontState {
    return deepClone(this.state);
  }

  subscribe(listener: FontStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  updateMetrics(partial: Partial<FontMetrics>): void {
    this.state.metrics = { ...this.state.metrics, ...partial };
    this.state.alignmentZones = this.state.alignmentZones.map(zone =>
      zone.type === 'custom'
        ? zone
        : {
            ...zone,
            position: resolveZonePosition(zone.type, this.state.metrics),
            size: zone.size ?? resolveZoneSize(zone.type)
          }
    );
    this.emit();
  }

  setVerticalStems(values: number[]): void {
    this.state.verticalStems = sanitizeStems(values, DEFAULT_VERTICAL_STEMS);
    this.emit();
  }

  setHorizontalStems(values: number[]): void {
    this.state.horizontalStems = sanitizeStems(values, DEFAULT_HORIZONTAL_STEMS);
    this.emit();
  }

  addAlignmentZone(zone: Partial<Omit<AlignmentZone, 'id'>>): AlignmentZone {
    const normalized: AlignmentZone = {
      id: createId('zone'),
      type: zone.type ?? 'custom',
      label: zone.label ?? (zone.type && zone.type !== 'custom' ? zone.type : 'Custom zone'),
      position:
        zone.position !== undefined
          ? zone.position
          : resolveZonePosition(zone.type ?? 'custom', this.state.metrics),
      size: zone.size ?? resolveZoneSize(zone.type ?? 'custom')
    };
    this.state.alignmentZones = [...this.state.alignmentZones, normalized];
    this.emit();
    return normalized;
  }

  updateAlignmentZone(id: string, updates: Partial<Omit<AlignmentZone, 'id'>>): void {
    this.state.alignmentZones = this.state.alignmentZones.map(zone =>
      zone.id === id
        ? {
            ...zone,
            ...updates,
            position: updates.position ?? zone.position,
            size: updates.size ?? zone.size,
            type: updates.type ?? zone.type,
            label: updates.label ?? zone.label
          }
        : zone
    );
    this.emit();
  }

  removeAlignmentZone(id: string): void {
    this.state.alignmentZones = this.state.alignmentZones.filter(zone => zone.id !== id);
    this.emit();
  }

  resetAlignmentZones(): void {
    this.state.alignmentZones = buildDefaultAlignmentZones(this.state.metrics);
    this.emit();
  }

  resetStems(): void {
    this.state.verticalStems = [...DEFAULT_VERTICAL_STEMS];
    this.state.horizontalStems = [...DEFAULT_HORIZONTAL_STEMS];
    this.emit();
  }

  hydrate(next: Partial<FontState>): void {
    if (next.metrics) {
      this.state.metrics = deepClone(next.metrics);
    }
    if (next.alignmentZones) {
      this.state.alignmentZones = normalizeZones(next.alignmentZones, this.state.metrics);
    }
    if (next.verticalStems) {
      this.state.verticalStems = sanitizeStems(next.verticalStems, DEFAULT_VERTICAL_STEMS);
    }
    if (next.horizontalStems) {
      this.state.horizontalStems = sanitizeStems(next.horizontalStems, DEFAULT_HORIZONTAL_STEMS);
    }
    this.emit();
  }

  private emit() {
    const snapshot = this.getState();
    this.listeners.forEach(listener => listener(snapshot));
  }
}

export interface PersistedEditorState {
  font: FontState;
  glyph: GlyphModelState;
}

export const STORAGE_KEY = 'unbsfontsEditorState';

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const loadPersistedState = (): PersistedEditorState | null => {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedEditorState;
  } catch (error) {
    console.warn('Estado salvo inválido, resetando.', error);
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const savePersistedState = (state: PersistedEditorState): void => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
