
# Correcoes no UnbsID: Cards de Cores no padrao UNBSCOLOR + Grid de Logo real via UNBSGRID

## Problema 1 — Cards de cores nao seguem o padrao do Multi-Slot do UNBSCOLOR

### O que esta errado
O `ColorEntryCard` do UnbsID exibe os codigos de cor (RGB, HSL, CMYK) escondidos atras de um botao "Ver codigos" (collapsed). Isso diverge do padrao estabelecido no `BatchAnalyzer.tsx` do UNBSCOLOR, onde:
- O swatch de cor e maior e quadrado
- Os codigos HEX, RGB, CMYK, HSL ficam sempre **visiveis** numa caixa `bg-white/50 p-5 rounded-xl border`
- O estilo e `font-mono text-[11px] text-gray-500`
- HEX aparece em `font-bold text-black/80`
- CMYK separado visualmente do RGB/HSL
- O nome da cor usa `getClosestColorName` para mostrar nome natural

### Solucao — Refatorar `ColorEntryCard.tsx`
Substituir o card atual pelo padrao do Multi-Slot:

**Estrutura do novo card:**
```
[Swatch grande h-24 com color picker no hover]
[Nome editavel + role badge]
[Caixa de codigos sempre visivel (bg-white/50 rounded-xl)]
  HEX bold em destaque
  RGB: r, g, b
  CMYK: c, m, y, k
  HSL: h°, s%, l%
[usageNote editavel em italico]
```

**Mudancas no `src/tools/unbsid/components/ColorEntryCard.tsx`:**
- Remover o toggle "Ver codigos" / `expanded` state
- Exibir HEX, RGB, CMYK, HSL **sempre visiveis** na caixa com estilo `bg-white/50 p-4 rounded-xl border border-black/5`
- HEX recebe destaque: `font-bold text-foreground text-[13px]`
- RGB, CMYK, HSL em `font-mono text-[10px] text-muted-foreground`
- Swatch aumenta de `h-20` para `h-24`
- Adicionar campo `usageNote` editavel (EditableText) abaixo dos codigos
- O `AddColorButton` permanece igual

---

## Problema 2 — Grid do logo nao usa o UNBSGRID real

### O que esta errado
O slide `grid` do `LogoPage.tsx` usa apenas um CSS `background-image` com `linear-gradient` para simular um grid — nao existe analise geometrica real, nao usa Paper.js, nao usa os renderers do UNBSGRID.

### Solucao — Novo componente `LogoGridCanvas.tsx` + slide de grid expandido

A solucao tem dois niveis:

**A) Componente `LogoGridCanvas.tsx`**

Um novo componente `src/tools/unbsid/components/LogoGridCanvas.tsx` que:
- Aceita `svgContent: string` e `preset: GeometryPreset`
- Usa um `<canvas>` + `paper.setup()` para renderizar o SVG + overlay geometrico
- Importa diretamente `parseSVG` do `unbsgrid/lib/svg-engine.ts`
- Importa os renderers do `unbsgrid/components/renderers/index.ts`
- Aplica as opcoes e estilos do `GeometryPreset` selecionado
- Suporta fundo claro (white) adequado para o manual

**Importante:** O `PreviewCanvas` do UNBSGRID tem toda a logica de zoom/pan/toolbar que nao e adequada para embed no manual. O `LogoGridCanvas` sera uma versao **lite** e sem toolbar, apenas o canvas de renderizacao.

**B) Slide de Grid expandido no `LogoPage.tsx`**

O slide `grid` sera reformulado com:
- Upload do SVG do logo (se nao houver o do variant primary)
- **Seletor de preset**: grid de botoes com os 13 presets do `getBuiltinPresets()` — Verificacao Rapida, Proporcao Aurea, Anatomia Estrutural, Equilibrio & Simetria, Grid & Espacamento, Tipografia & Baseline, Manual de Marca, Geometria Avancada, Apresentacao, Fluxo Dinamico, Circulos Construtivos, Diagonal & Perspectiva, Skeleton & Curvas
- Canvas 16:9 com o logo + overlay do preset ativo
- Parametros editaveis do grid (gridType, gridUnits, keyRatios)
- Badge do preset ativo com descricao

---

## Arquivos a Modificar / Criar

| Arquivo | Acao | Mudanca |
|---------|------|---------|
| `src/tools/unbsid/components/ColorEntryCard.tsx` | Modificar | Remover toggle, exibir todos os codigos sempre visiveis no padrao UNBSCOLOR |
| `src/tools/unbsid/components/LogoGridCanvas.tsx` | Criar | Canvas lite Paper.js com preset UNBSGRID aplicado ao SVG do logo |
| `src/tools/unbsid/chapters/LogoPage.tsx` | Modificar | Slide `grid` usa LogoGridCanvas + seletor de 13 presets do UNBSGRID |

---

## Detalhes tecnicos do LogoGridCanvas

O componente:
1. Recebe `svgContent: string` (o SVG inline do logo) e `preset: GeometryPreset`
2. Cria um `<canvas>` via `useRef`, chama `paper.setup(canvas)` no `useEffect`
3. Importa `parseSVG` de `../../unbsgrid/lib/svg-engine` para analisar o SVG
4. Importa todos os renderers de `../../unbsgrid/components/renderers`
5. Executa a logica de escala/posicao igual ao `PreviewCanvas` original (sem zoom/pan)
6. Aplica cada renderer habilitado no `preset.geometryOptions` com os estilos do `preset.geometryStyles`
7. Fundo branco por default (adequado para o manual de identidade)
8. Re-renderiza quando `svgContent` ou `preset` mudam

O canvas fica embutido no slide do manual em 16:9, ocupando a area esquerda (~65%), enquanto o seletor de presets fica na coluna direita (~35%).

### Seletor de Presets

Grid de cards compactos para os 13 presets builtin:
- Card ativo: borda colorida com `border-primary`
- Cada card mostra: nome do preset, descricao curta
- Ao clicar, muda o `activePreset` e re-renderiza o canvas
- Badges coloridos indicando o tipo de analise

---

## Ordem de execucao

1. Refatorar `ColorEntryCard.tsx` — remover toggle, exibir codigos sempre visiveis
2. Criar `LogoGridCanvas.tsx` — canvas lite com Paper.js + renderers do UNBSGRID
3. Modificar `LogoPage.tsx` slide `grid` — integrar LogoGridCanvas + seletor de presets
