
# UnbsID — Melhorias Funcionais + Sistema de Temas de Design

## Analise das paginas atuais

Apos leitura completa de todos os capitulos, identifiquei as seguintes oportunidades:

### Capa (CoverPage)
- **Problema:** Layout fixo de 2 zonas (60/40). Sem variacao de estilo visual entre diferentes projetos.
- **Melhoria:** Aplicar o tema ativo (background, accentColor, fontFamily, borderRadius do tema) nos slides.

### Introducao (IntroPage)
- **Problema:** Os "beneficios fixos" (Consistencia, Agilidade, Escalabilidade) sao estaticos e nao editaveis.
- **Melhoria:** Tornar os bullets de beneficios editaveis inline com EditableText.

### Logo (LogoPage)
- **Problema:** Slide `donts` usa textos fixos hardcoded que nao sao editaveis.
- **Melhoria:** Tornar os `donts` editaveis (adicionar/remover via chips).

### Cores (ColorsPage)
- **Problema:** A paleta de neutros nao tem botao para adicionar/remover tons. O slide de gradientes nao permite editar angle ou color stops inline.
- **Melhorias:**
  - Adicionar `+` e `-` na paleta de neutros para escalar de 5 a 9 tons.
  - Adicionar inputs de angulo e color-picker de stops nos gradientes.
  - Na paleta principal mostrar preview de texto branco/preto sobre a cor.

### Tipografia (TypographyPage)
- **Problema:** Slide `typefaces` nao permite adicionar ou remover fontes. Nao tem preview editavel por fonte.
- **Melhorias:**
  - Botao `+ Fonte` para adicionar nova typeface.
  - Botao de remover em cada card de fonte.
  - Campo `previewText` editavel diretamente no preview grande.

### Elementos Graficos (GraphicsPage)
- **Ja esta razoavelmente funcional** — sem melhorias criticas identificadas.

### Layout & Grid (LayoutPage)
- **Problema:** Slide de grid responsivo e apenas visual/estatico, sem campos editaveis de colunas/gutter/margem.
- **Melhoria:** Tornar os valores de colunas, gutter e margem de cada breakpoint editaveis.

### Tom de Voz (VoicePage)
- **Problema:** Nao ha como adicionar novos templates de mensagem com contexto customizado.
- **Melhoria:** Botao `+ Template` que adiciona novo card com campo de contexto e exemplo editaveis.

### Aplicacoes (ApplicationsPage)
- **Problema:** Picker de mockup e uma lista plana sem categorias. Ao fechar o picker (clicar fora), ele nao fecha.
- **Melhorias:**
  - Picker agrupado por categoria (Mobile, Social, Web…).
  - Click-outside para fechar o picker.

### Entregaveis (DeliverablesPage)
- **Problema:** O checklist nao tem item para "Tema do manual definido" nem para "Tom de voz completo".
- **Melhoria:** Adicionar esses itens e incluir percentual de conclusao mais granular.

---

## Sistema de Temas

### Conceito

Um tema define a **estetica visual dos slides do manual**, nao dos dados da marca. O mesmo conteudo de marca pode ser apresentado em diferentes estilos visuais, tornando o manual mais adequado para diferentes segmentos (tech, luxo, editorial, minimal etc).

