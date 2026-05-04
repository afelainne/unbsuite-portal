# UNBSGRID — Integração com o Hub

Ferramenta de análise geométrica de logos em SVG. Sobreponha mais de 45 guias geométricas
sobre um SVG carregado para verificar construção, proporção, simetria, curvas e diretrizes
de marca.

## Como clonar e integrar

1. Clone o repositório UNBSGRID
2. Copie o conteúdo de `src/` para `src/tools/unbsgrid/`
3. Renomeie o entry point principal para `index.tsx` (deve exportar default o componente raiz)
4. Ajuste imports relativos (ex: `./components/X` → `./components/X`)
5. Remova duplicatas do hub: **não** inclua `BrowserRouter`, `QueryClientProvider`, ou cliente Supabase
6. Use `import { supabase } from "@/tools/shared"` para acessar o banco de dados do hub
7. Se o app tiver rotas internas, use `useNavigate` e paths relativos — o hub já monta em `/unbsgrid/*`

## Estrutura esperada

```
src/tools/unbsgrid/
  index.tsx              ← componente raiz (export default)
  components/            ← UI + renderers (Paper.js)
    renderers/
      basic.ts           ← bounding rects, círculos, centro, diagonais, tangentes, anchoring
      proportions.ts     ← golden ratio, espiral áurea, terços, tipografia, regra dos ímpares
      measurement.ts     ← simetria, ângulos, espaçamento, alinhamento, baseline, ratios, harmônicas
      harmony.ts         ← retângulos raiz, escala modular, safe zone, Fibonacci, vesica piscis
      grid.ts            ← grid isométrico, pixel grid, contraste, Ken Burns, centro óptico, peso visual
      advanced.ts        ← bezier, fluxo, curvatura, esqueleto, construção, direção, intersecção, âncoras
      sacred.ts          ← flor da vida, triângulo de Reuleaux, malha hexagonal
      construction.ts    ← grid triangular 60°, polar/radial, quadrados concêntricos
  hooks/                 ← hooks do app
  lib/
    svg-engine.ts        ← parsing, geometria de paths, Bezier
    preset-engine.ts     ← 24 presets built-in + CRUD localStorage
  pages/
    Index.tsx            ← layout principal (sidebar + canvas)
  types/
    geometry.ts          ← interface GeometryOptions (45 toggles)
```

## Geometrias disponíveis (45)

Organizadas em **8 grupos** no sidebar:

| Grupo | Geometrias |
|---|---|
| Advanced | parallelFlowLines, underlyingCircles, dominantDiagonals, curvatureComb, skeletonCenterline, constructionGrid, pathDirectionArrows, tangentIntersections, anchorPoints, bezierHandles, opticalCenter, visualWeightMap |
| Basic | boundingRects, circles, centerLines, diagonals, tangentLines, anchoringPoints |
| Proportions | goldenRatio, goldenSpiral, thirdLines, typographicProportions, ruleOfOdds |
| Measurement | symmetryAxes, angleMeasurements, spacingGuides, alignmentGuides, dynamicBaseline, componentRatioLabels, harmonicDivisions |
| Harmony | modularScale, safeZone, fibonacciOverlay |
| **Sacred Geometry** *(novo)* | flowerOfLife, reuleauxTriangle, hexGrid, vesicaPiscis |
| **Geometric Construction** *(novo)* | triangularGrid, polarGrid, concentricSquares, rootRectangles |
| Grid & Output | isometricGrid, pixelGrid, contrastGuide, kenBurnsSafe |

## Presets built-in

| ID | Nome |
|---|---|
| builtin-quick-check | Verificação Rápida |
| builtin-golden | Proporção Áurea |
| builtin-structural | Anatomia Estrutural |
| builtin-balance | Equilíbrio & Simetria |
| builtin-grid-spacing | Grid & Espaçamento |
| builtin-typography | Tipografia & Baseline |
| builtin-brand-guidelines | Manual de Marca |
| builtin-mathematical | Geometria Avançada |
| builtin-presentation | Apresentação |
| builtin-flow | Fluxo Dinâmico |
| builtin-circles | Círculos Construtivos |
| builtin-minimal | Minimalista |
| builtin-contrast-weight | Contraste & Peso |
| builtin-diagonal | Diagonal & Perspectiva |
| builtin-skeleton | Skeleton & Curvas |
| builtin-full-audit | Auditoria Completa |
| **builtin-wordmark** | Wordmark & Logotipo |
| **builtin-monogram** | Monograma |
| **builtin-favicon** | Favicon / App Icon |
| **builtin-responsive** | Responsivo Multi-escala |
| **builtin-accessibility** | Auditoria de Acessibilidade |
| **builtin-sacred-geometry** | Geometria Sagrada |
| **builtin-brutalist** | Brutalist Grid |
| **builtin-modular-type** | Modular Type System |

Presets do usuário são persistidos em `localStorage` sob a chave `unbsgrid-presets`.
