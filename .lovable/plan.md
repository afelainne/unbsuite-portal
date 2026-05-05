
# Padronização visual: UNBSCOLOR, UNBSGRID, UNBSFORMAT, UNBSFONT

Hoje cada ferramenta tem botões, fontes, sidebars e toolbars com estilos próprios — uns usam `Button` do shadcn, outros `<button>` cru, fontes variam entre `font-sans`, `font-mono`, tamanhos arbitrários (text-xs, text-[10px], text-sm). O objetivo é uma camada compartilhada de UI que todas as 4 ferramentas consomem, garantindo identidade idêntica (estética industrial e-reader: amarelo #F7E043, texto #232323, mono uppercase tracking-wide).

## 1. Ocultar UNBSMOCKUP e UNBSTYPE da home

Em `src/pages/Index.tsx`, filtrar do array `TOOLS` os itens `UNBSMOCKUP` e `UNBSTYPE` (manter rotas funcionais em `App.tsx` para acesso direto, apenas escondê-las da listagem). Renumerar índices 01–04.

## 2. Criar biblioteca compartilhada `src/tools/_shared/ui/`

Componentes únicos consumidos por todas as 4 ferramentas:

- **`ToolShell.tsx`** — container raiz: header fixo no topo (48px), sidebar esquerda 280px opcional, área central. Fundo `#FFFFFF`, texto `#232323`, fonte `font-mono` para chrome, `font-sans` para conteúdo de canvas.
- **`ToolHeader.tsx`** — barra superior padronizada com: marca `UNBSxxx` (mono 11px uppercase tracking-[0.2em]), navegação central (links mono 10px), ações à direita (botões compactos). Mesma altura/border/cor em todas.
- **`ToolButton.tsx`** — único componente de botão com 3 variantes:
  - `primary`: bg `#F0FF00`, texto `#232323`, border 1px preta, mono 10px uppercase tracking-[0.18em], altura 28px, padding 12px
  - `ghost`: transparente, border `#232323/20`, hover bg `#F7E043/30`
  - `icon`: 28×28 quadrado, ícone 14px, border 1px
- **`ToolPanel.tsx`** — painel lateral 280px com seções colapsáveis. Header de seção mono 9px uppercase tracking-[0.2em], padding 12px, border-bottom 1px `#232323/10`.
- **`ToolSlider.tsx`** — slider com track 2px, thumb 16px (já documentado em memória).
- **`ToolInput.tsx`** — input mono 11px, h-7, border 1px, sem rounded-corners agressivos (rounded-none).
- **`tokens.ts`** — exporta constantes: cores, espaçamentos, tipografia, classes Tailwind padrão (`HEADER_TEXT`, `LABEL_TEXT`, `BODY_TEXT`).

## 3. Refator linha-por-linha em cada ferramenta

Substituir inline por componentes compartilhados:

### UNBSCOLOR (`src/tools/unbscolor/`)
- `App.tsx`: trocar header próprio → `ToolHeader`, sidebar/painéis → `ToolPanel`
- `ColorInput.tsx`, `PaletteBuilder.tsx`, `PaletteMagic.tsx`, `BatchAnalyzer.tsx`, `LibraryManager.tsx`, `GeneratedPalettes.tsx`, `ColorSheetExport.tsx`: todos os `<button>` → `ToolButton`; labels `text-xs uppercase` → `LABEL_TEXT`; inputs → `ToolInput`; sliders → `ToolSlider`.

### UNBSGRID (`src/tools/unbsgrid/pages/Index.tsx`)
- Hoje usa `Button`, `Input`, `Slider`, `Switch` do shadcn local. Trocar para os shared `ToolButton`/`ToolInput`/`ToolSlider`.
- Sidebar de controles → `ToolPanel` com `Collapsible` consistente.
- Header → `ToolHeader`.

### UNBSFORMAT (`src/tools/unbsformat/`)
- `App.tsx`: header inline → `ToolHeader`. Botões `Download`, `LayoutGrid` → `ToolButton`.
- `Sidebar.tsx`: refatorar wrapper para `ToolPanel`. Inputs/selects para shared.
- `TemplatePreview.tsx`: manter SVG, padronizar overlays/toolbar superior do preview.
- `GridStylePicker.tsx`: padronizar tipografia e cards com tokens.

### UNBSFONT (`src/tools/unbsfont/`)
- `Toolbar.tsx`: maior refator — substituir todos os botões por `ToolButton`.
- `Dashboard.tsx`, `CompactEditor.tsx`, `ExportLab.tsx`, `SpacingManager.tsx`, `TestMode.tsx`, `FontPreview.tsx`, `EditorModal.tsx`, `Toolbar.tsx`: linha por linha, swap de botões/labels/inputs/sliders.
- `ModeSelector.tsx`: usar `ToolButton primary` no botão CTA.

## 4. Tipografia única

- **Chrome (header, painel, labels, botões):** `font-mono uppercase tracking-[0.2em]`, tamanhos somente em `9px`, `10px`, `11px`.
- **Títulos de seção:** `text-[11px] font-bold uppercase tracking-[0.18em]`.
- **Conteúdo (canvas, swatches, números):** `font-sans` tamanhos `12px`–`14px`.
- **Eliminar** ocorrências de `text-sm`, `text-base`, `text-lg` espalhadas no chrome.

## 5. Cores via tokens (sem hardcode)

Adicionar ao `src/index.css` se faltarem:
```css
--tool-bg: 0 0% 100%;
--tool-fg: 0 0% 14%;
--tool-accent: 60 100% 50%;       /* #F0FF00 */
--tool-accent-soft: 53 91% 62%;   /* #F7E043 */
--tool-border: 0 0% 14% / 0.12;
```
Todas as cores nos componentes shared puxam dessas variáveis (sem `#232323` literal nos componentes).

## Ordem de execução

1. Criar `src/tools/_shared/ui/` com `ToolButton`, `ToolHeader`, `ToolPanel`, `ToolInput`, `ToolSlider`, `tokens.ts`
2. Atualizar `src/index.css` com tokens
3. Esconder UNBSMOCKUP/UNBSTYPE em `src/pages/Index.tsx`
4. Refatorar UNBSCOLOR (App + 12 componentes)
5. Refatorar UNBSGRID (`pages/Index.tsx` + dialogs)
6. Refatorar UNBSFORMAT (App + Sidebar + TemplatePreview + GridStylePicker)
7. Refatorar UNBSFONT (Toolbar + Dashboard + CompactEditor + ExportLab + SpacingManager + TestMode + FontPreview + EditorModal + ModeSelector)

Resultado: visual idêntico (mesmo header, mesmos botões, mesma tipografia, mesma sidebar) entre as 4 ferramentas. Mockup e Type continuam acessíveis por URL mas somem da home.
