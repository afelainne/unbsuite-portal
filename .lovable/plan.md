

# Correcoes: Upload de imagem global no UNBSCOLOR + Layout do header do UNBSFORMAT

## 1. UNBSCOLOR -- Upload de imagem (SVG + raster) disponivel globalmente

Atualmente o upload de SVG so esta disponivel via `PaletteGenerator` no header, e o upload de imagem raster so existe no Palette Magic. A mudanca e unificar ambos num unico componente de upload no header que aceita **SVG + JPG/PNG/WEBP**, e distribuir as cores extraidas para todas as abas (Matcher, Multi-Slot, Generated Palettes, Print Guide, etc.).

### Mudancas em `src/tools/unbscolor/components/PaletteGenerator.tsx`

- Expandir o `accept` do file input para aceitar tambem `image/jpeg, image/png, image/webp` alem de `.svg`
- Ao receber um arquivo:
  - Se for SVG: usar `extractColorsFromSvg` (logica atual)
  - Se for imagem raster (JPG/PNG/WEBP): usar `extractDominantColors` do `imageExtraction.ts`
- As cores extraidas sao injetadas via `onColorSelect` (primeiro cor) e `onPaletteDetected` (todas as cores)
- Atualizar o label do botao para indicar que aceita SVG e imagens
- Atualizar o `accept` para `.svg,image/svg+xml,image/jpeg,image/png,image/webp`

Isso garante que o upload no header funciona para SVG e imagens, e as cores sao distribuidas para todas as tabs porque `onPaletteDetected` chama `setBatchColors` e `handleHexChange` no `App.tsx`.

### Mudancas em `src/tools/unbscolor/App.tsx`

Nenhuma mudanca necessaria -- o `PaletteGenerator` ja esta conectado ao `handleHexChange` e `setBatchColors` que alimentam todas as abas.

---

## 2. UNBSFORMAT -- Correcao do layout do header (sliders na mesma linha)

O bug esta na estrutura HTML das linhas 73-98 do `App.tsx` do UNBSFORMAT. O `<div>` que envolve "Columns" nao esta fechado antes de "Rows" comecar, fazendo com que Rows fique aninhado dentro de Columns (um sobre o outro). Os 4 controles (Columns, Rows, Gutter, Safe Margin) devem estar todos no mesmo nivel como filhos diretos do flex container.

### Mudanca em `src/tools/unbsformat/App.tsx`

Corrigir a estrutura HTML do header (linhas 73-98):

**Antes (bugado):**
```
<div flex-col>  // Columns wrapper
  <div flex>    // Columns slider
    // Missing closing </div> for Columns wrapper here!
    <div flex-col>  // Rows wrapper (nested inside Columns!)
      ...
    </div>
  </div>        // This closes Columns slider div but is misplaced
</div>          // This closes Columns wrapper
```

**Depois (corrigido):**
```
<div flex-col>   // Columns
  <span>Columns</span>
  <div flex>...</div>
</div>           // Closed properly

<div flex-col>   // Rows
  <span>Rows</span>
  <div flex>...</div>
</div>           // Separate sibling

<div flex-col>   // Gutter
  ...
</div>

<div flex-col>   // Safe Margin
  ...
</div>
```

Todos os 4 controles ficam como filhos diretos do `<div className="flex gap-12 items-center">`, alinhados horizontalmente na mesma linha.

---

## Resumo de arquivos

| Arquivo | Mudanca |
|---------|---------|
| `src/tools/unbscolor/components/PaletteGenerator.tsx` | Aceitar SVG + imagens raster, usar extractDominantColors para JPG/PNG/WEBP |
| `src/tools/unbsformat/App.tsx` | Corrigir aninhamento dos divs de Columns/Rows para ficarem na mesma linha horizontal |

## Ordem de execucao

1. Corrigir layout do header do UNBSFORMAT
2. Expandir PaletteGenerator para aceitar imagens raster

