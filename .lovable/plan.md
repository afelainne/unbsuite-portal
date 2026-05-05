## Goals

1. **Melhorar o match HEX → Pantone** (ΔE2000 já existe, mas pode ser refinado).
2. **Incluir as "Nearby Alternatives" no download** quando "Search Reference" estiver ativo no slot.
3. **Adicionar novos templates de card** para visualização e download (não só o atual).

---

## 1. Melhor matching HEX → Pantone (`utils/colorMath.ts`)

O algoritmo atual usa CIEDE2000 puro. Refinamentos:

- **Perceptual weighting híbrido**: combinar CIEDE2000 (peso 0.85) com penalidade extra de **diferença de matiz** (`ΔH`) para evitar matches que tenham ΔE baixo mas hue visivelmente errado (problema comum com cinzas neutros e tons saturados).
- **Penalidade de chroma assimétrica**: quando a cor alvo tem alta saturação, penalizar mais matches dessaturados do que o contrário (gente percebe perda de "vivacidade" mais que ganho).
- **Filtro de luminance gating**: descartar candidatos com `|ΔL*| > 15` antes do ranking, para o top-1 nunca pular faixas tonais.
- **Chave de cache**: pre-calcular Lab + Hue de cada referência uma vez (já parcialmente feito em `enrichLibraryWithLab`); estender para incluir hue/chroma.
- Novo `findReferenceMatchesAdvanced(targetHex, library, count)` retornando ColorMatch + `score` composto. `findReferenceMatches` passa a delegar para a versão avançada (mantendo API).
- Adicionar **rerank top-N**: pegar os 10 melhores por ΔE2000, depois rerank pelo score composto e devolver `count`.

Ranking labels também ajustados: `Exact < 1`, `Very Close < 2.3`, `Close < 4.5`, `Similar` resto (mais condizente com percepção humana real).

## 2. Incluir Nearby Alternatives no download quando ativo

Estado atual: `BatchAnalyzer` mantém localmente `showAlternatives: Set<number>` e `App.tsx` não sabe quais slots estão expandidos. Solução:

- Mover `showAlternatives` para `App.tsx` (lift state up) e passar como prop + setter para `BatchAnalyzer`.
- Em `buildCardExportData(color, index)`, receber também `includeAlternatives: boolean`. Quando true, incluir os 6 nearby (`strip` já existe) + um bloco extra com **swatch grande, nome, código e ΔE** para cada um.
- `generateCardSvg(payload)` ganha branch para renderizar a seção "NEARBY ALTERNATIVES" expandida (grid 3×2 de 6 cards) com altura do SVG ajustada dinamicamente.
- `handleDownloadCard` e `handleDownloadCards` usam `showAlternatives.has(index)` para decidir se incluem.

## 3. Novos templates de card

Adicionar seletor de **Card Template** no header do Multi-Slot Match Analysis (ao lado de "Copy All Slots Data"):

```text
Template: [ Classic ▼ ]   [ Copy All ]   [ ↓ SVG ALL ]   [ ↓ PNG ALL ]
```

Estado `cardTemplate` em `App.tsx`: `'classic' | 'compact' | 'editorial' | 'swatchcard' | 'minimal' | 'mono'`.

### Templates novos (em `generateCardSvg`, switch por `payload.template`):

1. **Classic** (atual) — mantido como default.
2. **Compact** — header reduzido (60px), stats em 2 colunas, matches em linha única, ideal para impressão em grade.
3. **Editorial** — header full-bleed (sem padding), tipografia grande com nome em serif-like, hex destacado, matches como tabela com bordas finas. Estilo revista.
4. **Swatch Card** — quadrado 1:1, swatch ocupando 60% superior, dados embaixo em mono pequeno; bom para grids tipo Pinterest/moodboard.
5. **Minimal** — só hex + nome + 4 swatches Pantone em linha, sem stats. Para downloads em massa.
6. **Mono** — fundo preto, texto branco, swatches com borda. Versão "dark mode" do Classic.

Cada template é uma função pura `renderCardTemplateX(payload, options)` retornando `{ svg, width, height }`.

`BatchAnalyzer` também usa o mesmo `cardTemplate` para o **preview na tela** — cada card é renderizado via `dangerouslySetInnerHTML` com o SVG da mesma função usada no download. Garante WYSIWYG.

## Arquivos tocados

- `src/tools/unbscolor/utils/colorMath.ts` — novo matching híbrido + helpers de hue/chroma.
- `src/tools/unbscolor/App.tsx` — lift `showAlternatives`, novo state `cardTemplate`, refator `generateCardSvg` em renderers por template, dropdown de template, propagar para `BatchAnalyzer`.
- `src/tools/unbscolor/components/BatchAnalyzer.tsx` — receber `cardTemplate`, `showAlternatives`, `setShowAlternatives` via props; renderizar preview via SVG do template selecionado.
- `src/tools/unbscolor/i18n/translations.ts` — chaves: `cardTemplateLabel`, `cardTemplateClassic`, `cardTemplateCompact`, `cardTemplateEditorial`, `cardTemplateSwatch`, `cardTemplateMinimal`, `cardTemplateMono` (en/pt/es).

## Out of scope

- Sem mudanças em DB/auth.
- Não alteramos a lógica de obfuscação Pantone.
- Não tocamos nos templates do Color Sheet (seção 1) nem do Albers (seção 2).
