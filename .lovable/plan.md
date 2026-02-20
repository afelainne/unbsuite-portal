
# UnbsID — Correções Completas: Layout, Minimalismo, Upload Universal e Drag-to-Move

## Diagnóstico dos Problemas

### 1. Conteúdo cortado (principal causa)
O `PageSlide` tem `aspectRatio: '16/9'` **dentro** do próprio componente, e o `ManualViewer` também envolve o slide com `aspectRatio: '16/9'`. Isso cria **duplo aspect-ratio**: o `PageSlide` é forçado a ter proporção 16:9 mas já está dentro de um container 16:9 — resultado: o conteúdo interno usa `h-full` que aponta para a altura real do elemento (que é calculada pela proporção) mas os layouts com `flex flex-col` e `flex-1` fazem overflow.

**Solução:** O `PageSlide` deve ser um container simples `w-full h-full absolute inset-0` sem definir seu próprio `aspectRatio`. Só o wrapper externo no `ManualViewer` mantém o `aspectRatio: 16/9`.

### 2. Templates "horríveis" — estética minimalista
- O tema **Bold** tem fundo amarelo `#FFF500` para os slides — ilegível e feio.
- O tema **Pastel** tem fundo `#FDF8FF` (lilás) que fica visualmente pesado.
- O decorator (número 80px) é muito intrusivo.
- Os cards de cor têm bordas muito pesadas.
- Os layouts de capas `diagonal` e `magazine` são excessivamente barrocos.

**Solução:** Refinar todos os 8 temas com estética minimalista: slides sempre com fundo **branco ou quase-branco** (exceto Tech/Neon que são dark por natureza). Capas mantêm as variações visuais ricas, mas os **slides internos** são clean e tipográficos. Decorator opacity reduzida para `0.03` no máximo.

### 3. Upload faltando no slide de Grid
No slide `grid` do `LogoPage`, quando não há SVG, aparece uma mensagem de texto — mas não há um **botão de upload de SVG** visível. O usuário precisa ir para o slide "Galeria" para fazer upload. Isso é não-intuitivo.

**Solução:** Adicionar zona de upload de SVG direto no slide `grid`, que ao receber o arquivo atualiza `logoVariants` com `svgContent` e `dataUrl` como na `VariantCard`.

### 4. Drag-to-move nos elementos dos slides
Os elementos de texto e logos ficam em posições fixas. O usuário quer poder reposicionar elementos dentro do slide.

**Solução:** Adicionar um sistema simples de drag-to-move com `position: absolute` e estado de posição salvo no `BrandData`. Criar um hook `useDraggable` que retorna handlers de `onMouseDown` e aplica `transform: translate(x, y)`. Implementar nos blocos principais da capa (logo, título, tagline) e nos slides de introdução.

---

## Arquitetura das Correções

### A) Fix crítico: `PageSlide` e altura dos slides

**`PageSlide.tsx`:** Remover `aspectRatio` de dentro do componente. O slide passa a ser `position: absolute; inset: 0` para preencher o container pai que já tem 16:9.

**`ManualViewer.tsx`:** Mantém o wrapper com `aspectRatio: '16/9'` e `position: relative`. O `PageSlide` preenche com `absolute inset-0`.

Todos os layouts de capítulo devem usar a estrutura:
```tsx
<div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
  {/* conteúdo */}
</div>
```
Em vez de:
```tsx
<div className="h-full flex flex-col gap-5">  {/* PROBLEMA: h-full sem referência */}
```

### B) Temas refinados — estética minimalista

Os **slides internos** de todos os temas passam a ter fundo **neutro/branco**:

| Tema | Slide BG (antes) | Slide BG (depois) |
|------|-----------------|-------------------|
| Studio | #FFFFFF | #FFFFFF (inalterado) |
| Luxe | #F5F0E8 | #FAFAF8 |
| Tech | #141414 | #0F0F0F (mantém dark) |
| Pastel | #FDF8FF | #FDFCFF |
| **Bold** | **#FFF500** | **#FFFFFF** |
| Editorial | #FFFFFF | #FFFFFF (inalterado) |
| Neon | #0D0D0D | #0D0D0D (mantém dark) |
| Eco | #F9F4EC | #F8F5EF |

