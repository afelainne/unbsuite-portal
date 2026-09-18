import { describe, it, expect } from 'vitest';
import { FORMAT_PRESETS, nearestClassicRatio, presetSizeMm } from '../lib/formats';
import { closeGrid, computeGrid, diagnose, foldPanels, GridConfig, spineWidth, CLOSE_TOLERANCE } from '../lib/grid';
import { applyMethod, canonMargins, constructionLines, gerstnerDivisions, goldenMargins, PHI, tschicholdMargins } from '../lib/methods';
import { configForPreset, configFromJson, configToJson, defaultConfig, sanitizeConfig } from '../lib/config';
import { figmaValues, figmaText, indesignText, indesignValues, buildGridSvg } from '../lib/exports';
import { buildPdfString, pageGeometry } from '../lib/pdf';
import { DEFAULT_LAYERS } from '../lib/scene';
import { fmt, fromUnit, mmToPt, mmToPx, parseNum, ptToMm, pxToMm, toUnit } from '../lib/units';

const base = (over: Partial<GridConfig> = {}): GridConfig => ({
  ...defaultConfig(),
  margins: { top: 20, bottom: 20, inside: 20, outside: 20 },
  baseline: { enabled: false, leading: ptToMm(12), offset: 0, rowGutterLines: 1, columnGutterLines: 0 },
  columns: 1,
  rows: 1,
  facing: false,
  ...over,
});

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('unidades', () => {
  it('converte mm, pt, in e px', () => {
    close(mmToPt(25.4), 72);
    close(mmToPx(25.4), 96);
    close(toUnit(25.4, 'in'), 1);
    close(fromUnit(12, 'pt'), 4.233333333, 1e-6);
    close(ptToMm(mmToPt(123.4)), 123.4);
    close(pxToMm(1080), 285.75);
  });

  it('formata com vírgula e lê os dois separadores', () => {
    expect(fmt(12.5)).toBe('12,5');
    expect(fmt(210)).toBe('210');
    expect(fmt(-0.0001)).toBe('0');
    expect(parseNum('12,5')).toBe(12.5);
    expect(parseNum('3.175')).toBe(3.175);
    expect(parseNum('abc')).toBeNaN();
  });
});

