

# UNBSFONT: Plano de Revisao, Correcao e Melhoria

## Resumo da Situacao Atual

O UNBSFONT esta completo no repositorio com 47 arquivos, rota configurada e entrada no menu. Porem, ao abrir o app, o usuario vai direto para o Dashboard de projetos e depois para o modo COMPACT, sem opcao de escolher. Alem disso, existem problemas de coerencia entre os modos Compact e Advanced, regras tipograficas nao aplicadas de forma consistente, e bugs no kerning automatico.

---

## Problemas Identificados (linha por linha)

### 1. Ausencia de seletor de modo na entrada

**Arquivo:** `src/tools/unbsfont/App.tsx` (linhas 1294-1317)

Quando o usuario abre um projeto (screen === 'EDITOR'), o app verifica `editorMode` (linha 1299) e vai direto para COMPACT. Nao existe uma tela intermediaria para o usuario escolher entre Compact e Advanced.

**Correcao:** Criar um componente `ModeSelector` que aparece quando o usuario abre/cria um projeto. So depois de escolher, o app entra no modo selecionado.

---

### 2. Sincronizacao Compact <-> Advanced (state split)

**Arquivo:** `CompactEditor.tsx` (linhas 113-185)

O CompactEditor mantém estados locais de kerning (`kerning`, `kerningPairs`, `letterSpacing`, `wordSpacing`) com sincronizacao manual via `useEffect` e refs (`isLocalUpdateRef`, `lastSyncedMetadataRef`). Isso cria:

- **Risco de loops infinitos** (linhas 138-185): dois `useEffect` que leem e escrevem no metadata simultaneamente
- **Desincronizacao**: Quando o usuario edita kerning no CompactEditor, faz um hash JSON para verificar mudancas (linha 170-171), mas se o Advanced editar o mesmo metadata, o hash nao bate e sobrescreve

**Arquivo:** `EditorModal.tsx` (linha 53)

O EditorModal copia o glyph para `data` local (`useState(() => ensureKerningBias(glyph))`). Mudancas feitas no modal so sao propagadas via `onSave` ao clicar salvar. Se o usuario fechar sem salvar, perde tudo.

**Correcao:** 
- Remover estado local de kerning do CompactEditor; ler/escrever diretamente no metadata via `onUpdateMetadata`
- No EditorModal, auto-salvar via debounce ou salvar ao fechar (nao apenas por botao)

---

### 3. Kerning automatico com threshold muito alto

**Arquivo:** `kerningService.ts` (linha 237)

```typescript
if (Math.abs(adjusted) >= 15) {
```

Pares com kerning entre -14 e +14 sao descartados. Para fontes de texto, muitos pares uteis ficam nessa faixa.

**Correcao:** Reduzir para `>= 5` (ja usado em `generateCommonPairsKerning` na linha 322).

---

### 4. `sanitizeToken` mascara bugs de grupo

**Arquivo:** `kerningService.ts` (linha 30)

```typescript
const sanitizeToken = (value: string, fallback: string) => (value && value.length > 0 ? value : fallback);
```

Na resolucao de kerning (linhas 50-51), se um glyph nao tem grupo definido (`groups.right === ""`), o fallback e o proprio caractere. Isso faz com que pares de classe colidam com pares diretos de forma imprevisivel.

**Correcao:** Quando grupo vazio, nao tentar lookup por classe -- retornar 0 diretamente.

---

### 5. Filtro de kerning exclui digitos e pontuacao

**Arquivo:** `kerningService.ts` (linhas 183-186)

```typescript
const isAlpha = /[a-zA-Z]/.test(g.char);
return isAlpha;
```

Mesmo com `includeNumbers` e `includePunctuation` nas opcoes, o filtro ignora esses glyphs.

**Correcao:** Respeitar as flags `opts.includeNumbers` e `opts.includePunctuation` no filtro.

---

### 6. Referencia a `svgPathData` inconsistente

**Arquivos:** `App.tsx` (linhas 855, 871, 906), `kerningService.ts` (linha 180)

Alguns lugares verificam `g.svgPathData || g.pathData`, outros so `g.pathData`. O campo `svgPathData` e opcional no tipo `GlyphData` mas causa confusao.

**Correcao:** Unificar para sempre usar `g.pathData`. Remover referencias a `svgPathData` nos pontos de verificacao de "tem path". Manter `svgPathData` apenas como campo auxiliar de preservacao de fidelidade SVG na exportacao.

---

### 7. TestMode nao mostra placeholder para glyphs ausentes

**Arquivo:** `TestMode.tsx` (linhas 376-473)

Caracteres sem glyph definido simplesmente nao renderizam nada na area de preview. O usuario nao sabe que esta faltando um glyph.

**Correcao:** Renderizar um retangulo pontilhado ou um "?" como placeholder quando `getGlyph(char)` retorna null ou pathData vazio.

---

### 8. EditorModal nao sincroniza onSave automaticamente

**Arquivo:** `EditorModal.tsx` (linhas 52-53)

O modal usa estado local `data` e so salva quando o usuario clica em "Salvar". Se fechar o modal sem salvar, as alteracoes sao perdidas.

**Correcao:** Chamar `onSave` ao fechar o modal com as alteracoes pendentes, ou adicionar auto-save com debounce.

---

### 9. `handleAutoConfig` no CompactEditor sobrescreve metadata diretamente

**Arquivo:** `CompactEditor.tsx` (linhas 358-373)

```typescript
onUpdateMetadata(metadataUpdates); // Passa o objeto completo, nao o updater
```

