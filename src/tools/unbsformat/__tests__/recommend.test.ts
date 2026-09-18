import { describe, expect, it } from 'vitest';
import { configForPreset, customPreset, defaultConfig } from '../lib/config';
import { FORMAT_PRESETS } from '../lib/formats';
import { columnCountOf } from '../lib/grid';
import { applyMethod, METHODS } from '../lib/methods';
import { followsRecommendation, recommendFor, recommendForConfig } from '../lib/recommend';

const preset = (id: string) => FORMAT_PRESETS.find(f => f.id === id)!;

/** O que a ferramenta faz ao trocar de formato. */
const switchTo = (id: string) => {
  const p = preset(id);
  const r = recommendFor(p);
  return { r, c: applyMethod(r.method, configForPreset(p, defaultConfig()), { columns: r.columns, rows: r.rows }) };
};

describe('grade recomendada por formato', () => {
  it('todo formato tem uma recomendação com um método que existe', () => {
    const ids = new Set(METHODS.map(m => m.id));
    for (const f of FORMAT_PRESETS) {
      const r = recommendFor(f);
      expect(ids.has(r.method), f.id).toBe(true);
      expect(r.reason.length, f.id).toBeGreaterThan(10);
    }
  });

  it('livro recebe o cânone, revista e documento a grade modular', () => {
    expect(recommendFor(preset('livro_14x21')).method).toBe('vandegraaf');
    expect(recommendFor(preset('revista_205x275'))).toMatchObject({ method: 'mullerbrockmann', columns: 6, rows: 8 });
    expect(recommendFor(preset('a4'))).toMatchObject({ method: 'mullerbrockmann', columns: 4, rows: 5 });
  });

  it('folheto com dobra fica com uma coluna por painel', () => {
    expect(recommendFor(preset('folder_a4_roll'))).toMatchObject({ method: 'samara_colunas', columns: 1 });
  });

  it('tela larga recebe 12 colunas e celular o Material', () => {
    expect(recommendFor(preset('fhd')).method).toBe('digital12');
    expect(recommendFor(preset('mobile')).method).toBe('material');
    expect(recommendFor(preset('ig_retrato'))).toMatchObject({ method: 'samara_modular', columns: 3, rows: 3 });
  });

  it('trocar de formato troca o método para o recomendado, mesmo vindo de outro', () => {
    const book = switchTo('livro_14x21');
    expect(book.c.method).toBe('vandegraaf');
    // Do livro para a revista: o cânone não fica preso.
    const r = recommendFor(preset('revista_205x275'));
    const mag = applyMethod(r.method, configForPreset(preset('revista_205x275'), book.c), { columns: r.columns, rows: r.rows });
    expect(mag.method).toBe('mullerbrockmann');
    expect(columnCountOf(mag)).toBe(6);
    expect(mag.rows).toBe(8);
    expect(followsRecommendation(mag, recommendForConfig(mag), columnCountOf(mag))).toBe(true);
  });

  it('trocar o método à mão deixa de seguir a recomendação', () => {
    const { c } = switchTo('a4');
    const manual = applyMethod('villard', c);
    expect(followsRecommendation(manual, recommendForConfig(manual), columnCountOf(manual))).toBe(false);
  });

  it('formato personalizado recomenda pela unidade e pelo tamanho', () => {
    expect(recommendFor(customPreset(1920, 1080, 'px')).method).toBe('digital12');
    expect(recommendFor(customPreset(400, 800, 'px')).method).toBe('material');
    expect(recommendFor(customPreset(500, 700, 'mm')).method).toBe('mullerbrockmann');
  });
});
