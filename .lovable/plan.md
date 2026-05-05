
# Reorganização dos modais Edit Glyph + Diagnóstico

Após auditoria de `EditorModal.tsx` (1931 linhas) e `GlyphDiagnostics.tsx` (377 linhas), os dois modais sofrem do mesmo problema: muitas ações e seções competindo pelo mesmo espaço, com sobreposições funcionais.

---

## 1. EditorModal — Edit Glyph

### Problemas detectados

- **Aba METRICS está sobrecarregada (7 seções)**: Global Vertical Limits, Glyph Geometry, Auto Position, Context & Ghost Char, Ghost Gap Visualization, Alignment Guides e **Kerning Preview**.
- **Duplicação**: "Kerning Preview", "Context & Ghost Char" e "Ghost Gap Visualization" são funcionalidades de kerning vivendo dentro de METRICS, enquanto existe uma aba **KERNING** dedicada. Usuário não sabe onde mexer.
- **"Global Vertical Limits"** (Ascender, Cap Height, x-Height, Descender, Baseline Shift) altera **metadata da fonte inteira**, não do glifo — não deveria aparecer dentro do editor de um glifo individual (ou pelo menos não sem aviso e em destaque), porque o usuário acha que ajusta só aquela letra e altera todos os glifos.
- **Tabs em 9px com 5 colunas** ficam ilegíveis em viewports menores; "STROKE" raramente é usado mas ocupa um quinto da largura.
- **Header confuso**: dois botões "⚖️ Centralizar" + "Reset LSB" sem hierarquia, ao lado do título.
- **Footer**: "Close" e "Save" sem distinção visual clara — ambos do mesmo tamanho.

### Reorganização proposta

**Cabeçalho** — uma única linha:
- `Edit '{char}' · {name}` à esquerda
- Botão único `⚖ Centralizar` (mantém função, mais visível)
- Botão `↶ Undo` / `↷ Redo` (atualmente só atalho — expor)
- Fechar `×` à direita

**Tabs reduzidas de 5 → 3 + menu "More"**:
- `GLYPH` (geometria + auto position)
- `KERNING` (tudo que é espaçamento entre pares)
- `ACCENTS` (anchors/derivativos)
- Menu `⋯` com `Components` e `Stroke` (uso raro)

**Aba GLYPH (era METRICS, enxuta):**
1. **Geometry** (Scale, Width, X Off, Y Off) — fica
2. **Auto Position** — fica (importante)
3. **Alignment Guides** — fica (snap em ascender/baseline/etc., útil aqui)
4. **Font Metrics (avançado, recolhido)** — collapse fechado por padrão com aviso "altera a fonte inteira"; contém Ascender/Cap/x-Height/Descender/Baseline Shift. Evita edição acidental.

**Aba KERNING (consolidada):**
1. **Diagnóstico de Espaçamento** (cards de métricas) — fica
2. **Partner Preview** (movido de METRICS — Partner glyph + render SVG + zoom/pan + Kerning Bias) — UMA visualização ao invés de duas
3. **Ghost Gap Visualization** (movido de METRICS — par triplo `XaX` com gaps editáveis)
4. **Construtor de Pares Rápido** — fica
5. **Pares Salvos** — fica
6. Botão "Open in Kerning Panel" no topo

Remove: aba KERNING não duplica mais com METRICS; "Context & Ghost Char" funde com "Ghost Gap Visualization" (mesma ideia: glifo fantasma ao lado).

**Footer** — hierarquia clara:
- `Close` (ghost, esquerda)
- `Save & Close` (primário preto, direita, maior)

---

## 2. GlyphDiagnostics — Diagnóstico de Glyphs

### Problemas detectados

- **Toolbar superior amontoada**: 4 stat cards + 4 filter chips + 2 botões grandes ("Normalizar Tamanhos" azul, "Auto-Corrigir Tudo" verde) + ícone fechar — em viewports < 1100px tudo quebra de linha.
- **Duas ações primárias competindo**: "Normalizar Tamanhos" e "Auto-Corrigir Tudo" parecem rivais; usuário não sabe a diferença sem ler código.
- **"Normalizar Tamanhos" global** duplica funcionalidade do botão "Normalizar" que já existe em cada card de glifo.
- **Footer redundante**: contém apenas texto resumo + botão "Fechar" (já existe × no topo).
- **Per-glyph card**: bom, mas três botões na mesma linha (Normalizar, Editar, e por issue → Corrigir) gera ruído.

### Reorganização proposta

**Cabeçalho compacto (uma linha):**
- Título + descrição
- `×` fechar (sem footer com botão duplicado)

**Barra de resumo (segunda linha, agrupada):**
- 4 stats em pílulas pequenas: `Total · Erros · Avisos · Info`
- Filtros como `Tabs` (não chips espalhadas): `Todos | Erros | Avisos | Info`
- Uma única ação primária: **`Auto-Corrigir Tudo`** (botão grande, verde)
- "Normalizar Tamanhos" vai para um menu `⋯ Mais ações` (junto com possíveis futuros: "Resetar métricas", "Exportar relatório")

**Lista de glyphs:**
- Card por glifo mantém preview + nome + contagem
- Apenas **um botão** primário por card: `Editar` (abre o glifo)
- Ações secundárias (`Normalizar`) viram ícone `⋯` no canto do card
- Cada issue mantém botão `Corrigir` quando `autoFixAvailable`

**Remove footer** (estado vazio + close já comunicados acima)

---

## Arquivos a editar

- `src/tools/unbsfont/components/EditorModal.tsx` — reorganização de tabs e seções (movimentação de blocos JSX existentes; sem mudança de props ou lógica de negócio)
- `src/tools/unbsfont/components/GlyphDiagnostics.tsx` — reagrupa toolbar, remove botão duplicado, simplifica cards, remove footer

## O que NÃO muda

- Nenhuma prop dos componentes
- Nenhuma lógica de cálculo (kerning, métricas, autoFix, normalização)
- Nenhum hook ou serviço
- Comportamento de undo/redo, drag de guides, persistência

## Riscos

- Reorganização puramente visual/estrutural; teste manual em ambos os modais (abrir, trocar tabs, salvar, auto-fix) ao final.