Capas mantêm seus fundos expressivos — elas são o "cartão de visita".

Decorator opacity: máximo `0.03`, reduzido de `0.04-0.10`.

Cards internos: bordas `1px solid` com `opacity: 0.06` — bem discretas.

### C) Upload universal de logo

No slide `grid`, adicionar uma zona de upload de arquivo `.svg` que funciona da mesma forma que `VariantCard`:
- Lê o SVG como texto (para `svgContent`) E como dataURL
- Atualiza o variant `primary` com os dados
- Exibe o canvas imediatamente após upload

Também adicionar upload no slide `clearspace` (para mostrar o logo real no exemplo de área de proteção) e `donts`.

### D) Hook `useDraggable` — mover elementos

Criar um hook simples:

```typescript
// src/tools/unbsid/hooks/useDraggable.ts
interface DragPos { x: number; y: number }

function useDraggable(
  initial: DragPos,
  onPositionChange: (p: DragPos) => void
) {
  // retorna { style, onMouseDown }
  // usa mousemove/mouseup no document durante drag
}
```

Adicionar ao `BrandData` um campo `elementPositions: Record<string, {x: number, y: number}>` para persistir posições dos elementos.

Aplicar nos elementos da **Capa** (logo, título, tagline, metadata) e no slide de **Introdução** (objetivo, benefícios).

Um ícone de drag `⠿` (GripVertical) aparece no hover de cada elemento arrastável.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/tools/unbsid/components/PageSlide.tsx` | Remover `aspectRatio` interno; usar `absolute inset-0` |
| `src/tools/unbsid/components/ManualViewer.tsx` | Manter apenas o wrapper externo com `aspectRatio: 16/9 relative` |
| `src/tools/unbsid/themes.ts` | Refinar slideBackground de Bold/Pastel/Luxe/Eco; reduzir decoratorOpacity |
| `src/tools/unbsid/types.ts` | Adicionar `elementPositions?: Record<string, {x: number, y: number}>` |
| `src/tools/unbsid/hooks/useDraggable.ts` | Criar hook de arrastar elementos |
| `src/tools/unbsid/chapters/CoverPage.tsx` | Aplicar useDraggable nos blocos de logo/título/tagline |
| `src/tools/unbsid/chapters/LogoPage.tsx` | Adicionar zona de upload de SVG no slide `grid`; upload também em `clearspace` |
| `src/tools/unbsid/chapters/IntroPage.tsx` | Fix layout com `absolute inset-0`; aplicar drag nos blocos |
| `src/tools/unbsid/chapters/ColorsPage.tsx` | Fix layout; cards de cor mais compactos no espaço correto |
| `src/tools/unbsid/chapters/TypographyPage.tsx` | Fix layout |
| `src/tools/unbsid/chapters/GraphicsPage.tsx` | Fix layout |
| `src/tools/unbsid/chapters/LayoutPage.tsx` | Fix layout |
| `src/tools/unbsid/chapters/VoicePage.tsx` | Fix layout |
| `src/tools/unbsid/chapters/ApplicationsPage.tsx` | Fix layout |
| `src/tools/unbsid/chapters/DeliverablesPage.tsx` | Fix layout |

---

## Detalhamento do Fix de Layout

### Problema raiz — duplo aspect-ratio

Situação atual:
```
ManualViewer: <div style="aspectRatio: 16/9"> ← define altura
  PageSlide: <div style="aspectRatio: 16/9; position: relative"> ← REDEFINE altura = 0 ou overflow
    <div className="h-full">  ← h-full aponta para o PageSlide interno (altura calculada como 0)
```

Correção:
```
ManualViewer: <div style="aspectRatio: 16/9; position: relative"> ← define altura
  PageSlide: <div style="position: absolute; inset: 0; overflow: hidden"> ← preenche
    <div className="absolute inset-0 px-10 py-8">  ← layout com padding