Isso sobrescreve todo o metadata com o objeto local, potencialmente perdendo mudancas feitas em paralelo.

**Correcao:** Usar o padrao funcional `onUpdateMetadata(prev => ({ ...prev, ...updates }))`.

---

### 10. Regras tipograficas nao aplicadas visualmente

Nao ha indicadores visuais no grid/editor para:
- **Overshoot**: Glyphs redondos (O, C, e, o) que deveriam ultrapassar baseline/cap-height por ~2%
- **Consistencia de stems**: Variacao de espessura entre glyphs
- **Cap-height/x-height violations**: Glyphs que ultrapassam os limites

**Correcao:** Adicionar badges/indicadores visuais no GlyphCard e no EditorModal quando regras tipograficas sao violadas.

---

## Plano de Implementacao

### Fase 1: Seletor de Modo

Criar componente `ModeSelector.tsx` que aparece entre Dashboard e Editor:
- Dois cards: "Compact Editor" (simplificado, rapido) e "Advanced Editor" (grid completo, canvas vetorial)
- Descricao breve de cada modo
- Ao selecionar, define `editorMode` e prossegue

Modificar `App.tsx`:
- Adicionar state `showModeSelector` (true quando abre projeto)
- Renderizar ModeSelector antes de CompactEditor/Advanced
- Manter botoes de troca entre modos no header de cada editor

### Fase 2: Correcoes de Kerning

Arquivos afetados: `kerningService.ts`
- Linha 237: threshold `>= 15` para `>= 5`
- Linha 30: `sanitizeToken` retornar `undefined` se grupo vazio e pular lookup de classe
- Linhas 183-186: incluir digitos/pontuacao conforme flags

### Fase 3: Coerencia de State

Arquivos afetados: `CompactEditor.tsx`, `EditorModal.tsx`
- Remover estado local de kerning do CompactEditor; usar metadata diretamente
- EditorModal: auto-save ao fechar
- Unificar referencia `svgPathData` -> `pathData` em App.tsx e kerningService.ts
- Corrigir `handleAutoConfig` para usar updater funcional

### Fase 4: TestMode e Regras Tipograficas

Arquivos afetados: `TestMode.tsx`, `GlyphCard.tsx`
- Placeholder pontilhado para glyphs ausentes no TestMode
- Badges de aviso no GlyphCard para violacoes tipograficas (overshoot, stems)

### Fase 5: Menu e Integracao

O UNBSFONT ja esta no menu de tools do `Index.tsx` (linhas 21-27) com icone Type e label "NEW". A rota ja existe em `App.tsx` (linha 27). Nao e necessario alterar esses arquivos, apenas confirmar que o botao aparece corretamente no browser (pode ser cache).

---

## Detalhes Tecnicos

### Componente ModeSelector (novo)

```text
src/tools/unbsfont/components/ModeSelector.tsx

Props:
  - onSelectMode: (mode: 'COMPACT' | 'ADVANCED') => void
  - isDarkMode: boolean

Renderiza dois cards com icones e descricao.
Estilo seguindo o padrao visual do Dashboard (cards com border, hover, uppercase tracking).
```

### Alteracoes em App.tsx

```text
Linha 30: Adicionar 'MODE_SELECT' ao type Screen
Linha 356: handleCreateProject -> setScreen('MODE_SELECT') em vez de 'EDITOR'
Linha 368: handleOpenProject -> setScreen('MODE_SELECT') em vez de 'EDITOR'

Novo bloco entre Dashboard e Editor (antes da linha 1294):
  if (screen === 'MODE_SELECT') {
    return <ModeSelector onSelectMode={(mode) => { setEditorMode(mode); setScreen('EDITOR'); }} isDarkMode={isDarkMode} />;
  }
```

### Alteracoes em kerningService.ts

```text
Linha 30: sanitizeToken retorna undefined se value vazio
Linhas 49-56: Se sanitizeToken retorna undefined, skip class lookup
Linhas 183-186: Alterar filtro para respeitar includeNumbers/includePunctuation
Linha 237: >= 15 para >= 5
```

### Alteracoes em CompactEditor.tsx

```text
Linhas 113-185: Remover estado local kerning/kerningPairs; derivar de metadata.kerning
Linha 373: Mudar onUpdateMetadata(metadataUpdates) para updater funcional
```

### Alteracoes em EditorModal.tsx

```text
Adicionar auto-save ao onClose: chamar onSave(data.char, dataChanges) se houve mudancas
```

### Alteracoes em TestMode.tsx

```text
Linhas 376-473: Quando getGlyph retorna null/vazio, renderizar placeholder SVG pontilhado
```

---

## Ordem de Execucao

| # | Tarefa | Arquivos |
|---|---|---|
| 1 | Criar ModeSelector.tsx | Novo arquivo |
| 2 | Integrar ModeSelector no App.tsx | App.tsx |
| 3 | Corrigir kerning (threshold, sanitizeToken, filtros) | kerningService.ts |
| 4 | Remover estado local de kerning do CompactEditor | CompactEditor.tsx |
| 5 | Auto-save no EditorModal ao fechar | EditorModal.tsx |
| 6 | Unificar svgPathData -> pathData | App.tsx, kerningService.ts |
| 7 | Placeholder para glyphs ausentes no TestMode | TestMode.tsx |
| 8 | Corrigir handleAutoConfig (updater funcional) | CompactEditor.tsx |
| 9 | Testar fluxo completo | Manual |

