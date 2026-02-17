

# Criar UNBSMOCKUP, UNBSTYPE e Adicionar Image Palette ao UNBSCOLOR

## Visao Geral

Tres entregas independentes:
1. **UNBSMOCKUP** -- nova ferramenta de mockups com templates SVG de dispositivos
2. **UNBSTYPE** -- nova ferramenta de pares tipograficos com Google Fonts
3. **Image Palette no UNBSCOLOR** -- adicionar extracao de cores de imagens rasterizadas (JPG/PNG) ao Palette Magic existente

---

## 1. UNBSMOCKUP -- Gerador de Mockups

### Arquivos novos

| Arquivo | Descricao |
|---------|-----------|
| `src/tools/unbsmockup/index.tsx` | Entry point com export default |
| `src/tools/unbsmockup/App.tsx` | Componente principal com state: template selecionado, imagem carregada, cor de fundo |
| `src/tools/unbsmockup/components/DeviceFrame.tsx` | Renderiza o template SVG com a imagem do usuario aplicada dentro via `<image>` ou `<foreignObject>` |
| `src/tools/unbsmockup/components/TemplatePicker.tsx` | Grid de thumbnails dos templates disponiveis |
| `src/tools/unbsmockup/components/ImageUploader.tsx` | Drop zone para upload de imagem (PNG/JPG/SVG) |
| `src/tools/unbsmockup/components/ExportControls.tsx` | Botoes de export PNG e SVG |
| `src/tools/unbsmockup/templates.ts` | Dados dos templates: SVG paths, viewBox, area de tela (clip rect) |
| `src/pages/UnbsMockup.tsx` | Pagina wrapper com ToolLayout |

### Templates inclusos (SVG inline)
- **iPhone 15** (portrait e landscape)
- **MacBook Pro** (tela aberta)
- **iPad** (portrait)
- **Browser Window** (frame generico de navegador)
- **Business Card** (frente)
- **T-Shirt** (silhueta frontal)
- **Poster Frame** (moldura de parede)
- **Instagram Post** (frame com UI do app)

### Fluxo do usuario
1. Escolhe template no grid
2. Faz upload de imagem (drag & drop ou click)
3. A imagem e inserida no SVG dentro da area de tela (clipped)
4. Ajusta cor de fundo (color picker)
5. Exporta como PNG (via canvas) ou SVG

### Tecnica de rendering
- Cada template e um SVG com um `<clipPath>` definindo a area da "tela"
- A imagem do usuario e inserida como `<image href="data:...">` dentro do clip
- Para export PNG: serializa o SVG, desenha num canvas 2x, gera dataURL
- Para export SVG: serializa com `XMLSerializer` + header XML

### Registro no app
- Adicionar rota `/unbsmockup/*` no `App.tsx`
- Adicionar card na pagina Index com icone `Monitor` do Lucide

---

## 2. UNBSTYPE -- Testador de Pares Tipograficos

### Arquivos novos

| Arquivo | Descricao |
|---------|-----------|
| `src/tools/unbstype/index.tsx` | Entry point |
| `src/tools/unbstype/App.tsx` | Estado principal: fonte heading, fonte body, peso, tamanho, contexto |
| `src/tools/unbstype/components/FontSelector.tsx` | Dropdown com busca que carrega Google Fonts via link stylesheet |
| `src/tools/unbstype/components/PreviewPanel.tsx` | Mostra o par tipografico em diferentes contextos |
| `src/tools/unbstype/components/PairSuggestions.tsx` | Sugere combinacoes harmonicas baseadas em classificacao |
| `src/tools/unbstype/components/ContextSwitcher.tsx` | Alterna entre contextos: titulo+corpo, UI mockup, poster, editorial |
| `src/tools/unbstype/constants.ts` | Lista curada de ~80 Google Fonts populares com classificacao (serif, sans, mono, display, handwriting) e pares sugeridos |
| `src/pages/UnbsType.tsx` | Pagina wrapper |

