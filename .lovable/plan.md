
# Adicionar Estilos de Grid Predefinidos ao UNBSFORMAT

## Problema

Atualmente o app so permite ajustar colunas, gutter e margem manualmente via sliders, sem oferecer presets rapidos. O usuario precisa de opcoes prontas para diferentes usos (editorial, web, poster, etc.).

## Solucao

Criar um sistema de **Grid Style Presets** -- combinacoes predefinidas de colunas, gutter, margem de seguranca e bleed que o usuario pode aplicar com um clique. Os presets ficam agrupados por categoria colapsavel, abaixo dos controles do header ou numa secao dedicada.

## Novos tipos

### `types.ts`
Adicionar interface `GridStylePreset`:

```text
GridStylePreset {
  id: string
  name: string
  columns: number
  rows: number
  gutter: number
  safeZone: number
  bleed: number
  category: 'CLASSIC' | 'EDITORIAL' | 'DIGITAL' | 'POSTER' | 'MINIMAL' | 'MODULAR' | 'CUSTOM'
  description: string   // ex: "Swiss International Style"
}
```

### `constants.ts`
Adicionar array `GRID_STYLE_PRESETS` com os seguintes estilos:

**CLASSIC (grids tradicionais)**
- 12-Column Standard (12 cols, 5mm gutter, 5mm margin, 3mm bleed) -- padrao atual
- 6-Column Half (6 cols, 8mm gutter, 10mm margin, 3mm bleed)
- 3-Column Editorial (3 cols, 10mm gutter, 15mm margin, 3mm bleed)
- 2-Column Split (2 cols, 12mm gutter, 10mm margin, 3mm bleed)
- Single Column (1 col, 0mm gutter, 15mm margin, 3mm bleed)
- 4-Column Quarter (4 cols, 6mm gutter, 8mm margin, 3mm bleed)
- 8-Column Flexible (8 cols, 4mm gutter, 6mm margin, 3mm bleed)
- 16-Column Dense (16 cols, 3mm gutter, 4mm margin, 3mm bleed)
- 24-Column Micro (24 cols, 2mm gutter, 3mm margin, 3mm bleed)

**EDITORIAL (livros, revistas, jornais)**
- Book Standard (1 col, 0mm gutter, 20mm margin, 3mm bleed)
- Book Two-Column (2 cols, 8mm gutter, 18mm margin, 3mm bleed)
- Magazine 3-Column (3 cols, 5mm gutter, 10mm margin, 5mm bleed)
- Magazine 4-Column (4 cols, 4mm gutter, 8mm margin, 5mm bleed)
- Newspaper 5-Column (5 cols, 3mm gutter, 6mm margin, 3mm bleed)
- Newspaper 6-Column (6 cols, 3mm gutter, 5mm margin, 3mm bleed)
- Academic Journal (2 cols, 6mm gutter, 20mm margin, 3mm bleed)
- Catalog Grid (3 cols, 8mm gutter, 12mm margin, 5mm bleed)

**DIGITAL (social media, web, tela)**
- Social No-Bleed (1 col, 0mm gutter, 8mm margin, 0mm bleed)
- Web 2-Column (2 cols, 5mm gutter, 5mm margin, 0mm bleed)
- Web 3-Column (3 cols, 5mm gutter, 5mm margin, 0mm bleed)
- App Layout 4-Col (4 cols, 4mm gutter, 4mm margin, 0mm bleed)
- Dashboard 6-Col (6 cols, 3mm gutter, 3mm margin, 0mm bleed)
- Presentation (1 col, 0mm gutter, 12mm margin, 0mm bleed)

**POSTER (cartazes, sinalizacao)**
- Poster Bold (4 cols, 10mm gutter, 15mm margin, 5mm bleed)
- Poster Minimal (2 cols, 15mm gutter, 20mm margin, 5mm bleed)
- Poster Dense (6 cols, 5mm gutter, 10mm margin, 5mm bleed)
- Billboard (3 cols, 20mm gutter, 30mm margin, 10mm bleed)
- Banner Horizontal (6 cols, 4mm gutter, 8mm margin, 3mm bleed)

