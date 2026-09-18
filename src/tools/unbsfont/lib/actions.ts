import type { FontStyle, Glyph, Metrics, Project } from './types';
import { autoSpace } from './spacing';
import { autoKern } from './kerning';
import { caseSettings, resolveDerived } from './derive';
import type { SheetGuides } from './sheet';

/**
 * Operações do projeto como funções puras: a interface só chama estas e guarda
 * o resultado. Espaço e kerning automáticos andam juntos: quando o desenho ou
 * as margens mudam, o kerning automático é refeito (o manual fica).
 */

export function respace(style: FontStyle, m: Metrics): FontStyle {
  // Primeiro as margens do que foi desenhado; os derivados (unicase, compostos) herdam da origem.
  const next = resolveDerived({ ...style, glyphs: autoSpace(style.glyphs, m, style.spacing) }, m);
  return Object.keys(style.kerning.auto).length ? rekern(next, m) : next;
}

export function rekern(style: FontStyle, m: Metrics): FontStyle {
  const { pairs } = autoKern(style.glyphs, m, style.kerning.settings);
  return { ...style, kerning: { ...style.kerning, auto: pairs } };
}

export const hasGlyphs = (p: Project) => p.styles.some(s => Object.values(s.glyphs).some(g => g.outline.length));

/** Métricas lidas da folha, na escala em que a altura das maiúsculas vira `capHeight`. */
export function metricsFromGuides(m: Metrics, guides: SheetGuides, srcCap: number): Metrics {
  const s = m.capHeight / srcCap;
  const next = { ...m };
  if (guides.x) next.xHeight = Math.round(guides.x * s);
  if (guides.desc) next.descender = -Math.round(guides.desc * s);
  // Ascendente cobre as hastes e, se sobrar, completa o eme com o descendente (asc + |desc| = UPM).
  const top = Math.round(Math.max(guides.asc ?? 0, srcCap) * s);
  next.ascender = Math.max(top, m.unitsPerEm + next.descender);
  return next;
}

/**
 * Traz glifos novos para um estilo (da folha ou colados), com espaço e
 * kerning automáticos. Na primeira importação do projeto as guias da folha
 * viram as métricas da família.
 */
export function addGlyphs(project: Project, styleId: string, glyphs: Glyph[], srcCap: number, guides?: SheetGuides): Project {
  const metrics = guides && !hasGlyphs(project) ? metricsFromGuides(project.metrics, guides, srcCap) : project.metrics;
  return {
    ...project,
    metrics,
    styles: project.styles.map(s => {
      if (s.id !== styleId) return s;
      const merged = { ...s.glyphs };
      for (const g of glyphs) merged[g.char] = g;
      // Desenhar um caractere cuja derivação foi desfeita encerra o caso.
      const cases = s.cases ? { ...s.cases, detached: caseSettings(s).detached.filter(c => !glyphs.some(g => g.char === c)) } : undefined;
      const withGlyphs = { ...s, glyphs: merged, srcCap, ...(cases ? { cases } : {}) };
      return rekern(respace(withGlyphs, metrics), metrics);
    }),
  };
}

/** Métricas novas: o desenho acompanha a altura das maiúsculas, então as margens são refeitas. */
export function setMetrics(project: Project, metrics: Metrics): Project {
  const reshaped = metrics.capHeight !== project.metrics.capHeight || metrics.xHeight !== project.metrics.xHeight;
  return {
    ...project,
    metrics,
    styles: reshaped ? project.styles.map(s => respace(s, metrics)) : project.styles,
  };
}

export function setGlyph(style: FontStyle, glyph: Glyph): FontStyle {
  return { ...style, glyphs: { ...style.glyphs, [glyph.char]: glyph } };
}

/** Glifo alterado à mão: margens travadas não disparam o espaçamento, mas os derivados acompanham. */
export function updateGlyph(style: FontStyle, glyph: Glyph, m: Metrics): FontStyle {
  const next = setGlyph(style, glyph);
  return glyph.locked ? resolveDerived(next, m) : respace(next, m);
}

export function removeGlyph(style: FontStyle, char: string): FontStyle {
  const glyphs = { ...style.glyphs };
  delete glyphs[char];
  return { ...style, glyphs };
}
