
# Palette Magic: Lock de Cores, Paletas Realistas e Slots Configuráveis

## Problema Atual

1. **Sem lock de cores**: Ao dar shuffle, todas as 5 cores mudam. Não há como "travar" uma cor que o usuário gostou.
2. **Paletas muito RGB**: As cores são geradas puramente por rotação de hue + jitter aleatório, resultando em combinações que parecem artificiais e não remetem a paletas profissionais de design.
3. **Quantidade fixa de slots**: Cada card sempre gera exatamente 5 cores, sem possibilidade de alterar (3, 4, 5, 6 ou 7 cores por paleta).

## Solução

### 1. Sistema de Lock por Slot

Cada paleta terá um array `lockedSlots` (ex: `[false, true, false, false, false]`). Ao clicar num ícone de cadeado em cada swatch do card, aquela posição é travada. No próximo shuffle:

- Cores travadas permanecem no lugar
- Apenas cores não-travadas são regeneradas
- O estado de lock é mantido por paleta (cada card tem seus próprios locks)

**Estado novo no componente**:
- `lockedColors: Record<string, Record<number, string>>` -- mapa de `paletteId -> { slotIndex: hexColor }`

**UI**: Ícone de cadeado (aberto/fechado) sobre cada swatch na strip de cores do card. Clicar alterna o lock.

### 2. Paletas Realistas (Curadoria + Algoritmo Melhorado)

Em vez de depender apenas de rotação de hue, o sistema usará:

**a) Banco de paletas-semente curadas** (~30-40 paletas):
Paletas reais usadas em branding e design, cada uma com 5-7 cores. Exemplos:
- "Luxury Noir" (#1A1A2E, #16213E, #0F3460, #E94560, #FFFFFF)
- "Earthy Warm" (#2D1B14, #8B4513, #D2691E, #F4A460, #FAEBD7)
- "Nordic Frost" (#2E3440, #3B4252, #88C0D0, #D8DEE9, #ECEFF4)
- "Sunset Editorial" (#1B1B2F, #E43F5A, #FF6B6B, #FFC93C, #F9F7F7)
- Etc.

**b) Geração híbrida**: Cada shuffle mistura:
- 3-4 paletas derivadas do banco de sementes (com variação controlada)
- 3-4 paletas geradas por harmonia (algoritmo atual melhorado)
- 1-2 paletas baseadas nas cores do usuário

**c) Algoritmo melhorado**: Reduzir drasticamente o jitter (de +/-10 para +/-3), usar saturações mais contidas (não ultrapassar S:85 para brand, S:60 para editorial), e incluir sempre pelo menos um neutro (dark ou light) em cada paleta.

### 3. Seletor de Quantidade de Slots

Um controle acima do grid permite o usuário escolher quantas cores por paleta: 3, 4, 5, 6 ou 7.

- Exibido como botões compactos (pills) ao lado dos contextos
- O valor é passado para `generateShuffledBatch` como `slotCount`
- As paletas-semente são recortadas ou expandidas conforme o `slotCount`:
  - Se semente tem 5 e quer 3: pega as 3 cores mais representativas (maior spread de luminosidade)
  - Se semente tem 5 e quer 7: interpola 2 cores extras entre as existentes

## Detalhes Técnicos

### Arquivo: `src/tools/unbscolor/components/PaletteMagic.tsx`

**Novos estados**:
```text
slotCount: number (default 5, range 3-7)
lockedColors: Record<string, Record<number, string>>
```

**Novo array constante**: `CURATED_PALETTES` -- array de ~35 paletas com nome, cores e tags de contexto (brand, poster, ui, editorial, packaging).

**Funções novas**:
- `generateFromSeed(seed, slotCount)`: Pega uma paleta-semente, aplica variação mínima, ajusta ao slotCount
- `adaptToSlotCount(colors, target)`: Recorta ou interpola cores para atingir o número desejado
- `generateWithLocks(palette, lockedColors, slotCount, context)`: Gera nova paleta respeitando posições travadas

**Função `handleShuffle` atualizada**: Verifica locks de cada paleta existente. Para paletas com locks, regenera apenas slots não-travados. Para novas paletas (sem locks), gera do zero.

**UI changes**:
- Slot count selector (pills: 3, 4, 5, 6, 7) entre contextos e botão shuffle
- Ícone de lock em cada swatch do color strip (visível no hover, sempre visível se locked)
- Swatch locked tem borda dourada e ícone de cadeado fechado
- Swatch unlocked mostra cadeado aberto no hover

### Traduções necessárias em `translations.ts`

Adicionar à interface e aos 3 idiomas:
- `slots`: "Slots" / "Slots" / "Slots"
- `lockColor`: "Lock" / "Travar" / "Bloquear"  
- `unlockColor`: "Unlock" / "Destravar" / "Desbloquear"

## Resumo de Arquivos

| Arquivo | Ação |
|---|---|
| `src/tools/unbscolor/components/PaletteMagic.tsx` | Rewrite: locks, curated palettes, slot count |
| `src/tools/unbscolor/i18n/translations.ts` | Adicionar 3 novas chaves (slots, lockColor, unlockColor) |
