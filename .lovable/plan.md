

# Corrigir SVG Export, Adicionar Grid Horizontal, e Expandir LinkedIn

## 3 Problemas Identificados

### 1. LinkedIn Personal vs Page
Atualmente so existe um "LINKEDIN BANNER", "LINKEDIN POST" e "LINKEDIN STORY" genericos. O LinkedIn tem tamanhos diferentes para perfil pessoal e company page.

**Novos formatos a adicionar:**
- LINKEDIN PERSONAL COVER (1584x396px = 423.33x105.83mm)
- LINKEDIN PERSONAL PHOTO (400x400px = 105.83x105.83mm)
- LINKEDIN PAGE COVER (1128x191px = 298.45x50.53mm)
- LINKEDIN PAGE LOGO (300x300px = 79.38x79.38mm)
- LINKEDIN ARTICLE COVER (698x400px = 184.67x105.83mm)
- LINKEDIN EVENT COVER (1776x444px = 469.90x117.48mm)
- LINKEDIN CAROUSEL (1080x1080px = 285.75x285.75mm)
- LINKEDIN AD SINGLE (1200x627px = 317.50x165.89mm)

Os existentes (`li_banner`, `li_post`, `li_story`) serao renomeados para maior clareza.

### 2. SVG Export quebrado
O `downloadSVG` usa `document.querySelector('svg')` que pega o **primeiro SVG da pagina** -- que pode ser um icone do Lucide (nos botoes do toolbar). Mesmo que pegue o SVG correto, ele nao inclui o namespace XML necessario para um SVG standalone valido.

**Correcao:** Adicionar um `id` ou `ref` ao SVG do template e usar esse seletor especifico. Tambem adicionar `xmlns` no serializado e metadata do formato.

### 3. Grid so vertical, sem linhas horizontais
Atualmente o grid so desenha colunas verticais. Falta um controle de **Rows** (linhas horizontais) no header, igual ao slider de Columns. Os presets MODULAR ja setam `rows > 1`, mas o usuario nao tem controle manual.

**Correcao:** Adicionar slider de "Rows" no header control bar, ao lado do slider de Columns.

---

## Mudancas tecnicas

### `constants.ts`
- Renomear/expandir os itens LinkedIn:
  - `li_banner` -> `LINKEDIN PERSONAL COVER` (1584x396px)
  - `li_post` -> `LINKEDIN POST` (manter)
  - `li_story` -> `LINKEDIN STORY` (manter)
  - Adicionar: `LINKEDIN PERSONAL PHOTO`, `LINKEDIN PAGE COVER`, `LINKEDIN PAGE LOGO`, `LINKEDIN ARTICLE COVER`, `LINKEDIN EVENT COVER`, `LINKEDIN CAROUSEL`, `LINKEDIN AD SINGLE`

### `TemplatePreview.tsx`
- Adicionar `id="formatlab-canvas"` ao elemento `<svg>` do template
- Isso garante que o export pega o SVG correto

### `App.tsx`
- Corrigir `downloadSVG`: usar `document.getElementById('formatlab-canvas')` em vez de `document.querySelector('svg')`
- Adicionar header XML e doctype ao SVG exportado para compatibilidade
- Adicionar slider de **Rows** no header, entre Columns e Gutter:
  ```
  [Columns: 12 ---|] [Rows: 1 ---|] [Gutter: 5mm ---|] [Safe: 5mm ---|]
  ```

### Resultado no header

```text
[Columns: 12] [Rows: 1] [Gutter: 5mm] [Safe: 5mm]   [GRID STYLES] [GRID] [SAFETY] [EXPORT SVG]
```

O slider de Rows vai de 1 a 12, e ao mudar, o TemplatePreview ja renderiza as linhas horizontais (esse codigo ja existe no TemplatePreview, so faltava o controle).

