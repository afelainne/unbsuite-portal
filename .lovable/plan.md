

# Correcao e Expansao do UNBSMOCKUP

## Problemas Identificados

1. **Templates sociais bugados**: O Twitter/X Post tem icones na posicao y=274 com viewBox de altura 280, cortando os icones. O Facebook Post tem icones na y=334 com viewBox de 360, tambem apertados.
2. **Cards de preview muito grandes**: Padding p-3, grid 2 colunas, preview com maxHeight 60px ocupam espaco excessivo.
3. **Categorias nao colapsaveis**: Com 23+ templates, a lista fica muito longa e dificil de navegar.
4. **Poucos templates**: Faltam variantes populares.

## Solucao

### A) Correcao dos templates sociais bugados

**Twitter/X Post**: Aumentar viewBox para `0 0 500 300` (era 280), mover icones para y=284, ajustar screen height para 210. Isso da espaco para os icones renderizarem sem corte.

**Facebook Post**: Verificar que os icones de like/comment/share estao dentro do viewBox com margem. Ajustar viewBox para `0 0 500 380` se necessario.

### B) TemplatePicker colapsavel + cards menores

- Usar `Collapsible` do Radix (ja disponivel em `src/components/ui/collapsible.tsx`)
- Cada categoria sera um `Collapsible` com seta de toggle
- Categoria do template selecionado fica aberta por padrao
- Grid muda de `grid-cols-2` para `grid-cols-3`
- Padding do card reduz de `p-3` para `p-1.5`
- maxHeight do SVG preview reduz de `60px` para `36px`
- Nome do template reduz de `text-[10px]` para `text-[8px]`
- Remove `aspect-[4/3]` e `mb-2` para compactar

### C) Novos templates (adicionar ~15 mais)

**Mobile (novos):**
- Google Pixel (390x844, camera pill centralizada, bordas finas)
- Samsung Galaxy (392x850, camera punch-hole canto, bordas minimas)

**Laptop (novo):**
- Chromebook (880x560, bordas arredondadas, sem trackpad, camera centralizada)

**Tablet (novo):**
- Android Tablet (800x534, bordas finas, camera lateral)

**Web (novos):**
- Safari Browser (bordas arredondadas, barra unificada cinza clara)
- Firefox Browser (barra compacta, tabs arredondadas)

**Social (novos):**
- LinkedIn Post (500x360, header corporativo, botoes Like/Comment/Repost/Send)
- TikTok Video (360x640, icones laterais de coracao/comment/share/bookmark)
- Pinterest Pin (340x510, borda arredondada, botao Save vermelho)
- WhatsApp Status (360x640, header verde com seta e info)
- Threads Post (500x300, estilo similar ao Twitter mas com bordas mais suaves)
- Dribbble Shot (400x300, borda rosa, 4:3)

**Print (novos):**
- A4 Landscape (594x420, margem de seguranca)
- Letter Size (510x660, US standard)
- CD Cover (480x480, jewel case com bordas)

**Wearable (novo):**
- Fitness Band (180x400, tela longa e estreita)

Total estimado: ~23 existentes + ~15 novos = ~38 templates

---

## Arquivos Modificados

### `src/tools/unbsmockup/templates.ts`
- Corrigir viewBox e posicao dos icones no Twitter/X Post (viewBox `0 0 500 300`)
- Corrigir Facebook Post se necessario
- Adicionar ~15 novos templates com SVG frames detalhados
- Adicionar icones `send`, `repost`, `save` ao SVG_ICONS para LinkedIn/TikTok/Pinterest
- Adicionar editableFields para novos templates sociais (LinkedIn, TikTok, etc.)

### `src/tools/unbsmockup/components/TemplatePicker.tsx`
- Importar `Collapsible, CollapsibleTrigger, CollapsibleContent` de `@/components/ui/collapsible`
- Cada categoria vira um Collapsible com ChevronDown animado
- Grid muda para 3 colunas
- Cards ficam compactos: padding `p-1.5`, preview max `36px`, texto `text-[8px]`
- Categoria do template selecionado abre automaticamente

### `src/tools/unbsmockup/components/DeviceFrame.tsx`
- Sem mudancas necessarias (ja suporta editableFields e avatarSrc)

### `src/tools/unbsmockup/App.tsx`
- Sem mudancas necessarias

---

## Resumo Tecnico

| Arquivo | Mudanca |
|---------|---------|
| `templates.ts` | Corrigir Twitter/Facebook viewBox/icones, +15 novos templates, novos SVG_ICONS |
| `TemplatePicker.tsx` | Collapsible por categoria, grid 3 cols, cards compactos |

## Ordem de Execucao

1. Corrigir templates bugados (Twitter, Facebook)
2. Adicionar novos SVG_ICONS e templates
3. Refatorar TemplatePicker com Collapsible e cards menores