### Carregamento de fontes
- Usar `<link>` tags dinamicas para carregar do Google Fonts CDN (nao precisa de API key para o CSS endpoint)
- URL: `https://fonts.googleapis.com/css2?family=FONT_NAME:wght@400;700&display=swap`
- Ao selecionar uma fonte, injeta a tag `<link>` no `<head>` e aplica via `fontFamily` CSS

### Contextos de preview
- **Hero**: titulo grande (64px) + subtitulo (20px) + paragrafo (16px)
- **Article**: titulo (36px) + corpo longo com paragrafos
- **UI**: botoes, labels, inputs, cards simulados
- **Poster**: titulo enorme (120px) + data/local pequeno (14px)

### Sugestoes de pares
- Regras simples: serif heading + sans body, geometric + humanist, mono + sans
- Array de pares pre-curados (ex: Playfair Display + Source Sans 3, Space Grotesk + Inter)
- Ao clicar numa sugestao, aplica ambas as fontes

### Registro
- Rota `/unbstype/*` no `App.tsx`
- Card na Index com icone `Type` (ja usado, usar `ALargeSmall` ou `CaseSensitive`)

---

## 3. Image Palette no UNBSCOLOR (Palette Magic)

### Mudanca: Extracao de cores de imagens rasterizadas

Adicionar botao "Extract from Image" ao header do Palette Magic que aceita JPG/PNG/WEBP.

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/tools/unbscolor/components/PaletteMagic.tsx` | Adicionar botao de upload de imagem + logica de extracao via canvas |
| `src/tools/unbscolor/utils/imageExtraction.ts` | Adicionar funcao `extractColorsFromRasterImage` (ja existe `extractColorsFromImage` legacy -- refatorar) |

### Logica de extracao
A funcao `extractColorsFromImage` ja existe no `imageExtraction.ts` (linhas 100-140). Ela usa canvas para amostrar pixels e agrupar por proximidade. Vamos:

1. Criar nova funcao `extractDominantColors(file: File, maxColors: number): Promise<string[]>` que:
   - Le o arquivo como dataURL
   - Desenha num canvas 150x150
   - Usa quantizacao por proximidade (ja implementada no legacy)
   - Retorna array de hex

2. No `PaletteMagic.tsx`, adicionar:
   - Botao com icone de imagem ao lado dos "Source" colors
   - Ao clicar, abre file picker para JPG/PNG/WEBP
   - Cores extraidas sao adicionadas ao `sources` (via `onBatchColorsChange`)
   - As cores extraidas ficam visiveis no header como source colors
   - Ao fazer shuffle, as novas cores seed sao usadas na geracao

### UI no Palette Magic
Adicionar junto ao bloco "Source" (linha 453) um botao de upload:

```text
Source: [#F7E043] [#1A1A1A] [#FFFFFF] ... [+ Image]
```

O botao abre file picker, extrai 5-8 cores, e as injeta no batchColors.

---

## Registro de rotas e Index

### `App.tsx`
Adicionar imports e rotas:
- `import UnbsMockup from "./pages/UnbsMockup"`
- `import UnbsType from "./pages/UnbsType"`
- `<Route path="/unbsmockup/*" element={<UnbsMockup />} />`
- `<Route path="/unbstype/*" element={<UnbsType />} />`

### `Index.tsx`
Adicionar dois novos cards ao array `tools`:
- UNBSMOCKUP com icone `Monitor`, label "NEW"
- UNBSTYPE com icone `ALargeSmall`, label "NEW"

---

## Ordem de execucao

| # | Tarefa |
|---|--------|
| 1 | Criar estrutura UNBSMOCKUP: templates SVG, App, componentes, pagina |
| 2 | Criar estrutura UNBSTYPE: constants com fontes, App, componentes, pagina |
| 3 | Adicionar extracao de imagem rasterizada ao Palette Magic do UNBSCOLOR |
| 4 | Registrar rotas e cards no Index |

