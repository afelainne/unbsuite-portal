import './paper-env';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  diagnoseLogo, clearDiagnosisCache, nearestNotableRatio, overallLabel, fmt,
  strokeThicknessSamples, CRITERION_WEIGHTS, CRITERION_ORDER,
  type LogoDiagnosis, type CriterionKey,
} from '../lib/diagnosis';
import { clearMetricsCache } from '../lib/metrics';
import { suggestGeometries } from '../lib/suggest';
import {
  diagnosisToMarkdown, diagnosisToJSON, diagnosisToPDFBytes, reportFileName, wrapText,
} from '../lib/report-export';

const svg = (body: string, vb = '0 0 200 200') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;

/** Círculo perfeito: proporção 1:1, centro visual no centro, simétrico nos dois eixos. */
const CIRCLE = svg('<circle cx="100" cy="100" r="80" fill="#000"/>');

/** Retângulo 150 × 100: proporção 3:2 exata. */
const RECT = svg('<rect x="25" y="50" width="150" height="100" fill="#000"/>', '0 0 200 200');

/** Forma em L: massa concentrada no quadrante superior esquerdo. */
const ASYMMETRIC = svg(
  '<path d="M0 0 H200 V40 H40 V200 H0 Z" fill="#000"/>',
);

/** Moldura de 2 unidades num desenho de 200: some na redução. */
const THIN = svg('<path d="M0 0 H200 V200 H0 Z M2 2 V198 H198 V2 Z" fill="#000" fill-rule="evenodd"/>');

/** Arquivo sujo: texto vivo, path vazio, grupo ocioso, transform pendurado. */
const DIRTY = svg(
  '<g><g transform="translate(5 5)"><rect x="0" y="0" width="100" height="100" fill="#000"/></g></g>' +
  '<path d="M10 10" fill="#000"/>' +
  '<text x="10" y="150" font-size="20">UNBS</text>',
);

const byKey = (d: LogoDiagnosis, key: CriterionKey) => d.criteria.find(c => c.key === key)!;

/** Percorre o objeto inteiro procurando NaN / Infinity. */
function findNonFinite(value: unknown, path = '$'): string[] {
  if (typeof value === 'number') return Number.isFinite(value) ? [] : [`${path} = ${value}`];
  if (Array.isArray(value)) return value.flatMap((v, i) => findNonFinite(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => findNonFinite(v, `${path}.${k}`));
  }
  return [];
}

beforeEach(() => {
  clearDiagnosisCache();
  clearMetricsCache();
});

describe('nearestNotableRatio', () => {
  it('reconhece as proporções notáveis nos dois sentidos', () => {
    expect(nearestNotableRatio(1)!.name).toBe('1:1');
    expect(nearestNotableRatio(1.5)!.name).toBe('3:2');
    expect(nearestNotableRatio(1.5)!.deviationPercent).toBe(0);
    expect(nearestNotableRatio(1 / 1.5)!.name).toBe('2:3');
    expect(nearestNotableRatio(1.618)!.name).toBe('φ');
    expect(nearestNotableRatio(0)).toBeNull();
    expect(nearestNotableRatio(NaN)).toBeNull();
  });
});

describe('pesos e faixas', () => {
  it('os pesos somam 1 e cobrem todos os critérios', () => {
    const sum = CRITERION_ORDER.reduce((s, k) => s + CRITERION_WEIGHTS[k], 0);
    expect(sum).toBeCloseTo(1, 10);
    expect(new Set(CRITERION_ORDER).size).toBe(7);
  });

  it('a faixa da nota geral é monotônica', () => {
    expect(overallLabel(100)).toBe('Sem ajustes pendentes');
    expect(overallLabel(85)).toBe('Sem ajustes pendentes');
    expect(overallLabel(70)).toBe('Ajustes pontuais');
    expect(overallLabel(50)).toBe('Revisão necessária');
    expect(overallLabel(0)).toBe('Redesenho necessário');
  });

  it('fmt não devolve NaN', () => {
    expect(fmt(NaN)).toBe('—');
    expect(fmt(1.5, 1)).toBe('1,5');
  });
});