describe('formatos', () => {
  const get = (id: string) => FORMAT_PRESETS.find(f => f.id === id)!;

  it('A4 é 210 × 297 mm e a série A segue a ISO 216', () => {
    expect(presetSizeMm(get('a4'))).toEqual({ width: 210, height: 297 });
    // cada formato A é a metade do anterior, arredondado para baixo
    const a = ['a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'].map(get);
    for (let i = 1; i < a.length; i++) {
      expect(a[i].height).toBe(a[i - 1].width);
      expect(a[i].width).toBe(Math.floor(a[i - 1].height / 2));
    }
    expect(get('b5')).toMatchObject({ width: 176, height: 250 });
    expect(get('c5')).toMatchObject({ width: 162, height: 229 });
    expect(get('dl')).toMatchObject({ width: 110, height: 220 });
  });

  it('formatos americanos em polegadas exatas', () => {
    expect(get('letter')).toMatchObject({ width: 215.9, height: 279.4 });
    expect(get('legal')).toMatchObject({ width: 215.9, height: 355.6 });
    expect(get('tabloid')).toMatchObject({ width: 279.4, height: 431.8 });
  });

  it('redes sociais ficam em px', () => {
    expect(get('ig_retrato')).toMatchObject({ width: 1080, height: 1350, unit: 'px' });
    close(presetSizeMm(get('ig_retrato')).width, 285.75);
  });

  it('ids são únicos', () => {
    const ids = FORMAT_PRESETS.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('acha a proporção clássica mais próxima', () => {
    expect(nearestClassicRatio(210, 297)?.ratio.id).toBe('iso');
    expect(nearestClassicRatio(200, 300)?.ratio.id).toBe('2:3');
    expect(nearestClassicRatio(1080, 1350)?.ratio.id).toBe('4:5');
    expect(nearestClassicRatio(100, 161.8)?.ratio.id).toBe('golden');
    expect(nearestClassicRatio(0, 1)).toBeNull();
  });
});

describe('sangria', () => {
  it('soma a sangria em volta do formato', () => {
    const r = computeGrid(base({ bleed: 3 }));
    expect(r.bleedBox).toEqual({ x: -3, y: -3, w: 216, h: 303 });
  });

  it('com páginas espelhadas a sangria envolve o espelho', () => {
    const r = computeGrid(base({ bleed: 3, facing: true }));
    expect(r.bleedBox.w).toBe(426);
    expect(r.folds).toEqual([210]);
  });
});

describe('Van de Graaf', () => {
  it('numa página 2:3 dá margens de 1/9 e 2/9 e mancha na proporção da página', () => {
    const W = 200;
    const H = 300;
    const c = applyMethod('vandegraaf', base({ width: W, height: H }));
    close(c.margins.inside, W / 9);
    close(c.margins.top, H / 9);
    close(c.margins.outside, (2 * W) / 9);
    close(c.margins.bottom, (2 * H) / 9);
    const r = computeGrid(c);
    const tb = r.pages[1].textBlock;
    close(tb.h / tb.w, H / W);
    // a altura da mancha é igual à largura da página
    close(tb.h, W);
    expect(diagnose(c, r).sameProportion).toBe(true);
  });

  it('o canto da mancha fica sobre as diagonais da construção', () => {
    const c = applyMethod('vandegraaf', base({ width: 200, height: 300 }));
    const r = computeGrid(c);
    const recto = r.pages[1];
    // canto superior interno na diagonal da página: y = H·u/W
    const u = recto.textBlock.x - recto.trim.x;
    close(recto.textBlock.y, (300 * u) / 200);
    const segs = constructionLines({ method: 'vandegraaf', width: 200, height: 300, pages: r.pages });
    expect(segs.length).toBeGreaterThan(8);
  });

  it('Tschichold 2:3:4:6 coincide com Van de Graaf na página 2:3', () => {
    const t = tschicholdMargins(200, 300)!;
    const v = canonMargins(200, 300, 9);
    close(t.inside, v.inside);
    close(t.top, v.top);
    close(t.outside, v.outside);
    close(t.bottom, v.bottom);
    // e mantém a razão em qualquer página em pé
    const a4 = tschicholdMargins(210, 297)!;
    close(a4.top / a4.inside, 1.5);
    close(a4.bottom / a4.inside, 3);
    close(297 - a4.top - a4.bottom, 210);
    expect(tschicholdMargins(297, 210)).toBeNull();
  });

  it('Rosarivo em doze avos e seção áurea', () => {
    const r12 = canonMargins(120, 240, 12);
    expect(r12).toEqual({ inside: 10, outside: 20, top: 20, bottom: 40 });
    const g = goldenMargins(100, 200);
    close(100 - g.inside - g.outside, 100 / PHI);
    close(g.outside / g.inside, PHI);
    close(g.bottom / g.top, PHI);
  });
});

describe('Müller-Brockmann: linhas reais', () => {
  it('campos em linhas inteiras fecham a mancha exatamente', () => {
    const L = ptToMm(12);
    const c = applyMethod('mullerbrockmann', base({ baseline: { enabled: true, leading: L, offset: 0, rowGutterLines: 1, columnGutterLines: 1 } }), { columns: 6, rows: 8 });
    const r = computeGrid(c);
    expect(r.closes).toBe(true);
    const lines = r.lines!;
    // linhas × campos + medianizes × linhas = altura da mancha
    expect(lines.used).toBe(8 * lines.perRow + 7 * 1);
    close(lines.used * L, r.pages[0].textBlock.h, CLOSE_TOLERANCE);
    close(r.rowHeight, lines.perRow * L);
    close(r.rowGutter, L);
    close(r.columnGutter, L);
    // cada campo termina numa linha de base
    r.pages[0].rows.forEach(row => {
      const bottom = row.y + row.h;
      expect(r.baselines.some(y => Math.abs(y - bottom) < 1e-6)).toBe(true);
    });
  });

  it('mostra a sobra quando não fecha', () => {
    const L = ptToMm(12);
    const c = base({ rows: 4, baseline: { enabled: true, leading: L, offset: 0, rowGutterLines: 1, columnGutterLines: 0 }, margins: { top: 20, bottom: 21, inside: 20, outside: 20 } });
    const r = computeGrid(c);
    const textH = 297 - 41;
    const avail = Math.floor(textH / L);
    const per = Math.floor((avail - 3) / 4);
    close(r.leftover, textH - (4 * per + 3) * L);
    expect(r.closes).toBe(r.leftover < CLOSE_TOLERANCE);
    expect(r.pages[0].leftover?.h).toBeCloseTo(r.leftover, 6);
  });
});

describe('fechar a grade', () => {
  it('resolve as margens com a menor mudança e mantém a proporção topo:pé', () => {
    const L = ptToMm(12);
    const c = base({ rows: 5, margins: { top: 20, bottom: 30, inside: 20, outside: 20 }, baseline: { enabled: true, leading: L, offset: 0, rowGutterLines: 1, columnGutterLines: 0 } });
    expect(computeGrid(c).closes).toBe(false);
    const res = closeGrid(c);
    expect(res.closed).toBe(true);
    const r = computeGrid(res.config);
    expect(r.leftover).toBeLessThan(CLOSE_TOLERANCE);
    // repartição proporcional
    close(res.delta.top / res.delta.bottom, 20 / 30, 1e-9);
    // a mudança é menor que meia linha por campo em cada sentido
    expect(Math.abs(res.delta.top + res.delta.bottom)).toBeLessThanOrEqual(5 * L);
  });

  it('em tela deixa colunas com largura inteira em px', () => {
    const c = base({ docUnit: 'px', width: pxToMm(1080), height: pxToMm(1350), columns: 12, columnGutter: pxToMm(24), margins: { top: pxToMm(60), bottom: pxToMm(60), inside: pxToMm(61), outside: pxToMm(61) } });
    const res = closeGrid(c);
    const r = computeGrid(res.config);
    expect(diagnose(res.config, r).integerPx).toBe(true);
    const colPx = mmToPx(r.pages[0].columns[0].w);
    close(colPx, Math.round(colPx), 1e-6);
  });
});

describe('páginas espelhadas', () => {
  it('espelha interna e externa', () => {
    const c = base({ facing: true, margins: { top: 20, bottom: 30, inside: 15, outside: 25 } });
    const r = computeGrid(c);
    const [verso, recto] = r.pages;
    expect(verso.side).toBe('verso');
    expect(verso.margins.left).toBe(25);
    expect(verso.margins.right).toBe(15);
    expect(recto.margins.left).toBe(15);
    expect(recto.margins.right).toBe(25);
    // simétricas em relação à lombada
    close(210 - (verso.textBlock.x + verso.textBlock.w), recto.textBlock.x - 210);
  });
});

describe('dobras', () => {
  it('carteira: o painel de dentro é mais estreito e troca de lado no verso', () => {
    expect(foldPanels(297, 'roll', 3, 'inside')).toEqual([100, 100, 97]);
    expect(foldPanels(297, 'roll', 3, 'outside')).toEqual([97, 100, 100]);
    expect(foldPanels(297, 'z')).toEqual([99, 99, 99]);
    const gate = foldPanels(420, 'gate', 2);
    expect(gate.reduce((a, b) => a + b, 0)).toBeCloseTo(420, 9);
    expect(gate[0]).toBe(104);
  });

  it('cada painel tem sua mancha; margem interna na dobra', () => {
    const c = base({ width: 297, height: 210, fold: 'roll', foldTuck: 3, margins: { top: 10, bottom: 10, inside: 8, outside: 5 } });
    const r = computeGrid(c);
    expect(r.pages).toHaveLength(3);
    expect(r.folds).toEqual([100, 200]);
    expect(r.pages[0].margins).toMatchObject({ left: 5, right: 8 });
    expect(r.pages[1].margins).toMatchObject({ left: 8, right: 8 });
    expect(r.pages[2].margins).toMatchObject({ left: 8, right: 5 });
  });

  it('calcula a lombada', () => {
    // 200 páginas, papel de 100 µm: 100 folhas × 0,1 mm
    expect(spineWidth(200, 100)).toBeCloseTo(10, 9);
    expect(spineWidth(200, 100, 300)).toBeCloseTo(10.6, 9);
    expect(spineWidth(0, 100)).toBe(0);
  });
});

describe('Gerstner, 58 unidades', () => {
  it('divide sem resto em 1 a 6 colunas com medianiz de 2 unidades', () => {
    const divs = gerstnerDivisions(174);
    expect(divs.map(d => d.columnUnits)).toEqual([58, 28, 18, 13, 10, 8]);
    divs.forEach(d => {
      close(d.columns * d.columnWidth + (d.columns - 1) * d.gutter, 174);
      expect(Number.isInteger(d.columnUnits)).toBe(true);
    });
  });

  it('o método usa a unidade como entrelinha e fecha a grade', () => {
    const c = applyMethod('gerstner', base({ margins: { top: 20, bottom: 20, inside: 18, outside: 18 } }), { columns: 3, rows: 4 });
    const r = computeGrid(c);
    const unit = (210 - 36) / 58;
    close(c.baseline.leading, unit);
    close(r.columnGutter, 2 * unit);
    close(r.pages[0].columns[0].w, 18 * unit);
    expect(r.closes).toBe(true);
  });
});

describe('digital', () => {
  it('12 colunas no Instagram 4:5', () => {
    const ig = FORMAT_PRESETS.find(f => f.id === 'ig_retrato')!;
    const c = applyMethod('digital12', configForPreset(ig, defaultConfig()));
    const r = computeGrid(c);
    expect(r.pages[0].columns).toHaveLength(12);
    close(mmToPx(r.columnGutter), 24);
    expect(c.bleed).toBe(0);
    // área segura do recorte 3:4 da grade do perfil
    close(mmToPx(c.safe.left), 33.75);
  });

  it('Material escolhe colunas pela largura', () => {
    const at = (px: number) => applyMethod('material', base({ docUnit: 'px', width: pxToMm(px), height: pxToMm(800) })).columns;
    expect(at(390)).toBe(4);
    expect(at(768)).toBe(8);
    expect(at(1440)).toBe(12);
  });

  it('8 pt: margens e linha de base em múltiplos de 8', () => {
    const c = applyMethod('oitopt', base({ docUnit: 'px', width: pxToMm(1440), height: pxToMm(900), columns: 12, rows: 3, margins: { top: pxToMm(50), bottom: pxToMm(50), inside: pxToMm(70), outside: pxToMm(70) } }));
    close(mmToPx(c.baseline.leading), 8);
    close(mmToPx(c.margins.inside) % 8, 0, 1e-6);
    expect(computeGrid(c).closes).toBe(true);
  });
});

describe('diagnóstico', () => {
  it('estima a medida em caracteres', () => {
    // coluna de 90 mm em corpo 10 pt: 90 / (10 pt × 0,5)
    const c = base({ width: 130, margins: { top: 20, bottom: 20, inside: 20, outside: 20 }, fontSize: ptToMm(10) });
    const d = diagnose(c, computeGrid(c));
    close(d.measure, 90 / (ptToMm(10) * 0.5));
    expect(d.measureVerdict).toBe('boa');
  });

  it('avisa quando a mancha invade a área de segurança', () => {
    const c = base({ safe: { top: 5, right: 5, bottom: 5, left: 5 }, margins: { top: 3, bottom: 20, inside: 20, outside: 20 } });
    expect(computeGrid(c).warnings.join(' ')).toMatch(/segurança/);
  });
});

describe('exportação', () => {
  const L = ptToMm(12);
  const c = applyMethod('mullerbrockmann', base({ facing: true, bleed: 3, baseline: { enabled: true, leading: L, offset: 0, rowGutterLines: 1, columnGutterLines: 1 } }), { columns: 6, rows: 8 });
  const r = computeGrid(c);

  it('valores do InDesign em pt', () => {
    const v = indesignValues(c, r);
    expect(v.pageWidth).toBeCloseTo(595.276, 3);
    expect(v.pageHeight).toBeCloseTo(841.89, 3);
    expect(v.columns).toBe(6);
    expect(v.columnGutter).toBeCloseTo(12, 6);
    expect(v.rowGutter).toBeCloseTo(12, 6);
    expect(v.baseline).toEqual({ start: 0, increment: 12, relativeTo: 'margem superior' });
    expect(v.facingPages).toBe(true);
    expect(v.bleed).toBeCloseTo(8.504, 3);
    const t = indesignText(c, r);
    expect(t).toContain('incremento 12 pt');
    expect(t).toContain('6 colunas, medianiz 12 pt');
  });

  it('valores do Figma', () => {
    const v = figmaValues(c, r);
    expect(v.frame.width).toBeCloseTo(595.28, 2);
    const cols = v.grids.find(g => g.pattern === 'COLUMNS')!;
    expect(cols.count).toBe(6);
    expect(cols.gutterSize).toBeCloseTo(12, 2);
    const baseline = v.grids[v.grids.length - 1];
    expect(baseline.sectionSize).toBe(1);
    expect(baseline.gutterSize).toBeCloseTo(11, 2);
    expect(figmaText(c, r)).toContain('Columns: count 6');
  });

  it('SVG em escala real com uma camada por grupo', () => {
    const svg = buildGridSvg(c, r, DEFAULT_LAYERS);
    expect(svg).toContain('width="426mm"');
    expect(svg).toContain('<g id="modulos">');
    expect(svg).toContain('<g id="linhasBase">');
    expect(svg).not.toContain('NaN');
  });

  it('PDF com caixas de corte e sangria, marcas fora da sangria e guias que não imprimem', () => {
    const pdf = buildPdfString(c, r, { layers: DEFAULT_LAYERS });
    expect(pdf.startsWith('%PDF-1.5')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
    // espelho sai em duas páginas
    expect(pdf).toContain('/Count 2');
    const g = pageGeometry({ x: 0, y: 0, w: 210, h: 297 }, 3);
    expect(g.slug).toBeCloseTo(10, 9);
    expect(pdf).toContain('/MediaBox [0 0 651.969 898.583]');
    expect(pdf).toContain('/TrimBox [28.346 28.346 623.622 870.236]');
    expect(pdf).toContain('/BleedBox [19.843 19.843 632.126 878.74]');
    expect(pdf).toContain('/PrintState /OFF');
    expect(pdf).toContain('/OC /Guias BDC');
    expect(pdf).not.toMatch(/\de[+-]\d/);
    expect(pdf).not.toContain('NaN');
  });

  it('a tabela xref aponta para o início de cada objeto', () => {
    const pdf = buildPdfString(c, r, { layers: DEFAULT_LAYERS });
    const xref = pdf.slice(pdf.lastIndexOf('xref'));
    const count = parseInt(xref.split('\n')[1].split(' ')[1], 10);
    const lines = xref.split('\n').slice(3, 2 + count);
    lines.forEach((line, i) => {
      const offset = parseInt(line.slice(0, 10), 10);
      expect(pdf.slice(offset)).toMatch(new RegExp(`^${i + 1} 0 obj`));
    });
  });
});

describe('configuração', () => {
  it('a configuração inicial já fecha', () => {
    const c = defaultConfig();
    expect(computeGrid(c).closes).toBe(true);
  });

  it('JSON vai e volta', () => {
    const c = applyMethod('vandegraaf', defaultConfig());
    const back = configFromJson(configToJson(c));
    expect(back).toEqual(c);
  });

  it('recusa JSON inválido e limita valores', () => {
    expect(configFromJson('não é json')).toBeNull();
    expect(sanitizeConfig({ width: 0, height: 10 })).toBeNull();
    const s = sanitizeConfig({ width: 100, height: 100, columns: 999, method: 'hack', fold: 'x' })!;
    expect(s.columns).toBe(48);
    expect(s.method).toBe('livre');
    expect(s.fold).toBe('none');
  });

  it('trocar de formato recalcula margens do cânone', () => {
    const vdg = applyMethod('vandegraaf', defaultConfig());
    const a5 = FORMAT_PRESETS.find(f => f.id === 'a5')!;
    const next = configForPreset(a5, vdg);
    close(next.margins.inside, 148 / 9);
    const land = configForPreset(a5, vdg, true);
    expect(land.width).toBe(210);
    expect(land.height).toBe(148);
  });

  it('formato mantém a orientação da norma e tela não usa espelho', () => {
    const folder = configForPreset(FORMAT_PRESETS.find(f => f.id === 'folder_a4_roll')!, defaultConfig());
    expect(folder).toMatchObject({ width: 297, height: 210, fold: 'roll', facing: false });
    const book = applyMethod('vandegraaf', defaultConfig());
    expect(book.facing).toBe(true);
    const ig = configForPreset(FORMAT_PRESETS.find(f => f.id === 'ig_retrato')!, book);
    expect(ig.facing).toBe(false);
    expect(ig.bleed).toBe(0);
  });
});
