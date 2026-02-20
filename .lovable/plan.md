
# UnbsID — Construtor de Manual de Identidade Visual

## O que é

Um novo módulo (`src/tools/unbsid/`) integrado ao hub UNBSTOOLS. O UnbsID gera um manual de identidade visual 16:9 completo, navegável por capítulos, que reutiliza diretamente os utilitários já existentes das outras ferramentas do hub (cores do UNBSCOLOR, grid do UNBSGRID, mockups do UNBSMOCKUP, pares tipográficos do UNBSTYPE).

---

## Arquitetura Geral

```text
src/tools/unbsid/
  index.tsx               ← re-export do App
  App.tsx                 ← orquestrador principal (sidebar + viewer 16:9)
  types.ts                ← BrandData, Chapter, Section, ColorEntry, TypographyStyle…
  store/
    useBrandStore.ts      ← zustand (ou useState elevado) com toda a BrandData
  chapters/
    CoverPage.tsx
    IntroPage.tsx
    LogoPage.tsx
    ColorsPage.tsx
    TypographyPage.tsx
    GraphicsPage.tsx
    LayoutPage.tsx
    VoicePage.tsx
    ApplicationsPage.tsx
    DeliverablesPage.tsx
  components/
    ManualViewer.tsx       ← canvas 16:9, navegação, zoom
    ChapterNav.tsx         ← sidebar esquerda com capítulos
    PageSlide.tsx          ← wrapper de slide com grid base
    ColorPicker.tsx        ← integrado com colorMath do UNBSCOLOR
    AvatarUpload.tsx
    EditableText.tsx
    ExportPanel.tsx        ← botões PNG / PDF / brand.json
  services/
    exportService.ts       ← gera brand.json e tokens.json
```

---

## Modelo de Dados Central (`types.ts`)

```typescript
interface BrandData {
  // Capa
  name: string;
  tagline: string;
  version: string;
  date: string;
  studio: string;

  // Intro
  objective: string;
  archetype: string[];   // 3-5 adjetivos
  values: string[];
  tone: string;
  vibe: string;

  // Logo
  logoVariants: LogoVariant[];
  gridRules: GridRules;
  clearSpaceRule: string;
  minSizeDigital: number;  // px
  minSizePrint: number;    // mm

  // Cores
  palette: ColorEntry[];   // role: primary/secondary/accent/neutral
  neutrals: ColorEntry[];
  gradients: GradientEntry[];

  // Tipografia
  typefaces: TypefaceEntry[];
  typeStyles: TypeStyle[];  // H1…Caption

  // Elementos gráficos
  iconStyle: IconStyleConfig;
  spacingBase: number;   // 4 ou 8

  // Tom de voz
  voiceDos: string[];
  voiceDonts: string[];
  voiceTemplates: VoiceTemplate[];

  // Aplicações
  mockupIds: string[];   // referência a templates do UNBSMOCKUP
}
```

Cada campo tem um valor default, então o manual começa preenchido com placeholders editáveis.

---

## Capítulos e Páginas

### Capa (1 slide)
- Logo upload (SVG/PNG)
- Nome, tagline, versão, data, estúdio — todos campos editáveis inline clicáveis

### 1. Introdução (2 slides)
- Objetivo do manual (textarea editável)
- Arquétipo / personalidade: chips de adjetivos + campo tom + campo vibe

### 2. Logo (5 slides)
- **2.1 Galeria de variações**: grade de cartões (primary, secondary, icon, mono, negative) — cada cartão aceita upload SVG/PNG
- **2.2 Construção e grid**: iframe embed do UNBSGRID com SVG do logo; exibe grid_type, grid_units, key_ratios editáveis
- **2.3 Área de proteção**: visualização inline com clear space animado
- **2.4 Tamanho mínimo**: campos px e mm com preview visual
- **2.5 Usos incorretos**: grade de "não faça" com exemplos gerados a partir do logo

### 3. Cores (4 slides)
- **3.1 Paleta principal**: cards de cor com nome editável, HEX/RGB/HSL/CMYK (calculados via `colorMath.ts` do UNBSCOLOR), papel (role) e nota de acessibilidade — botão "+" para adicionar cor, picker integrado com a lib do UNBSCOLOR
- **3.2 Neutros**: escala de 5–9 tons (auto-gerada a partir da cor primária via funções de `colorMath.ts`)
- **3.3 Regras de contraste A11y**: tabela de pares cor×cor com badge "AA ok / texto grande / evitar" usando `contrastRatio()` do UNBSTYPE (`constants.ts`)
- **3.4 Gradientes**: cards de gradiente com ângulo e stops editáveis

### 4. Tipografia (2 slides)
- **4.1 Fontes**: cards de typeface com seletor (mesmo catálogo do UNBSTYPE) + preview ao vivo
- **4.2 Hierarquia**: tabela editável H1→Caption com size/weight/line-height/tracking

### 5. Elementos Gráficos (2 slides)
- **5.1 Linguagem visual**: formas base, corner radius, espessura de traço
- **5.2 Ícones**: estilo (linha/preenchido), tamanho padrão, stroke

### 6. Layout e Grid (2 slides)
- **6.1 Espaçamento**: visualização token grid (4/8/16/24…)
- **6.2 Grid responsivo**: mobile (4 col) / tablet (8 col) / desktop (12 col) com preview visual

### 7. Tom de Voz (1 slide)
- Dos/Donts chips editáveis + templates de mensagem

### 8. Aplicações (1 slide)
- Grid de mockups usando templates do UNBSMOCKUP — seletor de templates + mini preview

