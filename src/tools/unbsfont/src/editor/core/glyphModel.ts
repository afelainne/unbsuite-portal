export interface FontMetrics {
  unitsPerEm: number;
  baseline: number;
  xHeight: number;
  capHeight: number;
  ascender: number;
  descender: number;
}

export interface HandlePosition {
  x: number;
  y: number;
}

export interface AnchorPoint {
  id: string;
  x: number;
  y: number;
  handleIn: HandlePosition | null;
  handleOut: HandlePosition | null;
  smooth: boolean;
}

export interface GlyphPath {
  id: string;
  closed: boolean;
  points: AnchorPoint[];
}

export interface GlyphModelState {
  metrics: FontMetrics;
  paths: GlyphPath[];
}

export type GlyphModelListener = (state: GlyphModelState) => void;

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

export const DEFAULT_METRICS: FontMetrics = {
  unitsPerEm: 1000,
  baseline: 0,
  xHeight: 520,
  capHeight: 720,
  ascender: 780,
  descender: -220
};

const createDefaultPath = (): GlyphPath => {
  const leftStemBottom = { x: -200, y: -180 };
  const leftStemTop = { x: -200, y: 700 };
  const rightStemTop = { x: 200, y: 700 };
  const rightStemBottom = { x: 200, y: -180 };

  return {
    id: createId('path'),
    closed: true,
    points: [
      {
        id: createId('pt'),
        ...leftStemBottom,
        handleIn: null,
        handleOut: { x: leftStemBottom.x + 30, y: leftStemBottom.y },
        smooth: false
      },
      {
        id: createId('pt'),
        ...leftStemTop,
        handleIn: { x: leftStemTop.x - 30, y: leftStemTop.y },
        handleOut: { x: leftStemTop.x, y: leftStemTop.y + 40 },
        smooth: true
      },
      {
        id: createId('pt'),
        x: 0,
        y: 540,
        handleIn: { x: -40, y: 580 },
        handleOut: { x: 80, y: 600 },
        smooth: true
      },
      {
        id: createId('pt'),
        ...rightStemTop,
        handleIn: { x: rightStemTop.x, y: rightStemTop.y - 40 },
        handleOut: { x: rightStemTop.x + 30, y: rightStemTop.y },
        smooth: true
      },
      {
        id: createId('pt'),
        ...rightStemBottom,
        handleIn: { x: rightStemBottom.x + 30, y: rightStemBottom.y },
        handleOut: null,
        smooth: false
      }
    ]
  };
};

export class GlyphModel {
  private state: GlyphModelState;
  private listeners = new Set<GlyphModelListener>();

  constructor(initialState?: Partial<GlyphModelState>) {
    this.state = {
      metrics: initialState?.metrics ?? deepClone(DEFAULT_METRICS),
      paths: initialState?.paths ?? [createDefaultPath()]
    };
  }

  subscribe(listener: GlyphModelListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  getState(): GlyphModelState {
    return deepClone(this.state);
  }

  getMetrics(): FontMetrics {
    return { ...this.state.metrics };
  }

  updateMetrics(partial: Partial<FontMetrics>): void {
    this.state.metrics = { ...this.state.metrics, ...partial };
    this.emit();
  }

  addPath(path?: GlyphPath): GlyphPath {
    const newPath = path ?? { id: createId('path'), closed: false, points: [] };
    this.state.paths = [...this.state.paths, deepClone(newPath)];
    this.emit();
    return newPath;
  }

  addAnchor(point: Partial<AnchorPoint>, options?: { pathId?: string; index?: number }): AnchorPoint {
    const targetPath = this.getPath(options?.pathId) ?? this.state.paths[0];
    if (!targetPath) {
      const created = this.addPath();
      return this.addAnchor(point, { ...options, pathId: created.id });
    }

    const newPoint: AnchorPoint = {
      id: point.id ?? createId('pt'),
      x: point.x ?? 0,
      y: point.y ?? 0,
      handleIn: point.handleIn ?? null,
      handleOut: point.handleOut ?? null,
      smooth: point.smooth ?? false
    };

    if (options?.index !== undefined) {
      targetPath.points.splice(options.index, 0, newPoint);
    } else {
      targetPath.points.push(newPoint);
    }

    this.emit();
    return deepClone(newPoint);
  }

  translateAnchor(pointId: string, delta: { x: number; y: number }): void {
    const { point } = this.getPointRef(pointId);
    if (!point) return;
    point.x += delta.x;
    point.y += delta.y;
    if (point.handleIn) {
      point.handleIn.x += delta.x;
      point.handleIn.y += delta.y;
    }
    if (point.handleOut) {
      point.handleOut.x += delta.x;
      point.handleOut.y += delta.y;
    }
    this.emit();
  }

  updateAnchor(pointId: string, updates: Partial<Omit<AnchorPoint, 'id'>>): void {
    const { point } = this.getPointRef(pointId);
    if (!point) return;
    Object.assign(point, deepClone(updates));
    this.emit();
  }

  updateHandle(pointId: string, handleKey: 'handleIn' | 'handleOut', position: HandlePosition | null): void {
    const { point } = this.getPointRef(pointId);
    if (!point) return;
    point[handleKey] = position ? { ...position } : null;
    if (point.smooth && position && point[handleKey === 'handleIn' ? 'handleOut' : 'handleIn']) {
      const other = point[handleKey === 'handleIn' ? 'handleOut' : 'handleIn'];
      if (other) {
        const dx = point.x - position.x;
        const dy = point.y - position.y;
        const mirrored = { x: point.x + dx, y: point.y + dy };
        point[handleKey === 'handleIn' ? 'handleOut' : 'handleIn'] = mirrored;
      }
    }
    this.emit();
  }

  removeAnchor(pointId: string): void {
    let didRemove = false;
    this.state.paths = this.state.paths.map(path => {
      const filtered = path.points.filter(point => point.id !== pointId);
      if (filtered.length !== path.points.length) {
        didRemove = true;
      }
      return { ...path, points: filtered };
    });
    if (didRemove) {
      this.emit();
    }
  }

  setPathClosed(pathId: string, closed: boolean): void {
    const path = this.getPath(pathId);
    if (!path) return;
    path.closed = closed;
    this.emit();
  }

  getPath(pathId?: string): GlyphPath | null {
    if (!pathId) return this.state.paths[0] ?? null;
    return this.state.paths.find(path => path.id === pathId) ?? null;
  }

  getAnchor(pointId: string): AnchorPoint | null {
    const ref = this.getPointRef(pointId);
    return ref.point ? deepClone(ref.point) : null;
  }

  private getPointRef(pointId: string): { path: GlyphPath | null; point: AnchorPoint | null } {
    for (const path of this.state.paths) {
      const found = path.points.find(p => p.id === pointId);
      if (found) return { path, point: found };
    }
    return { path: null, point: null };
  }

  private emit(): void {
    const snapshot = this.getState();
    this.listeners.forEach(listener => listener(snapshot));
  }
}

export const createDefaultGlyphModel = (): GlyphModel => new GlyphModel();
