import { describe, expect, it } from 'vitest';
import type { Glyph, KerningState } from '../lib/types';
import { autoSpace, spacingReference } from '../lib/spacing';
import { autoKern, buildClasses, flattenKerning, pairKern } from '../lib/kerning';
import { DEFAULT_METRICS } from '../lib/project';
import { letter } from './fixtures';

const m = { ...DEFAULT_METRICS, capHeight: 700, xHeight: 500 };
const base = (): Record<string, Glyph> => Object.fromEntries(['H', 'O', 'A', 'V', 'T', 'n', 'o', 'x'].map(c => [c, letter(c)]));

describe('espaçamento automático', () => {
  const spaced = autoSpace(base(), m, { factor: 1, tracking: 0 });

  it('curvas ficam com margem menor que retas (HHOHOO, nnonoo)', () => {
    expect(spaced.O.lsb).toBeLessThan(spaced.H.lsb);
    expect(spaced.O.rsb).toBeLessThan(spaced.H.rsb);
    expect(spaced.o.lsb).toBeLessThan(spaced.n.lsb);
    expect(spaced.O.lsb).toBeGreaterThan(0);
  });

  it('diagonais e formas abertas ficam com menos margem ainda', () => {
    expect(spaced.A.lsb).toBeLessThan(spaced.O.lsb);
    expect(spaced.V.lsb).toBeLessThan(spaced.O.lsb);
    expect(spaced.T.lsb).toBeLessThan(spaced.H.lsb);
  });

  it('é simétrico em letras simétricas e a referência sai da contraforma do H', () => {
    expect(spaced.H.lsb).toBe(spaced.H.rsb);
    expect(spaced.O.lsb).toBe(spaced.O.rsb);
    const ref = spacingReference(base(), m, { factor: 1, tracking: 0 });
    expect(ref.refUpper).toBe('H');
    expect(spaced.H.lsb).toBe(Math.round(ref.straightUpper));
  });

  it('fator e tracking mexem em tudo, travados ficam como estão', () => {
    const glyphs = base();
    glyphs.O = { ...glyphs.O, lsb: 3, rsb: 4, locked: true };
    const loose = autoSpace(glyphs, m, { factor: 1.5, tracking: 20 });
    expect(loose.H.lsb).toBeGreaterThan(spaced.H.lsb + 10);
    expect(loose.O.lsb).toBe(3);
    expect(loose.O.rsb).toBe(4);
  });
});

describe('kerning automático', () => {
  const spaced = autoSpace(base(), m, { factor: 1, tracking: 0 });

  it('aproxima diagonais que se encaixam (AV) e o que cabe sob a barra (To)', () => {
    expect(pairKern(spaced.A, spaced.V, spaced, m)).toBeLessThan(-15);
    expect(pairKern(spaced.V, spaced.A, spaced, m)).toBeLessThan(-15);
    expect(pairKern(spaced.T, spaced.o, spaced, m)).toBeLessThan(-30);
  });

  it('não mexe em pares de retas nem em pares com a referência', () => {
    expect(Math.abs(pairKern(spaced.H, spaced.H, spaced, m))).toBeLessThan(1);
    expect(Math.abs(pairKern(spaced.H, spaced.O, spaced, m))).toBeLessThan(1);
    expect(Math.abs(pairKern(spaced.n, spaced.o, spaced, m))).toBeLessThan(1);
    expect(Math.abs(pairKern(spaced.O, spaced.O, spaced, m))).toBeLessThan(8);
  });

  it('gera a tabela com limiar, força e só pares comuns', () => {
    const full = autoKern(spaced, m, { strength: 1, scope: 'common', useClasses: true }).pairs;
    expect(full['A|V']).toBeLessThan(0);
    expect(full['T|o']).toBeLessThan(0);
    expect(full['H|H']).toBeUndefined();
    // "oT" (minúscula antes de maiúscula) não é par comum.
    expect(full['o|T']).toBeUndefined();
    const half = autoKern(spaced, m, { strength: 0.5, scope: 'common', useClasses: true }).pairs;
    expect(Math.abs(half['A|V'] - full['A|V'] / 2)).toBeLessThanOrEqual(1);
    const none = autoKern(spaced, m, { strength: 0, scope: 'all', useClasses: true }).pairs;
    expect(Object.keys(none).length).toBe(0);
  });
});

describe('classes de kerning', () => {
  it('junta acentuados à letra-base e confirma candidatos pelo desenho', () => {
    const glyphs = base();
    glyphs['Á'] = { ...glyphs.A, char: 'Á' };
    // "C": o O sem o lado direito tem o mesmo lado esquerdo do O.
    glyphs.C = { ...glyphs.O, char: 'C' };
    glyphs.D = { ...glyphs.H, char: 'D' };
    const spaced = autoSpace(glyphs, m, { factor: 1, tracking: 0 });
    const cls = buildClasses(spaced, m, true);
    expect(cls.left['Á']).toBe('A');
    expect(cls.right['Á']).toBe('A');
    expect(cls.left.C).toBe('O');
    expect(cls.left.D).toBe('H');
    // T não tem o lado de um H: fica sozinho.
    expect(cls.left.T).toBe('T');
    const off = buildClasses(spaced, m, false);
    expect(off.left['Á']).toBe('Á');
  });

  it('ajuste manual vence o automático e vale para a classe inteira', () => {
    const glyphs = base();
    glyphs['Á'] = { ...glyphs.A, char: 'Á' };
    const state: KerningState = { auto: { 'A|V': -40 }, manual: { 'A|V': -55 }, settings: { strength: 1, scope: 'common', useClasses: true } };
    const flat = flattenKerning(state, glyphs, m);
    expect(flat.get('A|V')).toBe(-55);
    expect(flat.get('Á|V')).toBe(-55);
  });
});
