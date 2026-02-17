

# Revisao Completa: TestMode e FontPreview

## Analise dos Problemas Encontrados

### TestMode.tsx - 8 problemas identificados

**1. Duplicacao de estado com metadata (linhas 34-36, 55-60)**
O TestMode mantem `previewLineGap`, `previewWordSpacing`, `previewTracking` como estado local, sincronizados via `useEffect`. Isso cria o mesmo problema que ja corrigimos no CompactEditor -- estado duplicado, risco de dessincronizacao, e complexidade desnecessaria. O padrao "Aplicar na Fonte" e confuso porque o usuario ve controles que parecem funcionar mas nao aplicam nada ate clicar um botao separado.

**Correcao:** Eliminar os 3 estados locais de preview. Ler diretamente de `metadata.tracking`, `metadata.lineGap`, `metadata.wordSpacing`. Quando o usuario mover um slider, atualizar o metadata imediatamente (como ja funciona no CompactEditor). Remover o botao "Aplicar na Fonte" e o snapshot/reset que perdem sentido.

---

**2. Espaco entre palavras calculado de forma inconsistente (linhas 391, 399)**

No CompactEditor (linha 812):
```
width: fontSize * 0.3 + wordSpacing
```
No TestMode (linha 399):
```
width: fontSize * 0.3 + previewWordSpacing
```

O problema e que `previewWordSpacing` esta em unidades de design (ex: 250 de 1000 UPM), mas e somado diretamente a pixels (`fontSize * 0.3`). Deveria ser convertido para pixels: `previewWordSpacing * scaleFactor`. O CompactEditor tem o mesmo bug.

**Correcao:** Converter wordSpacing para pixels antes de somar: `fontSize * 0.3 + wordSpacing * (fontSize / upm)`.

---

**3. Tracking aplicado duas vezes (linhas 390-391 e 431)**

Na linha 390, o div pai aplica `letterSpacing: previewTracking * scaleFactor` via CSS. Na linha 431, cada span calcula `width = baseWidth + (previewTracking * scale)`. O CSS `letterSpacing` ja adiciona espaco apos cada caractere, e o `width` manual tambem adiciona. Resultado: tracking e aplicado 2x.

No CompactEditor (linhas 805, 829) o mesmo bug existe -- `letterSpacing` no CSS do container E soma manual no width do span.

**Correcao:** Remover o `letterSpacing` do CSS do container (e `wordSpacing` tambem, ja que calculamos manualmente). Manter apenas o calculo manual no width de cada span, que e mais preciso e considera kerning.

---

**4. Kerning nao usa trackingProfile (linhas 425-428)**

O TestMode calcula kerning simples via `getKerningValue` (que chama `resolveKerningValue`), mas nao aplica o tracking contextual do `trackingProfile` (que considera all-caps bonus, punctuation factor, whitespace factor, size compensation). O `layoutService.ts` faz isso corretamente, mas o TestMode nao usa o layoutService.

**Correcao:** Usar `getTrackingBetweenGlyphs` do `trackingService.ts` para calcular o tracking contextual entre cada par de glyphs, somando ao kerning. Isso ja e importado mas nao usado na renderizacao.

---

**5. `updateProfile` nao respeita a estrutura aninhada de `rules` (linhas 96-103)**

Na linha 98, o codigo verifica se os updates contem chaves de `rules`, mas o `updateProfile` e chamado com objetos como `{ punctuationFactor: 0.5 }` que sao chaves de `rules`, nao do profile raiz. O spread `{ ...activeProfile, ...updates }` coloca `punctuationFactor` no nivel errado. Depois corrige parcialmente na linha 99, mas o cast `as any` indica que a logica e fragil.

**Correcao:** Separar as funcoes: `updateProfileField` para campos do profile raiz e `updateProfileRule` para campos dentro de `rules`.

---

**6. Linhas multilinea ignoram kerning entre palavras (linha 426)**

```typescript
if (charIdx > 0 && prevChar && prevChar !== ' ') {
    kernAdjust = getKerningValue(prevChar, char) * scale;
}
```

O kerning e ignorado quando o caractere anterior e espaco. Isso e correto para kerning de pares, mas o tracking contextual (whitespace factor) deveria ser aplicado. A condicao `prevChar !== ' '` impede qualquer ajuste apos espacos.

**Correcao:** Aplicar tracking contextual sempre (via `getTrackingBetweenGlyphs`), e kerning de pares apenas quando ambos nao sao espaco.

---

**7. viewBox nao considera descender (linhas 434-437)**

```typescript
const viewBoxHeight = upm + accentSpace;
const viewBoxY = -accentSpace;
```

O viewBox vai de `-accentSpace` ate `upm`, mas glyphs com descenders (g, p, y) tem partes abaixo de 0 (baseline). O `viewBoxHeight` deveria incluir o descender. O ascender e ~800, descender e ~-200, entao o viewBox deveria cobrir de `-accentSpace` ate `ascender + |descender| + accentSpace`.

**Correcao:** Usar `metadata.ascender` e `metadata.descender` para calcular viewBox preciso:
```
viewBoxY = -accentSpace
viewBoxHeight = metadata.ascender + Math.abs(metadata.descender) + accentSpace
```

---

**8. `lineSpacing` mistura unidades (linha 379)**

```typescript
const lineSpacing = (previewLineGap / upm) * fontSize + (lineHeight - 1) * fontSize;
```

`lineHeight` (slider de 0.8 a 3.0) e um multiplicador CSS, e `previewLineGap` e em unidades de design. Esses dois conceitos sobrepostos causam confusao. Se o usuario ajusta lineGap E lineHeight, o espaco entre linhas e somado duas vezes.

