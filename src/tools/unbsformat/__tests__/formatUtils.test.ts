import { describe, it, expect } from 'vitest';
import { aspectRatioLabel, matchesQuery, swapOrientation, formatDimensions } from '../lib/formatUtils';
import { FormatPreset } from '../lib/formats';
import { loadState, saveState, sanitizeLayers } from '../lib/storage';
import { defaultConfig } from '../lib/config';
import { DEFAULT_LAYERS } from '../lib/scene';

const a4: FormatPreset = { id: 'a4', name: 'A4', width: 210, height: 297, unit: 'mm', category: 'iso' };
const ig: FormatPreset = { id: 'ig_retrato', name: 'Instagram retrato 4:5', width: 1080, height: 1350, unit: 'px', category: 'social' };

describe('aspectRatioLabel', () => {
  it('reconhece razões inteiras comuns', () => {
    expect(aspectRatioLabel(16, 9)).toBe('16:9');
    expect(aspectRatioLabel(3, 2)).toBe('3:2');
    expect(aspectRatioLabel(100, 100)).toBe('1:1');
  });

  it('cai para decimal quando não há razão inteira reconhecível', () => {
    expect(aspectRatioLabel(210, 297)).toBe('1 : 1,414');
    expect(aspectRatioLabel(297, 210)).toBe('1,414 : 1');
  });

  it('não quebra com valores inválidos', () => {
    expect(aspectRatioLabel(0, 10)).toBe('—');
    expect(aspectRatioLabel(10, 0)).toBe('—');
  });
});

describe('matchesQuery', () => {
  it('busca por nome, id e categoria, sem acento', () => {
    expect(matchesQuery(a4, 'a4')).toBe(true);
    expect(matchesQuery(a4, 'iso')).toBe(true);
    expect(matchesQuery(ig, 'instagram')).toBe(true);
    expect(matchesQuery(ig, 'redes sociais')).toBe(true);
    expect(matchesQuery(a4, 'cartaz')).toBe(false);
  });

  it('busca por dimensão única, em qualquer eixo', () => {
    expect(matchesQuery(a4, '210')).toBe(true);
    expect(matchesQuery(a4, '297')).toBe(true);
    expect(matchesQuery(a4, '500')).toBe(false);
    expect(matchesQuery(ig, '1350px')).toBe(true);
  });

  it('busca por par de dimensões, em qualquer ordem', () => {
    expect(matchesQuery(a4, '210x297')).toBe(true);
    expect(matchesQuery(a4, '297 × 210')).toBe(true);
    expect(matchesQuery(a4, '210x300')).toBe(false);
    expect(matchesQuery(ig, '1080x1350')).toBe(true);
  });

  it('busca vazia devolve tudo', () => {
    expect(matchesQuery(a4, '   ')).toBe(true);
  });
});

describe('swapOrientation', () => {
  it('troca largura e altura mantendo id e categoria', () => {
    const r = swapOrientation(a4);
    expect(r.width).toBe(297);
    expect(r.height).toBe(210);
    expect(r.id).toBe('a4');
    expect(r.category).toBe('iso');
  });
});

describe('formatDimensions', () => {
  it('usa vírgula nos decimais e a unidade nativa', () => {
    expect(formatDimensions({ width: 210, height: 297 })).toBe('210 × 297 mm');
    expect(formatDimensions({ width: 88.9, height: 50.8 })).toBe('88,9 × 50,8 mm');
    expect(formatDimensions({ width: 1080, height: 1350, unit: 'px' })).toBe('1080 × 1350 px');
  });
});

describe('storage', () => {
  it('guarda e lê o estado', () => {
    const config = defaultConfig();
    saveState({ config, layers: { ...DEFAULT_LAYERS, cotas: false }, unit: 'pt' });
    const back = loadState()!;
    expect(back.config).toEqual(config);
    expect(back.layers?.cotas).toBe(false);
    expect(back.unit).toBe('pt');
  });

  it('sobrevive a localStorage quebrado', () => {
    localStorage.setItem('unbsformat:v2', '{quebrado');
    expect(loadState()).toBeNull();
  });

  it('sanitizeLayers ignora chaves estranhas', () => {
    const l = sanitizeLayers({ margens: false, hack: true, cotas: 'sim' });
    expect(l.margens).toBe(false);
    expect(l.cotas).toBe(DEFAULT_LAYERS.cotas);
    expect('hack' in l).toBe(false);
  });
});
