/**
 * Sample logos — a small gallery so the tool is never an empty room.
 *
 * All marks are abstract shapes drawn here by hand: nothing is traced from,
 * or meant to resemble, a real brand. Each one is short on purpose and stresses
 * a different part of the geometry engine (diagonals, curvature, counterform,
 * asymmetry, radius continuity, thin strokes).
 *
 * Every sample must survive `sanitizeSVG` + `parseSVG` without a single
 * warning — `__tests__/samples.test.ts` enforces that.
 */

import { validateSvgInput, type SvgInputOutcome } from './svg-input';
import { activeT } from '../i18n/runtime';

export interface SampleLogo {
  id: string;
  /** Short name shown in the gallery. */
  name: string;
  /** One line saying what this mark is good for demonstrating. */
  demonstrates: string;
  /** Inline SVG markup (sanitized again before use). */
  svg: string;
}

const INK = '#1d1d1f';

const wrap = (viewBox: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;

export const SAMPLE_LOGOS: SampleLogo[] = [
  {
    id: 'chevron-duplo',
    name: 'Chevron duplo',
    demonstrates: 'Símbolo geométrico puro: diagonais paralelas e ângulos repetidos.',
    svg: wrap(
      '0 0 120 120',
      `<path d="M60 12 L104 52 L92 64 L60 36 L28 64 L16 52 Z" fill="${INK}"/>` +
        `<path d="M60 56 L104 96 L92 108 L60 80 L28 108 L16 96 Z" fill="${INK}"/>`,
    ),
  },
  {
    id: 'wordmark-hastes',
    name: 'Wordmark de hastes',
    demonstrates: 'Marca horizontal: linha de base, altura-x e ritmo entre sinais.',
    svg: wrap(
      '0 0 196 56',
      `<g fill="none" stroke="${INK}" stroke-width="8">` +
        `<path d="M14 12 V44 H34"/>` +
        `<circle cx="62" cy="28" r="16"/>` +
        `<path d="M92 12 V44"/>` +
        `<path d="M110 44 V12 L134 44 V12"/>` +
        `<path d="M152 12 V44 M152 28 H176 M176 12 V44"/>` +
        `</g>`,
    ),
  },
  {
    id: 'monograma-cruzado',
    name: 'Monograma cruzado',
    demonstrates: 'Duas letras sobrepostas: cruzamentos, tangentes e nós de traço.',
    svg: wrap(
      '0 0 100 100',
      `<g fill="none" stroke="${INK}" stroke-width="9" stroke-linejoin="miter">` +
        `<path d="M18 80 L46 20 L74 80"/>` +
        `<path d="M30 60 H62"/>` +
        `<path d="M76 20 V80"/>` +
        `</g>`,
    ),
  },
  {
    id: 'orbita-fina',
    name: 'Órbita fina',
    demonstrates: 'Traço muito fino: mínimo de reprodução e limites de contraste.',
    svg: wrap(
      '0 0 100 100',
      `<g fill="none" stroke="${INK}" stroke-width="1.5">` +
        `<circle cx="50" cy="50" r="34"/>` +
        `<ellipse cx="50" cy="50" rx="34" ry="13" transform="rotate(-24 50 50)"/>` +
        `</g>` +
        `<circle cx="50" cy="16" r="4.5" fill="${INK}"/>`,
    ),
  },
  {
    id: 'petala-organica',
    name: 'Pétala orgânica',
    demonstrates: 'Curvas livres: pente de curvatura, alças de bezier e tangentes.',
    svg: wrap(
      '0 0 100 100',
      `<path d="M50 10 C80 30 86 64 50 92 C14 64 20 30 50 10 Z" fill="${INK}"/>`,
    ),
  },
  {
    id: 'estilhaco-assimetrico',
    name: 'Estilhaço assimétrico',
    demonstrates: 'Sem eixo de simetria: centro óptico longe do centro geométrico.',
    svg: wrap(
      '0 0 100 100',
      `<path d="M16 76 L32 18 L84 28 L64 56 L90 84 Z" fill="${INK}"/>`,
    ),
  },
  {
    id: 'blocos-arredondados',
    name: 'Blocos arredondados',
    demonstrates: 'Raios diferentes lado a lado: continuidade de canto e alinhamento.',
    svg: wrap(
      '0 0 100 100',
      `<rect x="12" y="12" width="46" height="46" rx="14" fill="${INK}"/>` +
        `<rect x="46" y="46" width="42" height="42" rx="21" fill="${INK}"/>` +
        `<rect x="12" y="68" width="20" height="20" rx="7" fill="${INK}"/>`,
    ),
  },
  {
    id: 'anel-com-corte',
    name: 'Anel com corte',
    demonstrates: 'Contraforma pequena dentro de massa cheia: fecho e peso visual.',
    svg: wrap(
      '0 0 100 100',
      `<path fill-rule="evenodd" fill="${INK}" d="M8 50 A42 42 0 1 0 92 50 A42 42 0 1 0 8 50 Z` +
        ` M34 50 A16 16 0 1 0 66 50 A16 16 0 1 0 34 50 Z` +
        ` M45 4 H55 V22 H45 Z"/>`,
    ),
  },
  {
    id: 'matriz-modular',
    name: 'Matriz modular',
    demonstrates: 'Malha modular: espaçamento regular e um módulo dominante.',
    svg: wrap(
      '0 0 100 100',
      `<g fill="${INK}">` +
        `<circle cx="26" cy="26" r="6"/><circle cx="50" cy="26" r="6"/><circle cx="74" cy="26" r="6"/>` +
        `<circle cx="26" cy="50" r="6"/><circle cx="50" cy="50" r="15"/><circle cx="74" cy="50" r="6"/>` +
        `<circle cx="26" cy="74" r="6"/><circle cx="50" cy="74" r="6"/><circle cx="74" cy="74" r="6"/>` +
        `</g>`,
    ),
  },
  {
    id: 'cunhas-inclinadas',
    name: 'Cunhas inclinadas',
    demonstrates: 'Duas barras na mesma inclinação: fluxo diagonal e espaço entre massas.',
    svg: wrap(
      '0 0 100 100',
      `<path d="M10 86 H28 L62 14 H44 Z" fill="${INK}"/>` +
        `<path d="M46 86 H64 L96 14 H78 Z" fill="${INK}"/>`,
    ),
  },
];

/**
 * Name and description are shown in the active language. The literals above
 * stay as the fallback for an id the dictionary does not know; the getters
 * read the `samples` namespace ("chevron-duplo" -> "chevronDuploName").
 */
const dictionaryKey = (id: string) => id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

for (const sample of SAMPLE_LOGOS) {
  const key = dictionaryKey(sample.id);
  const name = sample.name;
  const demonstrates = sample.demonstrates;
  Object.defineProperty(sample, 'name', {
    enumerable: true,
    get: () => (activeT().samples as Record<string, string>)[`${key}Name`] ?? name,
  });
  Object.defineProperty(sample, 'demonstrates', {
    enumerable: true,
    get: () => (activeT().samples as Record<string, string>)[`${key}Hint`] ?? demonstrates,
  });
}

/** Look up a sample by id. */
export function getSampleById(id: string): SampleLogo | null {
  return SAMPLE_LOGOS.find(s => s.id === id) ?? null;
}

/**
 * Turn a sample into a validated, sanitized input result — same door every
 * other source goes through.
 */
export function loadSample(id: string): SvgInputOutcome {
  const sample = getSampleById(id);
  if (!sample) {
    return {
      ok: false,
      code: 'not-svg',
      title: 'Exemplo não encontrado',
      description: `Não existe um exemplo com o identificador "${id}".`,
      source: 'sample',
      name: id,
    };
  }
  return validateSvgInput(sample.svg, { source: 'sample', name: sample.name });
}
