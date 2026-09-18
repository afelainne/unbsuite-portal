// Persistência do último estado. localStorage pode estar bloqueado (modo privado,
// iframe): toda leitura e escrita fica em try/catch e a ferramenta segue sem ela.

import { sanitizeConfig } from './config';
import type { GridConfig } from './grid';
import { DEFAULT_LAYERS, LayerId, Layers } from './scene';
import { Unit, UNITS } from './units';

const KEY = 'unbsformat:v2';

export interface PersistedState {
  config: GridConfig;
  layers: Layers;
  unit: Unit;
}

export function sanitizeLayers(raw: unknown): Layers {
  const out: Layers = { ...DEFAULT_LAYERS };
  if (raw && typeof raw === 'object') {
    (Object.keys(DEFAULT_LAYERS) as LayerId[]).forEach(k => {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === 'boolean') out[k] = v;
    });
  }
  return out;
}

export function loadState(): Partial<PersistedState> | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    const config = sanitizeConfig(parsed.config);
    return {
      config: config ?? undefined,
      layers: sanitizeLayers(parsed.layers),
      unit: UNITS.includes(parsed.unit as Unit) ? (parsed.unit as Unit) : undefined,
    };
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* armazenamento indisponível: seguir sem persistir */
  }
}