**Correcao:** Remover o slider de `lineHeight` separado. Usar apenas `lineGap` (em unidades de design) como o unico controle de entrelinhas. Calcular: `marginTop = (lineGap / upm) * fontSize`.

---

### FontPreview.tsx - 3 problemas identificados

**9. Nao aplica kerning/tracking da fonte (linhas 186-193)**

O FontPreview usa `fontFamily` CSS para renderizar, o que significa que kerning e tracking dependem das tabelas OpenType da fonte exportada. Porem, o exportador pode nao estar gerando as tabelas `kern` ou `GPOS` corretamente, resultando em preview sem kerning.

**Correcao:** Adicionar nota visual indicando se a fonte exportada tem kerning embutido. Mostrar contagem de pares de kerning no footer.

---

**10. Font leak -- FontFace nunca e removida (linhas 55-60)**

```typescript
document.fonts.add(fontFace);
```

A cada clique em "Atualizar", uma nova FontFace e adicionada ao documento com nome unico (`FontPreview_timestamp_random`), mas a antiga nunca e removida de `document.fonts`. Apos varias atualizacoes, acumulam-se fontes no DOM.

**Correcao:** Antes de adicionar nova FontFace, iterar `document.fonts` e deletar a anterior com o mesmo family name.

---

**11. `uniqueFontFamily` e memo sem deps (linhas 32-34)**

```typescript
const uniqueFontFamily = useMemo(() => {
    return `FontPreview_${Date.now()}_...`;
}, []);
```

Como deps e `[]`, o nome e gerado uma vez. Quando o usuario clica "Atualizar", a nova fonte e registrada com o mesmo nome, sobrescrevendo a anterior. Isso e correto, mas conflita com o fato de que `loadFont` cria um novo blob URL sem remover o anterior do `document.fonts`.

**Correcao:** Manter nome fixo (sem timestamp), e limpar a FontFace anterior antes de adicionar a nova.

---

## Plano de Implementacao

### Arquivo 1: TestMode.tsx (reescrita parcial)

**Remover:**
- `previewLineGap`, `previewWordSpacing`, `previewTracking` (3 estados locais)
- `initialSnapshot` ref e useEffect de snapshot
- useEffect de sincronizacao (linhas 56-60)
- `handleReset` e `handleApplyToFont`
- Slider de `lineHeight` (substituido por lineGap)
- Painel de Tipografia com botao "Aplicar na Fonte"

**Alterar:**
- Sliders de tracking/lineGap/wordSpacing atualizam `metadata` diretamente via `onUpdateMetadata`
- Renderizacao de cada glyph: remover `letterSpacing`/`wordSpacing` do CSS do container
- Calcular tracking contextual via `getTrackingBetweenGlyphs` entre cada par
- Corrigir viewBox para incluir descender
- Corrigir espaco entre palavras para converter unidades corretamente
- Simplificar lineSpacing para usar apenas lineGap

**Manter:**
- Slider de fontSize (controle de visualizacao local, nao afeta a fonte)
- Painel de Tracking Rules (afeta `trackingProfile` que e persistido)
- Placeholder para glyphs ausentes
- Context menu para kerning

### Arquivo 2: FontPreview.tsx (correcoes pontuais)

- Limpar FontFace anterior antes de adicionar nova
- Usar nome fixo para fontFamily (sem timestamp)
- Adicionar contagem de kerning pairs no footer
- Revogar blob URL anterior corretamente

### Arquivo 3: CompactEditor.tsx (mesmos bugs de renderizacao)

- Remover `letterSpacing`/`wordSpacing` do CSS do container (linha 805-806)
- Corrigir espaco entre palavras (linha 812): converter para pixels
- Corrigir viewBox para incluir descender (linhas 832-838)

---

## Detalhes Tecnicos

### Renderizacao corrigida de cada glyph (TestMode e CompactEditor)

```text
Para cada caractere na linha:
  1. Obter glyph via getGlyph(char)
  2. Se espaco: renderizar span com width = wordSpacing * (fontSize / upm)
  3. Se glyph ausente: placeholder pontilhado
  4. Se glyph presente:
     a. scale = fontSize / upm
     b. baseWidth = glyph.advanceWidth * scale
     c. Se tem caractere anterior:
        - trackingGap = getTrackingBetweenGlyphs(prevGlyph, glyph, trackingProfile, fontSize, isAllCaps)
        - kerningGap = resolveKerningValue(prevGlyph, glyph, metadata.kerning)
        - marginLeft = (trackingGap + kerningGap) * scale
     d. width = baseWidth (sem somar tracking, pois tracking ja esta no marginLeft)
     e. viewBoxY = -accentSpace
     f. viewBoxHeight = ascender + |descender| + accentSpace
```

### Sliders que atualizam metadata diretamente

```text
Tracking: onUpdateMetadata(prev => ({ ...prev, tracking: value }))
LineGap: onUpdateMetadata(prev => ({ ...prev, lineGap: value }))
WordSpacing: onUpdateMetadata(prev => ({ ...prev, wordSpacing: value }))
```

### FontPreview cleanup

```text
Antes de document.fonts.add(newFontFace):
  document.fonts.forEach(f => {
    if (f.family === FONT_FAMILY_NAME) document.fonts.delete(f);
  });
```

### Ordem de execucao

| # | Tarefa | Arquivo |
|---|--------|---------|
| 1 | Eliminar estado local, sliders diretos | TestMode.tsx |
| 2 | Corrigir renderizacao (tracking duplo, viewBox, wordSpacing) | TestMode.tsx |
| 3 | Aplicar mesmas correcoes de renderizacao | CompactEditor.tsx |
| 4 | Limpar FontFace e corrigir leak | FontPreview.tsx |
| 5 | Testar fluxo completo no browser | Manual |

