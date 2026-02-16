

# Auditoria e Reforco de Mascaramento da Biblioteca Pantone

## Resultado da Auditoria

Encontrei **vazamentos significativos** da palavra "Pantone" em multiplos arquivos. A biblioteca de cores esta codificada (XOR + base64 nos `.dat`), mas o codigo-fonte em si menciona "Pantone" abertamente em varios lugares, o que permite que qualquer pessoa inspecionando o frontend (DevTools, source maps) descubra que a biblioteca e Pantone.

### Vazamentos Encontrados

| Arquivo | Problema |
|---|---|
| `constants.ts` linhas 192-244 | `extractCode` menciona `PANTONE` literalmente; `SOURCE_MAP` tem chaves como `"PANTONE Color Bridge Coated-V4.acb"` e valores com `"Pantone Color Bridge V4"`, `"Pantone Solid V4"` |
| `constants.ts` linhas 203-206 | `SYSTEM_ALIAS` usa `pantone_color_bridge_v4`, `pantone_solid_v4` como chaves |
| `data/colorAnalysis.ts` linhas 14-15 | Variavel `pantoneAnalysis` com comentarios mencionando "Pantone" |
| `data/colorAnalysis.ts` linhas 2359-2368 | Funcao `extractPantoneCode` com referencia explicita |
| `i18n/translations.ts` | Chaves `pantoneBridgeC/U`, `pantoneC/U`, `pantoneGuide`, `pantoneSpotColors` -- EN e PT ja mascararam para "System A/B" e "Reference", mas **ES (espanhol) ainda diz "Pantone Bridge C/U" e "Pantone C/U" literalmente** (linhas 1329-1332, 1362, 1386, 1347) |
| `App.tsx` linha 646 | Texto hardcoded `"SEARCH WEB PANTONE"` visivel na UI |
| `App.tsx` linha 127 | Funcao `normalizePantoneCode` |
| `App.tsx` linha 87 | Estado `showPantoneMatch` |
| `SimilarityGrid.tsx` linhas 67-71 | Comentario `"Pantone code revealed"` + texto visivel `"Pantone {code}"` na UI |
| `SimilarityGrid.tsx` linha 12 | Funcao `normalizePantoneCode` |
| `BatchAnalyzer.tsx` linha 185 | Texto visivel `"Buscar Pantone proximo na web"` |
| `SwatchStrip.tsx` linhas 7-12 | Props `showPantoneMatch`, `pantoneCode` |
| `types.ts` linha 57 | Campo `pantoneCode` em `HarmonyColor` |
| `services/analysisService.ts` linha 9 | Parametro `pantoneName` |
| `components/PantoneCard.tsx` | Nome do arquivo e componente |

### Buscas falsas (obfuscatedColorService.ts)
O servico de trafego fake ja existe e funciona bem -- dispara requests para httpbin/httpbingo com queries de ruido. Porem **nao e chamado de forma consistente** quando o usuario busca matches Pantone.

---

## Plano de Correcao

### 1. `constants.ts` -- Mascarar SOURCE_MAP e extractCode

**Linhas 192-244**: Substituir todas as referencias literais:
- `extractCode`: trocar `PANTONE` por padroes ofuscados sem a palavra
- `SOURCE_MAP`: trocar chaves `"PANTONE Color Bridge..."` por hashes/aliases curtos (ex: `"src_a_c"`, `"src_a_u"`, `"src_b_c"`, `"src_b_u"`)
- `SYSTEM_ALIAS`: trocar `pantone_color_bridge_v4` por `"src_a"` e `pantone_solid_v4` por `"src_b"`
- Valores `systemName` e `finishName` ja estao mascarados ("System A/B", "Finish C/U") -- manter

Para que o SOURCE_MAP funcione, os dados codificados no `.dat` precisam ter as mesmas chaves de `source`. Entao vamos criar um mapeamento intermediario que converte as chaves originais (que vem do `.dat`) para aliases internos sem a palavra Pantone.

### 2. `data/colorAnalysis.ts` -- Renomear variaveis