### 9. Entregáveis (1 slide)
- Checklist visual + botões de export: brand.json, tokens.json, PDF (print window)

---

## Integrações com Ferramentas Existentes

| Recurso Reutilizado | Origem | Como |
|---|---|---|
| `hexToRgb`, `rgbToCmyk`, `rgbToHsl`, `findReferenceMatches` | `unbscolor/utils/colorMath.ts` | Import direto — valores HEX/RGB/CMYK/HSL nos cards de cor |
| `contrastRatio`, `loadGoogleFont`, `FONTS` | `unbstype/constants.ts` | Import direto — tabela A11y e seletor de fontes tipográficas |
| `extractColorsFromSvg`, `extractDominantColors` | `unbscolor/utils/imageExtraction.ts` | Extrai paleta ao fazer upload do logo SVG |
| Templates do UNBSMOCKUP | `unbsmockup/templates.ts` | Referência por ID; preview miniaturizado dos mockups selecionados |
| Grid engine do UNBSGRID | `unbsgrid/lib/svg-engine.ts` | Análise geométrica do SVG do logo na página de Construção |

Nenhum código das ferramentas-filhas precisa ser modificado — tudo é import.

---

## UI — ManualViewer

O componente central usa um canvas 16:9 (aspect-ratio: 16/9) com scroll horizontal de slides. A sidebar esquerda lista os capítulos (colapsáveis, usando o padrão Collapsible do Radix já usado em outros módulos). Cada slide tem:

- **PageSlide**: fundo branco, padding interno de 48px (simulando margem de página)
- **Grid base de 8pt** como referência de layout
- **EditableText**: qualquer `<span>` ou `<h>` clicável vira input ao clicar (double-click to edit pattern)

### Navegação

```text
[Sidebar: capítulos colapsáveis]  |  [Slide atual em 16:9]  |  [Miniaturas de slides]
```

Teclas ← → para navegar entre slides; ou clique nas miniaturas.

---

## ExportService

- **brand.json**: serializa o `BrandData` completo
- **tokens.json**: extrai spacing[], colors[], typography[], radius[]
- **PDF**: `window.print()` com CSS de print — cada slide em `@page { size: landscape }`

---

## Registro no Hub

Três arquivos tocados fora do diretório `unbsid/`:

1. **`src/App.tsx`**: adicionar `import UnbsId from "./pages/UnbsId"` e `<Route path="/unbsid/*" element={<UnbsId />} />`
2. **`src/pages/UnbsId.tsx`**: wrapper `ToolLayout` (padrão dos outros)
3. **`src/pages/Index.tsx`**: adicionar card da ferramenta com ícone `BookOpen` da lucide

---

## Arquivos a Criar

| Arquivo | Descrição |
|---|---|
| `src/tools/unbsid/index.tsx` | Re-export |
| `src/tools/unbsid/App.tsx` | Orquestrador principal |
| `src/tools/unbsid/types.ts` | BrandData e todos os tipos |
| `src/tools/unbsid/components/ManualViewer.tsx` | Canvas 16:9 + navegação de slides |
| `src/tools/unbsid/components/ChapterNav.tsx` | Sidebar de capítulos colapsáveis |
| `src/tools/unbsid/components/PageSlide.tsx` | Wrapper de slide |
| `src/tools/unbsid/components/EditableText.tsx` | Double-click para editar inline |
| `src/tools/unbsid/components/ColorEntry.tsx` | Card de cor com HEX/RGB/CMYK integrado |
| `src/tools/unbsid/components/FontSelector.tsx` | Seletor tipográfico (catalogo UNBSTYPE) |
| `src/tools/unbsid/components/ExportPanel.tsx` | Painel de exportação |
| `src/tools/unbsid/chapters/CoverPage.tsx` | Slide de capa |
| `src/tools/unbsid/chapters/IntroPage.tsx` | Slide de introdução |
| `src/tools/unbsid/chapters/LogoPage.tsx` | Slides de logo (5 sub-páginas) |
| `src/tools/unbsid/chapters/ColorsPage.tsx` | Slides de cores (4 sub-páginas) |
| `src/tools/unbsid/chapters/TypographyPage.tsx` | Slides de tipografia |
| `src/tools/unbsid/chapters/GraphicsPage.tsx` | Slides de elementos gráficos |
| `src/tools/unbsid/chapters/LayoutPage.tsx` | Slides de layout/grid |
| `src/tools/unbsid/chapters/VoicePage.tsx` | Slide de tom de voz |
| `src/tools/unbsid/chapters/ApplicationsPage.tsx` | Slide de aplicações |
| `src/tools/unbsid/chapters/DeliverablesPage.tsx` | Slide de entregáveis + export |
| `src/tools/unbsid/services/exportService.ts` | brand.json + tokens.json |
| `src/pages/UnbsId.tsx` | Wrapper de página com ToolLayout |

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Import + Route para `/unbsid/*` |
| `src/pages/Index.tsx` | Adicionar card UnbsID com ícone BookOpen |

---

## Ordem de Execução

1. Criar `types.ts` com toda a estrutura de dados
2. Criar `services/exportService.ts`
3. Criar componentes base: `EditableText`, `PageSlide`, `ColorEntry`, `FontSelector`
4. Criar todos os capítulos (chapters/*.tsx)
5. Criar `ManualViewer.tsx` e `ChapterNav.tsx`
6. Criar `App.tsx` orquestrador
7. Criar `index.tsx`
8. Criar `src/pages/UnbsId.tsx`
9. Modificar `src/App.tsx` e `src/pages/Index.tsx`
