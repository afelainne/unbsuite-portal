# Revisão de bugs — UNBSFONT

Vou fazer uma varredura completa do tool, mapear os bugs por área e corrigir tudo em uma rodada. Plano organizado por fluxo do usuário.

## 1. Inspeção (read-only, antes de qualquer mudança)

- **Console + network** em runtime: abrir o tool no preview e capturar erros/warnings reais ao: criar projeto, abrir editor (Compact e Advanced), colar SVG, abrir SpacingManager, exportar TTF/OTF, salvar/abrir `.unbsfo`.
- **Sweep estático** com ripgrep nos pontos sensíveis:
  - `App.tsx` (1777 linhas) — handlers de paste, undo/redo, exporters, ciclo de vida de notices.
  - `services/fontService.ts` e `svgFontExporter.ts` — parsing de path, kerning, fallback de export.
  - `src/editor/main.ts` + `core/fontState.ts` — seleção de pontos, handles, persistência.
  - `hooks/useGlyphSelection.ts`, `hooks/useKerningManager.ts`, `hooks/useProjectManager.ts`.
  - `components/SpacingManager.tsx`, `CompactEditor.tsx`, `EditorModal.tsx`, `Toolbar.tsx`, `ExportLab.tsx`, `Dashboard.tsx`.

## 2. Áreas-alvo prováveis (do que já vi)

- **Notices em português**: `noticeStyles` ainda tem `label: 'Sucesso' | 'Aviso' | 'Erro' | 'Info'` em `App.tsx:253-269`. Traduzir.
- **Storage `font_studio_projects`**: salva o `styleMap` inteiro em `localStorage` a cada mudança de `projects`. Já trata `QuotaExceededError`, mas o save dispara em loop quando o usuário tem muitos glyphs. Confirmar se há throttle/debounce; adicionar se faltar.
- **Histórico (undo/redo)**: `useEffect` que faz push em `historyRef` depende de `createSnapshot` que muda a cada render → pode empilhar snapshots idênticos. Validar e adicionar deduplicação por hash leve.
- **Atalho Ctrl+S**: dispara `saveProjectRef.current()` mesmo sem projeto ativo → chama `handleCreateProject` (cria projeto silenciosamente). Tornar explícito (notice "create a project first") ou abrir o modal.
- **`useEffect` de sync `styleMap`**: `setStyleMap(prev => ({...prev, [currentStyle]: glyphs}))` roda em todo render que muda `glyphs` e provoca re-render extra. Verificar loops.
- **Export TTF/OTF**:
  - `svgFontExporter.ts:254` tem `TODO: Serializar tabela SVG` — o modo `outline_plus_svg` hoje grava um stub que **não é** OpenType-SVG válido. Marcar feature como "outline only" no UI ou desabilitar a opção até implementar de fato.
  - `parseSVGPathToOpenTypePath` faz fallback silencioso (`fontService.ts:434`) — adicionar notice de aviso quando cair no legacy parser.
- **Kerning**: warnings `Glyph missing for kerning` (`fontService.ts:313-314`) caem em console mas o export segue. Surfar como notice agregado ("12 pares ignorados — glyph ausente").
- **Editor canvas (`src/editor/main.ts`)**: seleção/handles — verificar se delete (Backspace) remove ponto vs. apaga glyph todo; checar cleanup de listeners ao desmontar.
- **`SpacingManager`**: pares duplicados ao adicionar; sliders sem `step`; valores fora do range não clampados.
- **`CompactEditor`**: paste de SVG não respeita viewBox quando faltam `width/height`; auto-normalize aplicado antes do user confirmar (sobrescreve trabalho).
- **`Dashboard`**: ao deletar projeto ativo, o app limpa estado, mas mantém `lastProjectFileName` → próximo save sugere arquivo antigo.
- **i18n residual**: rodar `rg -n "[À-ÿ]|ção|ões|não|salvar|exportar|fechar" src/tools/unbsfont/` para garantir 0 strings PT remanescentes (incluindo `noticeStyles.label`).

## 3. Plano de execução

1. Abrir o preview, navegar pelo fluxo completo do UNBSFONT e coletar console/network errors reais.
2. Rodar os ripgreps acima e ler os arquivos suspeitos.
3. Consolidar lista final de bugs confirmados (com arquivo:linha) e classificar: **crítico** (quebra export/save), **médio** (UX/estado), **baixo** (cosmético/i18n).
4. Aplicar correções em paralelo, agrupando por arquivo. Sem mudar arquitetura nem adicionar features.
5. Reverificar: console limpo, export gera TTF abrível, save/load round-trip OK, undo/redo coerente, atalhos não disparam em inputs.

## Detalhes técnicos

- Sem mudanças em `types.ts` salvo se um campo opcional for necessário para corrigir um bug.
- Sem novas dependências.
- Manter UI/design system intactos (panels 280px, cores industriais).
- Não re-adicionar features removidas (Gemini Review, Academy).
- Strings novas/alteradas em inglês (tool já está em EN).

## Entregável

Após a correção: lista curta no chat com os bugs encontrados + o que foi corrigido por arquivo, e confirmação de que os fluxos críticos (criar → editar → salvar → exportar TTF → reabrir) passam sem erros no console.