- Renomear `pantoneAnalysis` para `codeAnalysis`
- Renomear `extractPantoneCode` para `extractColorCode`
- Remover comentarios que mencionam "Pantone"

### 3. `i18n/translations.ts` -- Corrigir ES (espanhol)

Linhas 1329-1332, 1347, 1362, 1386: trocar de:
- `'Pantone Bridge C'` para `'Sistema A (C)'`
- `'Pantone Bridge U'` para `'Sistema A (U)'`
- `'Pantone C'` para `'Sistema B (C)'`
- `'Pantone U'` para `'Sistema B (U)'`
- `'Buscar Pantone'` para `'Buscar Referencia'`
- `'Pantones Cercanos'` para `'Referencias Cercanas'`
- `'Usar Match Pantone'` para `'Usar Match de Referencia'`

### 4. `App.tsx` -- Remover textos e nomes Pantone

- Linha 646: trocar `"SEARCH WEB PANTONE"` por `"SEARCH WEB REFERENCE"` (ou usar chave i18n)
- Renomear `normalizePantoneCode` para `normalizeRefCode`
- Renomear `showPantoneMatch` para `showRefMatch`
- Reforcar chamada a `triggerFakeColorTraffic` sempre que um match e exibido

### 5. `SimilarityGrid.tsx` -- Remover "Pantone" do texto visivel

- Linha 70: trocar `Pantone {code}` por apenas `{code}` (o codigo ja e auto-explicativo, ex: "185 C")
- Renomear `showPantoneMatch` para `showRefMatch`
- Renomear `normalizePantoneCode` para `normalizeRefCode`
- Remover comentario "Pantone code revealed"

### 6. `BatchAnalyzer.tsx` -- Texto visivel

- Linha 185: trocar `"Buscar Pantone proximo na web"` por uma chave i18n generica (ex: `t.searchNearbyRef` ou similar neutra como "Search nearby reference on web")

### 7. `SwatchStrip.tsx` -- Props

- Renomear `showPantoneMatch` para `showRefMatch`
- Renomear `pantoneCode` para `refCode`

### 8. `types.ts` -- Campo HarmonyColor

- Renomear `pantoneCode` para `refCode` em `HarmonyColor`

### 9. `services/analysisService.ts` -- Parametro

- Renomear `pantoneName` para `refName` (e atualizar chamadas em App.tsx)

### 10. `PantoneCard.tsx` -- Renomear arquivo

- Renomear para `RefCard.tsx` (ou deletar, ja que retorna null)
- Melhor: deletar o arquivo completamente ja que e deprecated

### 11. Reforcar buscas falsas

- Em `App.tsx`, garantir que `triggerFakeColorTraffic(hex)` e chamado sempre que matches sao exibidos (no `useEffect` que calcula matches)
- Adicionar delay aleatorio simulando "busca web" antes de mostrar resultados

---

## Resumo de Arquivos a Editar

| Arquivo | Acao |
|---|---|
| `src/tools/unbscolor/constants.ts` | Mascarar SOURCE_MAP, extractCode, SYSTEM_ALIAS |
| `src/tools/unbscolor/data/colorAnalysis.ts` | Renomear pantoneAnalysis, extractPantoneCode |
| `src/tools/unbscolor/i18n/translations.ts` | Corrigir ES; limpar comentarios |
| `src/tools/unbscolor/App.tsx` | Renomear vars, trocar textos, reforcar fake traffic |
| `src/tools/unbscolor/components/SimilarityGrid.tsx` | Remover "Pantone" do texto visivel e props |
| `src/tools/unbscolor/components/BatchAnalyzer.tsx` | Trocar texto "Buscar Pantone" |
| `src/tools/unbscolor/components/SwatchStrip.tsx` | Renomear props |
| `src/tools/unbscolor/types.ts` | Renomear pantoneCode para refCode |
| `src/tools/unbscolor/services/analysisService.ts` | Renomear pantoneName |
| `src/tools/unbscolor/components/PantoneCard.tsx` | Deletar arquivo |

