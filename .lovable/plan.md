
# Remover AI Review, Academy e Expandir Categorias de Formatos

## O que muda

1. **Remover AI Technical Review** -- todo o painel direito (aside) com o Gemini analysis, paper recommendations, archive presets e system presets sera removido. Tambem remover os imports e estados relacionados (isAnalyzing, analysis, geminiService import, etc).

2. **Remover botao "GO TO ACADEMY"** da Sidebar (nao funciona).

3. **Remover UPLOAD ART** do header (era vinculado ao AI review).

4. **Expandir FORMAT_PRESETS** com muitas novas categorias e formatos.

5. **Sidebar com categorias colapsaveis** usando estado local de toggle.

---

## Novos formatos e categorias

### PRINT (existente, expandido)
- A0-A6 (ja existem)
- Business Card INTL / US (ja existem)
- **Novos**: DL Envelope, C5 Envelope, A4 Landscape, A3 Landscape, Letter (US), Legal (US), Tabloid (US), Half Letter

### EDITORIAL
- Book Cover (156x234mm)
- Pocket Book (110x178mm)
- Magazine Spread (420x297mm)
- CD Booklet (120x120mm)
- Vinyl Cover (315x315mm)
- DVD Cover (184x273mm)

### PACKAGING
- Label (100x50mm)
- Hang Tag (55x90mm)
- Box Lid (200x200mm)
- Wine Label (90x120mm)
- Soap Wrap (210x80mm)

### SIGNAGE
- Banner (1000x500mm)
- Roll-Up (850x2000mm)
- Billboard 4-Sheet (1016x1524mm)
- A-Frame (600x900mm)
- Table Tent (100x210mm)

### SOCIAL MEDIA (existente, expandido)
- Instagram Square / Portrait (ja existem)
- **Novos**: Instagram Story (285.75x507.94mm @96dpi), Facebook Cover (222.25x82.02mm), Facebook Post (167.64x167.64mm), Twitter/X Header (396.88x132.29mm), Twitter/X Post (167.64x167.64mm), LinkedIn Banner (414.69x108.73mm), YouTube Thumbnail (340.36x191.45mm), Pinterest Pin (167.64x251.46mm), TikTok Cover (285.75x507.94mm)

### STATIONERY
- Letterhead A4 (210x297mm)
- Envelope DL (220x110mm)
- Compliment Slip (210x99mm)
- Notecard (A6 105x148mm)
- Bookmark (50x150mm)
- Certificate (297x210mm)

---

## Mudancas tecnicas

### types.ts
Expandir o tipo `category` para incluir todas as novas categorias:
```
category: 'PRINT' | 'SOCIAL MEDIA' | 'EDITORIAL' | 'PACKAGING' | 'SIGNAGE' | 'STATIONERY';
```

### constants.ts
Adicionar todos os novos presets ao array FORMAT_PRESETS.

### Sidebar.tsx
- Remover botao "GO TO ACADEMY" e a secao de dimensoes fixas no rodape.
- Agrupar formatos por categoria dinamicamente.
- Cada categoria e colapsavel com um toggle (estado local `openCategories` como Set).
- Clicar no header da categoria abre/fecha a lista.
- Icone de seta (ChevronDown/ChevronRight) indica estado.

### App.tsx
- Remover o aside inteiro (painel direito com AI Review).
- Remover estados: `isAnalyzing`, `analysis`, `uploadedImage`.
- Remover `fileInputRef` e `handleFileChange`.
- Remover import de `analyzePrintImage` do geminiService.
- Remover botao UPLOAD ART do header.
- Remover imports nao utilizados (Loader2, FileText, AlertTriangle, Settings, Upload).
- O TemplatePreview agora ocupa toda a area disponivel sem o aside.

### geminiService.ts
Manter o arquivo (nao deletar), pois pode ser reutilizado no futuro, mas nao sera mais importado.

---

## Resultado visual

```text
+--SIDEBAR (colapsavel)------+---HEADER CONTROLS---+
| FORMAT LAB                 | Cols | Gutter | Safe |
|                            | [GRID] [SAFETY]     |
| > PRINT (click to toggle)  | [EXPORT SVG]        |
|   A0 POSTER     841x1189  |---------------------+
|   A1 POSTER     594x841   |                     |
|   ...                      |   TEMPLATE PREVIEW  |
| > EDITORIAL                |   (full width now)  |
|   Book Cover    156x234   |                     |
|   ...                      |                     |
| > PACKAGING                |                     |
|   Label         100x50    |                     |
| > SIGNAGE                  |                     |
| > SOCIAL MEDIA             |                     |
| > STATIONERY               |                     |
+----------------------------+---------------------+
| FOOTER: UNITS MM | SCALE 1:1 | LIVE              |
+---------------------------------------------------+
```