describe('círculo perfeito', () => {
  it('proporção 1:1, equilíbrio e simetria no topo da escala', () => {
    const d = diagnoseLogo(CIRCLE);
    expect(d.ok).toBe(true);
    expect(d.proportion.ratio).toBeCloseTo(1, 2);
    expect(d.proportion.nearest!.name).toBe('1:1');
    expect(d.proportion.matches).toBe(true);
    expect(byKey(d, 'proporcao').score).toBe(100);

    expect(d.balance.deviationPercent).toBeLessThan(1);
    expect(byKey(d, 'equilibrio').score).toBeGreaterThanOrEqual(95);
    expect(d.balance.quadrantSpread).toBeLessThan(0.02);

    expect(d.symmetry.bestPercent).toBeGreaterThan(90);
    expect(byKey(d, 'simetria').score).toBeGreaterThan(90);

    expect(d.reduction.losesAt).toBeNull();
    expect(byKey(d, 'reducao').score).toBe(100);

    expect(d.overall.score).toBeGreaterThanOrEqual(80);
    expect(d.overall.weightUsed).toBeGreaterThan(0.8);
  });

  it('não produz NaN nem Infinity em nenhum campo', () => {
    expect(findNonFinite(diagnoseLogo(CIRCLE))).toEqual([]);
  });
});

describe('retângulo', () => {
  it('bate 3:2, é simétrico e não tem cantos para medir', () => {
    const d = diagnoseLogo(RECT);
    expect(d.proportion.ratio).toBeCloseTo(1.5, 2);
    expect(d.proportion.nearest!.name).toBe('3:2');
    expect(byKey(d, 'proporcao').score).toBe(100);
    expect(d.symmetry.bestPercent).toBeGreaterThan(90);
    expect(d.consistency.cornerCount).toBe(0);
    // espessura uniforme: dispersão nula
    expect(d.consistency.strokeSpread).toBe(0);
    // ...mas um bloco cheio não tem traço nem canto: consistência não se aplica
    // (a mesma regra que impede o disco de levar nota média impede o bloco de
    // levar nota cheia por uma "espessura" que é a própria silhueta).
    expect(d.consistency.solidMass).toBe(true);
    expect(byKey(d, 'consistencia').applicable).toBe(false);
    // 4 nós: abaixo do mínimo de 8
    expect(d.complexity.reading).toBe('simples-demais');
    expect(d.complexity.subpathCount).toBe(1);
    expect(findNonFinite(d)).toEqual([]);
  });
});

describe('consistência: massa × traço', () => {
  /** Anel monolinear: traço de 20 unidades num desenho de 160. */
  const RING = svg(
    '<path d="M100 20 A80 80 0 1 1 99 20 Z M100 40 A60 60 0 1 0 101 40 Z" fill="#000" fill-rule="evenodd"/>',
  );

  it('forma sólida sem traço fino sai como não aplicável', () => {
    const d = diagnoseLogo(CIRCLE);
    // A espessura local de um disco é a corda: ela varia por geometria, não
    // por acabamento — julgar isso dava ~69 num círculo perfeito.
    expect(d.consistency.solidMass).toBe(true);
    expect(d.consistency.strokeSpread).toBeGreaterThan(0.15);
    const c = byKey(d, 'consistencia');
    expect(c.applicable).toBe(false);
    expect(c.issues).toEqual([]);
    expect(c.summary).toMatch(/sólida/i);
    // O peso do critério sai da média em vez de puxar a nota geral para baixo.
    expect(d.overall.weightUsed).toBeCloseTo(1 - CRITERION_WEIGHTS.consistencia, 5);
  });

  it('traço de verdade continua sendo avaliado', () => {
    const d = diagnoseLogo(RING);
    expect(d.consistency.solidMass).toBe(false);
    const c = byKey(d, 'consistencia');
    expect(c.applicable).toBe(true);
    expect(c.score).toBeGreaterThan(80);

    // Uma barra chapada também é traço: fina em relação ao lado maior.
    const bar = diagnoseLogo(svg('<rect x="0" y="90" width="200" height="20" fill="#000"/>'));
    expect(bar.consistency.solidMass).toBe(false);
    expect(byKey(bar, 'consistencia').applicable).toBe(true);
  });
});

describe('logo assimétrico', () => {
  it('perde nota em equilíbrio e simetria em relação ao círculo', () => {
    const circle = diagnoseLogo(CIRCLE);
    const l = diagnoseLogo(ASYMMETRIC);
    expect(l.ok).toBe(true);
    expect(l.balance.deviationPercent).toBeGreaterThan(3);
    expect(byKey(l, 'equilibrio').score).toBeLessThan(byKey(circle, 'equilibrio').score);
    expect(byKey(l, 'simetria').score).toBeLessThan(byKey(circle, 'simetria').score);
    expect(l.balance.heaviestQuadrant).toBe('topLeft');
    expect(l.balance.lightestQuadrant).toBe('bottomRight');
    expect(byKey(l, 'equilibrio').issues.length).toBeGreaterThan(0);
    expect(findNonFinite(l)).toEqual([]);
  });
});

