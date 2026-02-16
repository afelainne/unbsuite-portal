

# Mascaramento Final + Cor Default F0FF00 + Nova Aba Palette Magic

## Parte 1: Mascaramento Remanescente

### Problemas encontrados

A auditoria anterior corrigiu muito, mas ainda restam vazamentos:

| Arquivo | Problema |
|---|---|
| `translations.ts` | **Chaves TypeScript** ainda usam nomes `pantoneBridgeC`, `pantoneBridgeU`, `pantoneC`, `pantoneU`, `usePantone`, `nearbyPantones`, `pantoneGuide`, `pantoneSpotColors`, `pantoneSpotDesc` na interface `Translations` e em todas as 3 linguas (linhas 29-32, 62, 86, 126, 282-283) |
| `App.tsx` | Usa `t.pantoneBridgeC`, `t.pantoneBridgeU`, `t.pantoneC`, `t.pantoneU` em 8+ lugares (linhas 268, 276, 284, 292, 648-651, 886, 892, 898, 904) |
| `PaletteBuilder.tsx` | Usa `t.usePantone` (linha 195) |
| `ColorGuide.tsx` | Usa `t.pantoneSpotColors`, `t.pantoneSpotDesc` (linha 893) |
| `App.tsx` linhas 951 | Usa `t.nearbyPantones` |
| `colors.json` | Arquivo JSON com 8550 cores totalmente em texto claro com "PANTONE" em cada entrada -- nao e importado diretamente mas esta no bundle |

### Solucao

1. **`translations.ts`**: Renomear todas as chaves da interface e valores:
   - `pantoneBridgeC` -> `refBridgeC`
   - `pantoneBridgeU` -> `refBridgeU`
   - `pantoneC` -> `refSolidC`
   - `pantoneU` -> `refSolidU`
   - `usePantone` -> `useRefMatch`
   - `nearbyPantones` -> `nearbyRefs`
   - `pantoneGuide` -> `refGuide`
   - `pantoneSpotColors` -> `spotRefColors`
   - `pantoneSpotDesc` -> `spotRefDesc`
   - Atualizar na interface `Translations` e nos 3 objetos de traducao (en, pt, es)

2. **`App.tsx`**: Atualizar todas as referencias `t.pantone*` para usar as novas chaves `t.ref*`

3. **`PaletteBuilder.tsx`**: Trocar `t.usePantone` por `t.useRefMatch`

4. **`ColorGuide.tsx`**: Trocar `t.pantoneSpotColors` e `t.pantoneSpotDesc` por `t.spotRefColors` e `t.spotRefDesc`

5. **`colors.json`**: Deletar este arquivo. Ele NAO e importado por nenhum codigo (confirmado via busca), mas fica no repositorio com todas as referencias em texto claro.

## Parte 2: Cor Default F7E043 -> F0FF00

Trocar todas as ocorrencias de `#F7E043` para `#F0FF00`:

| Arquivo | Linhas |
|---|---|
| `App.tsx` | 57, 73-78 (6 ocorrencias de estado inicial) |
| `GeneratedPalettes.tsx` | 48, 64, 66 |
| `ColorGuide.tsx` | 20 (fallback safeHex) |

## Parte 3: Nova Aba "Palette Magic"

### Conceito

Uma aba que gera paletas inteligentes validadas por contraste e tendencias de design, usando as cores do usuario (via SVG upload ou hex manual) como base. O sistema sugere combinacoes perfeitas para marcas, identidades visuais, cartazes e layouts.

### Funcionalidades

1. **Paletas por Harmonia Validada**: Gera paletas complementares, analogas, triadicas, split-complementary a partir da cor base, mas **valida cada par pelo contraste WCAG** (ratio 4.5:1 para texto, 3:1 para graficos) e descarta combinacoes com contraste ruim
2. **Paletas em Tendencia**: Presets curados de paletas populares em design (Monocromatica Minimal, Earthy Tones, Neon & Dark, Pastel Dream, Corporate Trust, Sunset Gradient, etc.)
3. **Paletas do Usuario**: Usa as cores uploadadas via SVG ou adicionadas manualmente como base e sugere expansoes e complementos validados
4. **Sugestoes por Contexto**: O usuario escolhe o contexto (Brand Identity, Poster, UI/Layout, Editorial, Packaging) e as paletas sao filtradas/priorizadas conforme o caso de uso
5. **Score de Qualidade**: Cada paleta recebe um score baseado em contraste, harmonia e diversidade tonal

### Arquitetura tecnica

Criar um novo componente `PaletteMagic.tsx` em `src/tools/unbscolor/components/`:

- Recebe `initialHex`, `batchColors` (cores do SVG), `onHexChange`
- Usa funcoes existentes de `colorMath.ts`: `generateHarmonies`, `hexToRgb`, `rgbToHsl`, `hslToRgb`, `getContrastColor`, `getClosestColorName`, `findReferenceMatches`
- Implementa logica de contraste WCAG interna (calculo de luminance relativa e contrast ratio)
- Gera paletas de 3-6 cores cada, filtradas por contraste minimo
- Presets de tendencias hardcoded como arrays de hex
- Contextos como enum/type para filtrar sugestoes

Adicionar ao `App.tsx`:
- Nova opcao no `activeTab`: `'magic'`
- Import do componente
- Botao na nav
- Renderizacao condicional na main

Adicionar traducoes para:
- `paletteMagic` (nome da aba)
- `contextBrand`, `contextPoster`, `contextUI`, `contextEditorial`, `contextPackaging`
- `contrastScore`, `harmonyScore`, `paletteScore`
- `trendPalettes`, `userPalettes`, `expandPalette`
- `generateMagic`, `applyPalette`

### Fluxo do usuario

1. Entra na aba "Palette Magic"
2. Ve suas cores atuais (do SVG ou hex) no topo como "base palette"
3. Escolhe um contexto (Brand, Poster, UI, etc.)
4. O sistema gera 6-12 paletas sugeridas, cada uma com score de contraste
5. Pode expandir qualquer paleta para ver detalhes (contrast ratio entre pares, nomes das cores)
6. Pode copiar ou aplicar a paleta ao batch colors

### Logica de geracao de paletas

```text
Para cada cor base:
  1. Gerar harmonias (complementar, triadic, split, analogous)
  2. Para cada harmonia, gerar variacoes de luminosidade (claro/escuro)
  3. Validar contraste WCAG entre todos os pares
  4. Calcular score = (contrast_score * 0.4) + (harmony_score * 0.3) + (diversity_score * 0.3)
  5. Filtrar paletas com score < 0.5
  6. Ordenar por score descendente
  7. Para paletas de tendencia, aplicar mesma validacao de contraste
```

---

## Resumo de Arquivos

| Arquivo | Acao |
|---|---|
| `src/tools/unbscolor/i18n/translations.ts` | Renomear 9 chaves pantone* na interface + 3 objetos |
| `src/tools/unbscolor/App.tsx` | Atualizar refs t.pantone*, trocar F7E043->F0FF00, add tab magic |
| `src/tools/unbscolor/components/PaletteBuilder.tsx` | Trocar t.usePantone -> t.useRefMatch |
| `src/tools/unbscolor/components/ColorGuide.tsx` | Trocar t.pantone* + F7E043->F0FF00 |
| `src/tools/unbscolor/components/GeneratedPalettes.tsx` | Trocar F7E043->F0FF00 |
| `src/tools/unbscolor/components/PaletteMagic.tsx` | **NOVO** - componente da aba Palette Magic |
| `src/tools/unbscolor/colors.json` | **DELETAR** - arquivo com dados em texto claro nao utilizado |