Cada tema controla:
- `bgColor` dos slides (fundo do slide 16:9)
- `accentColor` (cor dos headers, capitulos, marcas d'agua)
- `fontFamily` usada nos titulos e labels do manual (nao da marca)
- `borderRadius` dos cards e swatches
- `headingStyle` (uppercase bold / italic serif / light sans / etc.)
- `decoratorChar` (o numero grande da marca d'agua, ex: "01" vs "I" vs um simbolo)
- `slideLayout` (margin, padding padrao do PageSlide)
- `coverLayout` (variante de layout da capa: vertical, horizontal, diagonal, magazine)

### Temas Propostos (8 no total)

| # | Nome | Estetica | Cover | Fundo slides | Accent | Fonte manual |
|---|------|----------|-------|-------------|--------|-------------|
| 1 | **Studio** (default) | Minimalista industrial, sem serifas | Split 60/40 escuro | Branco puro | Preto | Inter |
| 2 | **Luxe** | Editorial de moda, alto contraste bege/preto | Vertical invertida, serif grande | Creme #F5F0E8 | Preto profundo #0A0A0A | Playfair Display |
| 3 | **Tech** | Interface escura tipo dark mode, detalhe neon | Horizontal com borda neon | Cinza escuro #141414 | Verde-limao #CCFF00 | JetBrains Mono / Inter |
| 4 | **Pastel** | Suave, startup SaaS, arredondado | Canto com formas suaves | Rosa/lavanda claros | Roxo suave | DM Sans |
| 5 | **Bold** | Tipografia expressiva, cores saturadas | Diagonal com grande tipografia | Amarelo vibrante #FFF500 | Preto | Space Grotesk |
| 6 | **Editorial** | Revista/jornal, colunas, reguas | Colunas com regua horizontal | Branco | Preto com detalhe vermelho | Merriweather |
| 7 | **Neon** | Cyberpunk/gaming, gradientes vivos | Fundo preto com gradiente neon | Preto #0D0D0D | Magenta/ciano | Rajdhani / Inter |
| 8 | **Eco** | Sustentavel, organico, tons de terra | Textura de papel, cor natural | Areia #F9F4EC | Verde escuro #2D4A2D | Lora |

### Estrutura de dados do tema

Sera adicionado ao `BrandData` (sem quebrar dados existentes):

```typescript
// Em types.ts — novo campo
themeId: string; // 'studio' | 'luxe' | 'tech' | 'pastel' | 'bold' | 'editorial' | 'neon' | 'eco'

// Novo arquivo: src/tools/unbsid/themes.ts
export interface ManualTheme {
  id: string;
  name: string;
  description: string;
  slideBackground: string;
  slideTextColor: string;
  accentColor: string;
  accentTextColor: string;
  headingFont: string;
  borderRadius: string;        // CSS value, ex: '0px' | '8px' | '16px'
  cardBackground: string;
  decoratorOpacity: number;    // ex: 0.03
  coverLayout: 'split' | 'centered' | 'diagonal' | 'magazine';
  coverBg: string;
  coverAccent: string;
}
```

### Como o tema e aplicado

- `PageSlide.tsx` recebera um prop opcional `theme?: ManualTheme` e aplicara o background, textColor e borderRadius.
- Os capitulos receberao `theme` via prop do `ManualViewer`, que le `data.themeId` e passa o tema resolvido para os slides.
- O selector de tema ficara na toolbar principal (App.tsx), com preview visual em mini-card.

---

## Arquivos a Modificar / Criar

| Arquivo | Acao | O que muda |
|---------|------|-----------|
| `src/tools/unbsid/themes.ts` | **Criar** | Definicao dos 8 temas com todos os tokens visuais |
| `src/tools/unbsid/types.ts` | **Modificar** | Adicionar campo `themeId: string` ao BrandData e DEFAULT_BRAND_DATA |
| `src/tools/unbsid/components/PageSlide.tsx` | **Modificar** | Aceitar prop `theme` e aplicar background, textColor, borderRadius do tema |
| `src/tools/unbsid/components/ManualViewer.tsx` | **Modificar** | Resolver tema pelo `data.themeId`, passar `theme` para cada slide |
| `src/tools/unbsid/components/ThemePicker.tsx` | **Criar** | Componente seletor de temas com preview visual de cada um |
| `src/tools/unbsid/App.tsx` | **Modificar** | Adicionar `ThemePicker` na toolbar (entre nome da marca e ExportPanel) |
| `src/tools/unbsid/chapters/CoverPage.tsx` | **Modificar** | Aplicar `coverLayout` do tema + alternativa `centered` e `magazine` |
| `src/tools/unbsid/chapters/IntroPage.tsx` | **Modificar** | Tornar bullets de beneficios editaveis |
| `src/tools/unbsid/chapters/ColorsPage.tsx` | **Modificar** | Adicionar +/- neutros, inputs editaveis no gradiente (angle + stops) |
| `src/tools/unbsid/chapters/TypographyPage.tsx` | **Modificar** | Adicionar/remover fontes, previewText editavel |
| `src/tools/unbsid/chapters/ApplicationsPage.tsx` | **Modificar** | Picker agrupado por categoria, click-outside fecha |
| `src/tools/unbsid/chapters/VoicePage.tsx` | **Modificar** | Botao `+ Template` com contexto customizado |
| `src/tools/unbsid/chapters/LogoPage.tsx` | **Modificar** | Slide `donts` com itens editaveis/removiveis |
| `src/tools/unbsid/chapters/DeliverablesPage.tsx` | **Modificar** | Novos itens no checklist + status de tema |

---

## Como sera o ThemePicker

Um dropdown/popover na toolbar com 8 cards de preview:

```text
[Studio] [Luxe] [Tech] [Pastel]
[Bold] [Editorial] [Neon] [Eco]
```

Cada card:
- Mini retangulo (60x40px) com o fundo do tema + uma linha de texto simulada
- Nome do tema abaixo
- Borda primary quando ativo
- Clique: `onChange({ themeId: theme.id })`

---

## Ordem de Execucao

1. Criar `themes.ts` com os 8 temas completos
2. Modificar `types.ts` — adicionar `themeId` ao BrandData e DEFAULT
3. Modificar `PageSlide.tsx` — prop `theme` com estilos aplicados via style inline
4. Modificar `ManualViewer.tsx` — resolver e passar tema para cada slide
5. Criar `ThemePicker.tsx` — seletor visual de temas
6. Modificar `App.tsx` — inserir ThemePicker na toolbar
7. Modificar `CoverPage.tsx` — suporte a `coverLayout` ('split'/'centered'/'magazine'/'diagonal')
8. Melhorias funcionais nos capitulos (em paralelo):
   - `IntroPage.tsx` — bullets editaveis
   - `ColorsPage.tsx` — +/- neutros, gradiente editavel
   - `TypographyPage.tsx` — adicionar/remover fontes
   - `ApplicationsPage.tsx` — picker categorizado + click-outside
   - `VoicePage.tsx` — + Template customizado
   - `LogoPage.tsx` — donts editaveis
   - `DeliverablesPage.tsx` — checklist expandido
