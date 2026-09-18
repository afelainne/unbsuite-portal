import './paper-env';
import { describe, it, expect, beforeEach } from 'vitest';
import { suggestGeometries, allSuggestedKeys, criticalSuggestions } from '../lib/suggest';
import { diagnoseLogo, clearDiagnosisCache, OK_SCORE, type LogoDiagnosis } from '../lib/diagnosis';
import { clearMetricsCache } from '../lib/metrics';
import { GEOMETRY_KEYS } from '../types/geometry';

const svg = (body: string, vb = '0 0 200 200') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;

const RECT = svg('<rect x="25" y="50" width="150" height="100" fill="#000"/>');
const ASYMMETRIC = svg('<path d="M0 0 H200 V40 H40 V200 H0 Z" fill="#000"/>');
const THIN = svg('<path d="M0 0 H200 V200 H0 Z M2 2 V198 H198 V2 Z" fill="#000" fill-rule="evenodd"/>');
const BANNER = svg('<rect x="0" y="90" width="1000" height="20" fill="#000"/>', '0 0 1000 200');

const knownKeys = new Set<string>(GEOMETRY_KEYS as readonly string[]);

beforeEach(() => {
  clearDiagnosisCache();
  clearMetricsCache();
});

describe('suggestGeometries', () => {
  it('só devolve chaves que existem em GeometryOptions', () => {
    for (const source of [RECT, ASYMMETRIC, THIN, BANNER]) {
      const s = suggestGeometries(diagnoseLogo(source));
      for (const sug of s) {
        expect(sug.keys.length).toBeGreaterThan(0);
        for (const k of sug.keys) expect(knownKeys.has(k as string)).toBe(true);
      }
    }
  });

  it('logo assimétrico pede equilíbrio antes de simetria', () => {
    const s = suggestGeometries(diagnoseLogo(ASYMMETRIC));
    const ids = s.map(x => x.id);
    expect(ids).toContain('equilibrio');
    expect(ids).toContain('simetria');
    expect(ids.indexOf('equilibrio')).toBeLessThan(ids.indexOf('simetria'));
    const eq = s.find(x => x.id === 'equilibrio')!;
    expect(eq.keys).toContain('opticalCenter');
    expect(eq.keys).toContain('visualWeightMap');
    expect(eq.reason).toMatch(/\d/);
  });

  it('traço fino pede o teste de redução', () => {
    const s = suggestGeometries(diagnoseLogo(THIN));
    const red = s.find(x => x.id === 'reducao');
    expect(red).toBeDefined();
    expect(red!.keys).toContain('reductionTest');
    expect(red!.keys).toContain('strokeWeight');
    expect(red!.criterion).toBe('reducao');
    expect(red!.urgency).toBeGreaterThan(0);
  });

  it('proporção em faixa entra na lista', () => {
    const d = diagnoseLogo(BANNER);
    expect(d.proportion.ratio).toBeGreaterThan(4);
    const s = suggestGeometries(d);
    const prop = s.find(x => x.id === 'proporcao');
    expect(prop).toBeDefined();
    expect(prop!.keys).toContain('boundingRects');
  });

  it('desenho sem ponto fraco não gera sugestão', () => {
    const d = diagnoseLogo(RECT);
    const weak = d.criteria.filter(c => c.applicable && c.score < OK_SCORE);
    const s = suggestGeometries(d);
    expect(s.length).toBe(weak.length ? s.length : 0);
    if (!weak.length) expect(s).toEqual([]);
  });

  it('respeita o limite e ordena por urgência decrescente', () => {
    const d = diagnoseLogo(ASYMMETRIC);
    const all = suggestGeometries(d, { threshold: 101 });
    expect(all.length).toBeLessThanOrEqual(6);
    const limited = suggestGeometries(d, { threshold: 101, limit: 2 });
    expect(limited).toHaveLength(2);
    for (let i = 1; i < all.length; i++) expect(all[i - 1].urgency).toBeGreaterThanOrEqual(all[i].urgency);
  });

  it('a variante de complexidade segue a leitura do diagnóstico', () => {
    const d = diagnoseLogo(RECT);
    expect(d.complexity.reading).toBe('simples-demais');
    const s = suggestGeometries(d, { threshold: 101 });
    const c = s.find(x => x.criterion === 'complexidade')!;
    expect(c.id).toBe('complexidade-baixa');
    expect(c.keys).toContain('constructionGrid');
  });

  it('diagnóstico inválido ou vazio devolve lista vazia', () => {
    expect(suggestGeometries(null)).toEqual([]);
    expect(suggestGeometries(undefined)).toEqual([]);
    expect(suggestGeometries(diagnoseLogo(''))).toEqual([]);
    expect(suggestGeometries({ ok: true } as unknown as LogoDiagnosis)).toEqual([]);
  });

  it('critérios não aplicáveis não viram sugestão', () => {
    const d = diagnoseLogo(RECT);
    const naKeys = d.criteria.filter(c => !c.applicable).map(c => c.key);
    const s = suggestGeometries(d, { threshold: 101 });
    for (const k of naKeys) expect(s.some(x => x.criterion === k)).toBe(false);
  });
});

describe('allSuggestedKeys', () => {
  it('une as chaves sem repetir e mantém a ordem', () => {
    const s = suggestGeometries(diagnoseLogo(ASYMMETRIC), { threshold: 101 });
    const keys = allSuggestedKeys(s);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) expect(knownKeys.has(k as string)).toBe(true);
  });

  it('lida com lista vazia', () => {
    expect(allSuggestedKeys([])).toEqual([]);
  });
});

describe('criticalSuggestions', () => {
  it('só mantém sugestões de critérios abaixo de 50', () => {
    const d = diagnoseLogo(ASYMMETRIC);
    const s = suggestGeometries(d, { threshold: 101 });
    const crit = criticalSuggestions(d, s);
    for (const c of crit) {
      const criterion = d.criteria.find(x => x.key === c.criterion)!;
      expect(criterion.score).toBeLessThan(50);
    }
    expect(crit.some(c => c.criterion === 'equilibrio')).toBe(true);
    expect(criticalSuggestions(null, s)).toEqual([]);
  });
});