describe('logo com traço muito fino', () => {
  it('reprova na redução e diz em que tamanho some', () => {
    const d = diagnoseLogo(THIN);
    expect(d.ok).toBe(true);
    expect(d.reduction.minStroke).toBeGreaterThan(0);
    expect(d.reduction.minStroke).toBeLessThan(4);
    expect(d.reduction.steps.map(s => s.size)).toEqual([16, 24, 32, 48]);
    expect(d.reduction.losesAt).toBe(48);
    expect(byKey(d, 'reducao').score).toBeLessThan(30);
    expect(byKey(d, 'reducao').issues.length).toBeGreaterThan(0);
    // e a nota geral cai por causa do peso 0,25 da redução
    expect(d.overall.score).toBeLessThan(diagnoseLogo(CIRCLE).overall.score);
    expect(findNonFinite(d)).toEqual([]);
  });
});

describe('higiene do arquivo', () => {
  it('conta texto vivo, path vazio, grupo ocioso e transform pendurado', () => {
    const d = diagnoseLogo(DIRTY);
    expect(d.hygiene.textElements).toBe(1);
    expect(d.hygiene.emptyPaths).toBeGreaterThanOrEqual(1);
    expect(d.hygiene.redundantGroups).toBeGreaterThanOrEqual(1);
    expect(d.hygiene.danglingTransforms).toBe(1);
    const h = byKey(d, 'higiene');
    expect(h.score).toBeLessThan(80);
    expect(h.issues.length).toBeGreaterThanOrEqual(3);
    expect(findNonFinite(d)).toEqual([]);
  });

  it('arquivo limpo não perde ponto de higiene', () => {
    const d = diagnoseLogo(CIRCLE);
    expect(byKey(d, 'higiene').score).toBe(100);
    expect(byKey(d, 'higiene').issues).toEqual([]);
  });
});

describe('entradas degeneradas', () => {
  it('string vazia devolve ok=false com motivo, sem lançar', () => {
    const d = diagnoseLogo('');
    expect(d.ok).toBe(false);
    expect(d.reason).toBeTruthy();
    expect(d.overall.score).toBe(0);
    expect(d.criteria).toHaveLength(7);
    expect(d.criteria.every(c => c.applicable === false)).toBe(true);
    expect(findNonFinite(d)).toEqual([]);
  });

  it('SVG sem formas devolve ok=false', () => {
    const d = diagnoseLogo(svg(''));
    expect(d.ok).toBe(false);
    expect(d.overall.weightUsed).toBe(0);
    expect(findNonFinite(d)).toEqual([]);
  });

  it('texto que não é SVG devolve ok=false', () => {
    const d = diagnoseLogo('nada disso é um svg');
    expect(d.ok).toBe(false);
    expect(d.reason).toBeTruthy();
  });

  it('aceita ParsedSVG-like ({ originalSVG, sourceSVG })', () => {
    const d = diagnoseLogo({ originalSVG: CIRCLE, sourceSVG: CIRCLE });
    expect(d.ok).toBe(true);
    expect(d.proportion.ratio).toBeCloseTo(1, 2);
  });
});

describe('invariantes de nota', () => {
  const cases: Array<[string, string]> = [
    ['círculo', CIRCLE], ['retângulo', RECT], ['assimétrico', ASYMMETRIC],
    ['fino', THIN], ['sujo', DIRTY], ['vazio', svg('')],
  ];

  it.each(cases)('%s: todas as notas ficam entre 0 e 100 e são inteiras', (_name, source) => {
    const d = diagnoseLogo(source);
    expect(d.overall.score).toBeGreaterThanOrEqual(0);
    expect(d.overall.score).toBeLessThanOrEqual(100);
    expect(Number.isInteger(d.overall.score)).toBe(true);
    for (const c of d.criteria) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(c.score)).toBe(true);
      expect(c.weight).toBe(CRITERION_WEIGHTS[c.key]);
      expect(typeof c.summary).toBe('string');
      expect(c.summary.length).toBeGreaterThan(0);
    }
  });

  it('a nota geral é a média ponderada dos critérios aplicáveis', () => {
    const d = diagnoseLogo(CIRCLE);
    const usable = d.criteria.filter(c => c.applicable);
    const w = usable.reduce((s, c) => s + c.weight, 0);
    const expected = usable.reduce((s, c) => s + c.score * c.weight, 0) / w;
    expect(d.overall.score).toBe(Math.round(expected));
    expect(d.overall.weightUsed).toBeCloseTo(w, 2);
  });

  it('o resultado é determinístico (mesma entrada, mesma saída)', () => {
    const a = diagnoseLogo(ASYMMETRIC);
    clearDiagnosisCache();
    clearMetricsCache();
    const b = diagnoseLogo(ASYMMETRIC);
    expect(b.overall.score).toBe(a.overall.score);
    expect(b.criteria.map(c => c.score)).toEqual(a.criteria.map(c => c.score));
  });
});

