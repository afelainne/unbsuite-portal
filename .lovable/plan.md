

# Revisao: Diagnostico de Glyphs, Editor, Metrics e Kerning

## Problemas Encontrados

### 1. BUG CRITICO: Missing `break` no switch do SpacingManager (linha 191)

O `case 'smart':` no `handleAutoKern` NAO tem `break` -- ele cai direto no `case 'professional':`. Resultado: quando o usuario seleciona "smart", o kerning smart e gerado, mas em seguida o `professional` sobrescreve tudo com `newKerning = { ...metadata.kerning }` + pares profissionais. O modo "smart" nunca funciona sozinho.

```
case 'smart':
    newKerning = generateSmartAutoKerning(...);
    // ... fallback logic ...
    message = `Smart Auto-Kern: ...`;
    // <-- FALTA break; AQUI
case 'professional': {   // <-- cai direto aqui
    newKerning = { ...metadata.kerning };  // sobrescreve smart
```

**Correcao:** Adicionar `break;` apos o bloco `case 'smart':` (apos linha 190).

---

### 2. CompactEditor ainda usa marginBottom hack (linha 835)

No TestMode corrigimos o lineGap removendo o `marginBottom` hack e usando `lineBodyHeight` no container. Mas no CompactEditor (linha 835) o hack antigo continua:

```
marginBottom: -(spanHeight - fontSize) * 0.2
```

Isso cria inconsistencia entre os dois modos de preview. O CompactEditor usa `lineHeight` CSS (linha 780) mas sem a mesma correcao do TestMode.

**Correcao:** Aplicar a mesma logica do TestMode: usar `lineBodyHeight` no container da linha e remover o `marginBottom` hack dos spans.

---

### 3. Diagnostico `NO_VIEWBOX` gera ruido desnecessario

O diagnostico na linha 444-455 marca TODOS os glyphs sem `svgViewBox` como "info". Mas a maioria dos glyphs importados por SVG paste nao precisa de `svgViewBox` -- o campo e opcional e raramente usado. Isso gera dezenas de avisos "info" inuteis que poluem o painel sem valor real para o usuario.

**Correcao:** Remover o diagnostico `NO_VIEWBOX`. O campo `svgViewBox` e um detalhe interno, nao um problema do glyph.

---

### 4. Diagnostico `PATH_NOT_AT_ORIGIN` tem thresholds errados

Na linha 458, glyphs com `bbox.x > 100 || bbox.y > 100` sao marcados como "fora da origem". Mas a maioria dos glyphs em fontes tem coordenadas Y entre 0 e 800+ (ascender). Um glyph com `y=200` (normal) e reportado como problema. O threshold `y > 100` e baixo demais.

**Correcao:** Remover este diagnostico ou ajustar para valores realmente problematicos (ex: `bbox.x > 500 || bbox.y > 1500`). Considerando que `leftSideBearing` e `baselineOffset` controlam o posicionamento, reportar a posicao do bbox nao e util.

---

### 5. `measurePathBBox` no diagnostico nao suporta comandos relativos

O parser de path na linha 77 usa regex case-insensitive (`/gi`) mas trata TODOS os comandos como absolutos. Comandos relativos (`m`, `l`, `c`, `s`, `q`, `t`, `a`, `h`, `v`) sao comuns em SVGs exportados e deveriam adicionar offsets ao `currentX/currentY` em vez de substituir. Isso faz o bounding box ser calculado incorretamente para muitos glyphs, gerando falsos positivos nos diagnosticos de scale e height.

**Correcao:** Diferenciar comandos absolutos (maiusculos) de relativos (minusculos) no parser. Para relativos, somar ao `currentX/currentY` em vez de atribuir diretamente.

---

### 6. `EditorModal` atualiza metadata diretamente durante drag (linha 340)

Quando o usuario arrasta a guide "ASCENDER" no editor (linha 340), o codigo faz:
```
onUpdateMetadata({ ...metadata, ascender: VISUAL_BASELINE_Y - svgY });
```

Isso SUBSTITUI todo o metadata com o spread `{ ...metadata }`, mas `onUpdateMetadata` e um `React.Dispatch<SetStateAction<FontMetadata>>` -- deveria usar a forma funcional `prev => ({ ...prev, ... })` para evitar race conditions com outras atualizacoes.

**Correcao:** Mudar linhas 340, 344, 347 para usar a forma funcional:
```
onUpdateMetadata(prev => ({ ...prev, ascender: VISUAL_BASELINE_Y - svgY }));
```

---

### 7. `autoFixAction` do diagnostico `WIDTH_TOO_SMALL` usa LSB incorreto

Na linha 404, o auto-fix para width muito pequeno calcula:
```
advanceWidth: Math.round(bbox.width * scale + lsb * 2)
```

Se `lsb` for negativo (ex: -100), isso REDUZ o width sugerido, potencialmente gerando um width ainda menor. A formula deveria usar o valor absoluto ou um padding fixo.

**Correcao:** Usar `Math.round(bbox.width * scale + Math.abs(lsb) * 2)` ou simplesmente `Math.round(bbox.width * scale + 100)` como padding fixo.

---

## Plano de Implementacao

### Arquivo 1: SpacingManager.tsx
- Linha 190: Adicionar `break;` apos o bloco `case 'smart':`

### Arquivo 2: CompactEditor.tsx
- Linhas 778-856: Aplicar a mesma correcao de lineGap do TestMode -- usar `lineBodyHeight` no container e remover `marginBottom` hack dos spans

### Arquivo 3: glyphDiagnosticService.ts
- Remover diagnostico `NO_VIEWBOX` (linhas 444-455)
- Remover ou ajustar diagnostico `PATH_NOT_AT_ORIGIN` (linhas 457-468)
- Corrigir formula do auto-fix `WIDTH_TOO_SMALL` (linha 404)
- Corrigir `measurePathBBox` para suportar comandos SVG relativos (linhas 82-163)

### Arquivo 4: EditorModal.tsx
- Linhas 340, 344, 347: Usar forma funcional de `onUpdateMetadata`

### Ordem de execucao

| # | Tarefa | Arquivo |
|---|--------|---------|
| 1 | Adicionar break no case 'smart' | SpacingManager.tsx |
| 2 | Corrigir lineGap no CompactEditor (remover marginBottom hack) | CompactEditor.tsx |
| 3 | Remover diagnosticos ruidosos e corrigir auto-fix | glyphDiagnosticService.ts |
| 4 | Suportar comandos SVG relativos no measurePathBBox | glyphDiagnosticService.ts |
| 5 | Corrigir onUpdateMetadata para forma funcional | EditorModal.tsx |