**MINIMAL (espacamento generoso)**
- Breathe (1 col, 0mm gutter, 25mm margin, 3mm bleed)
- Centered Wide (2 cols, 20mm gutter, 20mm margin, 3mm bleed)
- Swiss Style (4 cols, 8mm gutter, 15mm margin, 3mm bleed)
- Whitespace Focus (3 cols, 12mm gutter, 18mm margin, 5mm bleed)

**MODULAR (grids com rows tambem)**
- 3x3 Module (3 cols, 3 rows, 6mm gutter, 8mm margin, 3mm bleed)
- 4x4 Module (4 cols, 4 rows, 5mm gutter, 6mm margin, 3mm bleed)
- 6x6 Module (6 cols, 6 rows, 4mm gutter, 5mm margin, 3mm bleed)
- 2x3 Card Grid (2 cols, 3 rows, 8mm gutter, 10mm margin, 3mm bleed)
- Photo Grid (3 cols, 2 rows, 3mm gutter, 5mm margin, 3mm bleed)

## Mudancas nos componentes

### `App.tsx`
- Adicionar callback `onApplyGridStyle` que recebe um `GridStylePreset` e atualiza o state `settings` de uma vez.
- Passar esse callback para um novo componente ou para a Sidebar.
- Adicionar secao de Grid Styles no header como um dropdown/popover, ou na sidebar como uma segunda aba.

**Decisao de UI**: Adicionar um botao "GRID STYLES" no header control bar que abre um popover com os presets agrupados por categoria (colapsaveis, mesmo padrao da sidebar). Ao clicar num preset, aplica as configuracoes instantaneamente.

### Novo componente: `GridStylePicker.tsx`
- Recebe `onApply: (preset: GridStylePreset) => void` e `currentSettings: PrintSettings`
- Mostra categorias colapsaveis (CLASSIC, EDITORIAL, DIGITAL, POSTER, MINIMAL, MODULAR)
- Cada item mostra: nome, descricao curta, e indicadores visuais (ex: "12 cols | 5mm | 5mm")
- Item selecionado (matching current settings) fica destacado
- Abre como popover a partir do botao no header

### `TemplatePreview.tsx`
- Adicionar suporte a `rows` no rendering do SVG (linhas horizontais alem das colunas verticais)
- Se `rows > 1`, renderizar retangulos horizontais dividindo a area segura
- Isso permite os presets MODULAR funcionarem visualmente

### `Sidebar.tsx`
- Sem mudancas. Os grid styles ficam no header, separados da selecao de formato.

## Resultado visual

```text
HEADER:
[Columns: 12 ---|] [Gutter: 5mm ---|] [Safe: 5mm ---|]  [GRID STYLES v] [GRID] [SAFETY] [EXPORT SVG]
                                                              |
                                                         +----v-----------+
                                                         | > CLASSIC      |
                                                         |   12-Col Std   |
                                                         |   6-Col Half   |
                                                         |   3-Col Edit.  |
                                                         | > EDITORIAL    |
                                                         | > DIGITAL      |
                                                         | > POSTER       |
                                                         | > MINIMAL      |
                                                         | > MODULAR      |
                                                         +----------------+
```

## Ordem de execucao

| # | Tarefa |
|---|--------|
| 1 | Adicionar `GridStylePreset` interface em `types.ts` |
| 2 | Adicionar `GRID_STYLE_PRESETS` array em `constants.ts` com todos os presets |
| 3 | Criar componente `GridStylePicker.tsx` com categorias colapsaveis |
| 4 | Atualizar `App.tsx` para adicionar botao GRID STYLES e callback de aplicacao |
| 5 | Atualizar `TemplatePreview.tsx` para renderizar rows (linhas horizontais) quando rows > 1 |