```

### Mudança em cada capítulo

Todos os slides passam de:
```tsx
<PageSlide theme={theme}>
  <div className="h-full flex flex-col gap-5">
```

Para:
```tsx
<PageSlide theme={theme}>
  <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
```

Isso garante que o espaço disponível é **todo o slide** (menos padding) e nada transborda.

O grande número decorativo (watermark) muda de `absolute bottom-8 right-10` (correto) para `absolute bottom-6 right-8` com tamanho reduzido para `text-[60px]`.

---

## Detalhamento do Sistema de Drag

### `useDraggable` hook

```typescript
export function useDraggable(key: string, positions: Record<string, {x:number,y:number}>, onSave: (k: string, p: {x:number,y:number}) => void) {
  const pos = positions?.[key] ?? { x: 0, y: 0 };
  // mouse handlers para mover
  // retorna: style com transform, onMouseDown, isDragging
}
```

### Aplicação na Capa (exemplo)

```tsx
// No CoverPage — bloco do logo na capa split
const { style: logoStyle, onMouseDown: logoDragStart } = useDraggable(
  'cover-logo', data.elementPositions ?? {}, 
  (k, p) => onChange({ elementPositions: { ...data.elementPositions, [k]: p } })
);

<div style={logoStyle} onMouseDown={logoDragStart} className="group cursor-move">
  <GripVertical className="opacity-0 group-hover:opacity-30 absolute -left-4 top-1/2 -translate-y-1/2 h-3 w-3" />
  {/* logo content */}
</div>
```

### Quais elementos são draggable

- **Capa**: bloco do logo, bloco de título+tagline, bloco de metadata (versão/estúdio)
- **Introdução**: bloco de objetivo, bloco de benefícios
- **Logo > Galeria**: não — os cards ficam no grid
- Outros slides: não draggable nesta iteração (foco na capa e intro que têm mais liberdade criativa)

---

## Estética Minimalista — Refinamentos Adicionais

### Tipografia dos slides internos
- Títulos de capítulo: `text-lg font-semibold` (menor que o atual `text-2xl font-bold`)
- Labels de seção: `text-[9px] font-mono uppercase tracking-[0.2em] opacity-40`
- Corpo: `text-[11px]` (menor, mais editorial)

### Cards de cor
- Swatch: `h-16` (menor que `h-24`) — mais compacto dentro do slide 16:9
- Bloco de códigos: `text-[9px]` para RGB/HSL/CMYK, `text-[11px]` apenas para HEX
- Remover `shadow-sm` — zero-elevation no espírito minimalista

### Preset selector no Grid de Logo
- Substituir os cards coloridos por uma lista clean de texto com `text-[9px]` e linha sublinhada no ativo
- Sem cores de categoria nos itens não-ativos — apenas texto `opacity-50`

---

## Ordem de Execução

1. **Fix `PageSlide.tsx`** — remover `aspectRatio` interno (correção crítica que afeta tudo)
2. **Fix `ManualViewer.tsx`** — `position: relative` no wrapper, `overflow: hidden`
3. **Refinar `themes.ts`** — Bold slides brancos, decoratorOpacity uniforme em `0.03`
4. **Criar `hooks/useDraggable.ts`** — hook simples de drag
5. **Atualizar `types.ts`** — campo `elementPositions`
6. **Fix de layout em todos os capítulos** (em paralelo):
   - `CoverPage.tsx` — layout + drag no logo/título
   - `IntroPage.tsx` — layout + drag
   - `LogoPage.tsx` — layout + upload SVG no slide grid
   - `ColorsPage.tsx` — layout + cards compactos
   - `TypographyPage.tsx` — layout
   - `GraphicsPage.tsx` — layout
   - `LayoutPage.tsx` — layout
   - `VoicePage.tsx` — layout
   - `ApplicationsPage.tsx` — layout
   - `DeliverablesPage.tsx` — layout
