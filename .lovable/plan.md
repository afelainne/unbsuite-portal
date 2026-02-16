
# Alinhar Visual do UNBSCOLOR ao Tema Oficial e Unificar Controles

## Resumo
Duas frentes de trabalho:
1. Aplicar o tema oficial (`#E8E8E3` fundo, `#232323` texto, `#F0FF00` destaques) ao UNBSCOLOR, que atualmente usa fundo branco puro
2. Fazer os sliders e switches do UNBSGRID ficarem visualmente identicos aos do UNBSCOLOR (track fino de 2px, thumb preto circular pequeno)

---

## 1. Tema do UNBSCOLOR

O UNBSCOLOR usa `bg-white text-black` em todo o app. Precisa mudar para o fundo `#E8E8E3` e aplicar `#F0FF00` nos botoes ativos e destaques.

### Mudancas em `src/tools/unbscolor/App.tsx`
- Linha 577: trocar `bg-white` por fundo `#E8E8E3`
- Header (linha 699): trocar `bg-white/95` por `rgba(232,232,227,0.95)`
- Botoes ativos das tabs (linha 714-719): quando ativo, usar `border-[#F0FF00]` em vez de `border-black`
- Botoes de acao como "Randomize Color" e "Search Reference" (linhas 920-928): hover com `#F0FF00` bg + `#232323` texto em vez de `bg-black text-white`
- Settings panel (linha 581): trocar `bg-white` por `#E8E8E3`, bordas ajustadas
- Toggles ativos no settings: usar `#F0FF00` em vez de `bg-black`
- Footer (linha 974): borda ajustada para `#D0D0C8`

### Mudancas em `src/tools/unbscolor/components/PaletteBuilder.tsx`
- Botoes "Randomize" e "Use Pantone": hover com `#F0FF00` em vez de `bg-black`
- Botoes ativos (useReference): `#F0FF00` bg + `#232323` texto em vez de `bg-black text-white`

### Mudancas em `src/tools/unbscolor/components/InfoGrid.tsx`
- Fundo dos sliders ja esta ok (customizado com CSS inline), apenas ajustar o thumb para `#232323`

## 2. Sliders e Switches do UNBSGRID

O UNBSGRID usa o componente Radix `<Slider>` com track grosso (h-2 = 8px) e thumb grande (h-5 w-5 = 20px). O UNBSCOLOR usa `<input type="range">` nativo com track de 2px e thumb de 16px (w-4 h-4) preto.

### Mudanca em `src/tools/unbsgrid/components/ui/slider.tsx`
Trocar o visual do Slider Radix para:
- Track: `h-[2px]` em vez de `h-2` (8px -> 2px)
- Track bg: `#D0D0C8` (tom do tema)
- Range fill: `#232323` (preto)
- Thumb: `w-4 h-4` (16px), `bg-[#232323]`, border removido, sem anel de foco invasivo

### Mudanca em `src/tools/unbsgrid/components/ui/switch.tsx`
Trocar o visual do Switch para:
- Quando checked: fundo `#F0FF00` em vez de `foreground/60`
- Thumb: `#232323` quando checked, branco quando unchecked
- Tamanho mais compacto: `h-5 w-9` em vez de `h-6 w-11`

---

## Secao Tecnica - Detalhes

### `src/tools/unbscolor/App.tsx`
| Local | De | Para |
|---|---|---|
| Linha 577 container | `bg-white text-black` | `text-[#232323]` + `style={{ backgroundColor: '#E8E8E3' }}` |
| Linha 699 header | `bg-white/95` | `style={{ backgroundColor: 'rgba(232,232,227,0.95)' }}` |
| Linhas 714-719 tabs ativas | `border-black text-black` | `border-[#232323] text-[#232323]` (ou `#F0FF00` border-bottom para ativa) |
| Linhas 920, 926 botoes acao | `hover:bg-black hover:text-white` | `hover:bg-[#F0FF00] hover:text-[#232323]` |
| Linha 581 settings panel | `bg-white` | `bg-[#E8E8E3]` |
| Linhas 629 toggles settings | `bg-black` quando ativo | `bg-[#F0FF00]` quando ativo |
| Linha 603 language btns | `bg-black text-white` quando ativo | `bg-[#F0FF00] text-[#232323]` |

### `src/tools/unbsgrid/components/ui/slider.tsx`
```tsx
<SliderPrimitive.Track className="relative h-[2px] w-full grow overflow-hidden rounded-full" style={{ backgroundColor: '#D0D0C8' }}>
  <SliderPrimitive.Range className="absolute h-full" style={{ backgroundColor: '#232323' }} />
</SliderPrimitive.Track>
<SliderPrimitive.Thumb className="block h-4 w-4 rounded-full shadow-sm transition-colors focus-visible:outline-none" style={{ backgroundColor: '#232323' }} />
```

### `src/tools/unbsgrid/components/ui/switch.tsx`
```tsx
<SwitchPrimitives.Root style checked -> bg #F0FF00, unchecked -> bg #D0D0C8>
  <SwitchPrimitives.Thumb style checked -> bg #232323, unchecked -> bg white>
```

### `src/tools/unbscolor/components/PaletteBuilder.tsx`
- Botao "Randomize" (linha ~143): `hover:bg-[#F0FF00] hover:text-[#232323]`
- Botao "Use Pantone" ativo: `bg-[#F0FF00] text-[#232323]`
- Botao batch show/hide ativo: `bg-[#F0FF00] text-[#232323]`

### Impacto
- Zero mudanca funcional -- apenas cores e dimensoes visuais
- Sliders e switches ficam identicos entre os dois apps
- Tema `#E8E8E3`/`#232323`/`#F0FF00` consistente em ambos
