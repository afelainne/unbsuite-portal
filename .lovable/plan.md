## Auditoria — gargalos atuais

**Aba METRICS (4 cards):**
1. Glyph Geometry — Scale, Width, X Off, Y Off ✅ essencial
2. ⚠ Métricas Globais (Asc/Cap/x-Height/Desc/Baseline) — colapsado ✅ ok
3. Auto Position — referência + posição manual ✅ ok
4. Alignment Guides — botões alvo (glyph/anchor/context) + guias ⚠ pouco usado, ocupa muito

**Aba KERNING (6 cards — excessivo, com 3 visualizadores fazendo a mesma coisa):**
1. Context & Ghost Char (input + LEFT/OVERLAP/RIGHT + sliders X/Y) — só posiciona o ghost na tela
2. Ghost Gap Visualization (SVG grande + grid de cards de gap com input de kerning) — visualizador 1
3. Alignment Guides (duplicado, também aparece em METRICS na verdade)
4. Kerning Preview (Partner glyph + SVG enorme com pan/zoom + combos) — visualizador 2
5. Diagnóstico de Espaçamento (6 cards de métricas — vários duplicam info de Geometry)
6. Construtor de Pares Rápido (cards com partner+slider+Save) — visualizador 3 / editor
7. Pares Salvos (lista asLeft/asRight)

Resultado: usuário vê **3 inputs diferentes de "partner glyph"**, **3 SVGs de visualização**, e **2 lugares para editar valor de kerning**. Confusão total.

## Reorganização proposta

### METRICS (3 seções, mais limpo)
1. **Glyph Geometry** (igual)
2. **Auto Position** (igual)
3. **⚠ Métricas Globais da Fonte** colapsado (igual)
4. **Alignment Guides** — mover para dentro de Geometry como `<details>` "Alinhamento por guia" (uso secundário)

### KERNING (3 seções unificadas)

**1. Diagnóstico Compacto (1 linha de pills)**
Manter apenas 4 métricas que importam para kerning:
- `LSB` (margem esq.) · `RSB` (margem dir.) · `Advance` · `Bias` (kerning class)
Remover: "Largura Desenhada", "Deslocamento da Linha" (já em Geometry/Auto Position) e contador de pares (movido para o cabeçalho da seção 3).

**2. Pair Visualizer (UNIFICADO — substitui Context, Ghost Gap, Kerning Preview, Construtor)**
Componente único:
- Input "Partner glyph" + chips rápidos (A V O T H N c o e)
- Toggle posição: `LEFT (XA)` · `BOTH (AXA)` · `RIGHT (AX)` — define qual combo o SVG renderiza
- 1 SVG grande mostrando o combo escolhido com baseline, gap colorido e label do gap
- Abaixo do SVG: input numérico grande + slider (-400…400) editando o valor de kerning do par diretamente (live, sem botão "Salvar Par")
- Link discreto "Open in Kerning Panel"

Remove sliders X/Y de Ghost (posicionamento manual do ghost não tem valor — o kerning JÁ posiciona), remove pan/zoom (complexidade desnecessária num modal), remove cards "Construtor de Pares Rápido" inteiros (o input + slider já fazem o trabalho).

**3. Pares Salvos (Pares Salvos compacto)**
Lista única (não mais dividida em duas seções) com badge `→` ou `←` indicando direção, ordenada por |valor| desc. Header mostra "N pares · Limpar todos". Mantém input inline de valor e botão remover.

## Mudanças técnicas

**Arquivo:** `src/tools/unbsfont/components/EditorModal.tsx`

- METRICS: mover bloco `Alignment Guides` (linhas ~1448-1485) para dentro de um `<details>` no card de Geometry.
- KERNING: 
  - Substituir os blocos das linhas 1313-1444 (Context+Ghost Gap), 1488-1640 (Kerning Preview) e 1691-1768 (Construtor) por um único `PairVisualizer` inline.
  - Reduzir Diagnóstico (1646-1689) de 6 para 4 métricas em layout horizontal de pills.
  - Unificar Pares Salvos (1770-1827) em lista única com indicador de direção.
- Reaproveitar estado existente: `kerningPartner`, `kerningPreviewLayout`, `handleInlineKerningChange`, `metadata.kerning`. Remover estados/handlers órfãos: `contextChar`, `contextPos`, `contextOffset`, `quickBuilderCards`, `handleApplyKerningBuilder`, pan/zoom (`kerningPreviewPan`, `kerningPreviewZoom`, `isPreviewPanMode`).
- Sem mudança de props, hooks de dados, ou serviços.

**Resultado:** aba KERNING passa de ~520 linhas / 6 cards para ~200 linhas / 3 cards, com 1 só lugar para visualizar e editar kerning de um par.

Sem testes automatizados — verificação manual no preview.