describe('strokeThicknessSamples', () => {
  it('mede a espessura constante de uma barra', () => {
    const d = diagnoseLogo(svg('<rect x="0" y="90" width="200" height="20" fill="#000"/>'));
    expect(d.consistency.strokeSamples).toBeGreaterThan(0);
    expect(d.consistency.strokeQuantiles!.p50).toBeCloseTo(20, 0);
    expect(d.consistency.strokeSpread).toBe(0);
  });

  it('devolve lista vazia sem paths', () => {
    expect(strokeThicknessSamples([], { x: 0, y: 0, width: 10, height: 10 })).toEqual([]);
  });
});

describe('relatório (report-export)', () => {
  const meta = () => ({
    fileName: 'Logo Ação.svg',
    date: new Date(Date.UTC(2026, 0, 15, 12, 0, 0)),
    suggestions: suggestGeometries(diagnoseLogo(THIN)),
  });

  it('Markdown traz nota geral, tabela de critérios e sugestões', () => {
    const md = diagnosisToMarkdown(diagnoseLogo(THIN), meta());
    expect(md).toContain('# Diagnóstico do logo');
    expect(md).toContain('## Nota geral:');
    expect(md).toContain('| Critério | Nota | Peso | Situação |');
    expect(md).toContain('Redução');
    expect(md).toContain('reductionTest');
    expect(md).not.toContain('NaN');
    expect(md).not.toContain('undefined');
  });

  it('JSON é válido e carrega diagnóstico + sugestões', () => {
    const parsed = JSON.parse(diagnosisToJSON(diagnoseLogo(THIN), meta()));
    expect(parsed.tool).toBe('unbsgrid');
    expect(parsed.formatVersion).toBe(1);
    expect(parsed.diagnosis.criteria).toHaveLength(7);
    expect(parsed.suggestions.length).toBeGreaterThan(0);
    expect(parsed.generatedAt).toBe('2026-01-15T12:00:00.000Z');
  });

  it('PDF sai com cabeçalho e trailer válidos', () => {
    const bytes = diagnosisToPDFBytes(diagnoseLogo(THIN), meta());
    expect(bytes.byteLength).toBeGreaterThan(1000);
    const head = String.fromCharCode(...bytes.slice(0, 8));
    const tail = String.fromCharCode(...bytes.slice(-8));
    expect(head.startsWith('%PDF-1.4')).toBe(true);
    expect(tail).toContain('%%EOF');
  });

  it('relatório de SVG vazio não quebra em nenhum formato', () => {
    const d = diagnoseLogo('');
    expect(diagnosisToMarkdown(d)).toContain('Não foi possível diagnosticar');
    expect(() => JSON.parse(diagnosisToJSON(d))).not.toThrow();
    expect(diagnosisToPDFBytes(d).byteLength).toBeGreaterThan(300);
  });

  it('nome de arquivo é higienizado', () => {
    expect(reportFileName({ fileName: 'Logo Ação v2.svg' }, 'md')).toBe('Logo-Acao-v2-diagnostico.md');
    expect(reportFileName(undefined, 'json')).toBe('logo-diagnostico.json');
  });

  it('quebra de linha respeita a largura útil', () => {
    const lines = wrapText('a'.repeat(400), 9);
    expect(lines.length).toBe(1); // sem espaços não há onde quebrar
    const many = wrapText(Array.from({ length: 80 }, () => 'palavra').join(' '), 9);
    expect(many.length).toBeGreaterThan(1);
    expect(many.every(l => l.length <= 103)).toBe(true);
  });
});
