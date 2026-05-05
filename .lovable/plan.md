## Translate remaining Portuguese strings in UNBSFONT to English

A scan of `src/tools/unbsfont/` shows several user-facing strings and code comments still in Portuguese. I'll translate **all user-visible text** (UI labels, button text, toast/notice messages, error messages thrown to the UI, and status text) to English. Code comments will also be translated for consistency.

### User-facing strings to translate

**Toolbar (`components/Toolbar.tsx`)**
- `+ Adicionar estilo` → `+ Add style`
- `Salvar project` → `Save project`
- `Abrir .unbsfo` → `Open .unbsfo`
- `Exportar` → `Export`
- `Exportar TTF` → `Export TTF`
- Comment `EXPORTAR FONTE` → `EXPORT FONT`

**ExportLab (`components/ExportLab.tsx`)**
- `Exportado:` → `Exported:`
- `Export Lab - Motor Alternativo` → `Export Lab - Alternative Engine`
- `Pode resolver problemas de serrilhamento em paths complexos.` → `May resolve aliasing issues in complex paths.`

**GlyphDiagnostics (`components/GlyphDiagnostics.tsx`)**
- `Equaliza altura visual entre todos os glyphs.` → `Equalizes visual height across all glyphs.`
- `aria-label="Fechar"` → `aria-label="Close"`
- `Nenhum problema encontrado!` → `No issues found!`

**SpacingManager (`components/SpacingManager.tsx`)**
- `O par ${selectedPair} foi resetado.` → `Pair ${selectedPair} was reset.`
- `Nenhum ajuste ativo encontrado para ${selectedPair}.` → `No active adjustment found for ${selectedPair}.`
- `Remover` → `Remove`
- `Estilo da Fonte - para modos profissional/híbrido` (comment) → English
- `Tipo de fonte para modo Smart` (comment) → English
- `Tipo de fonte` label → `Font type`

**fontService (`services/fontService.ts`)** — error messages shown to UI
- `Falha ao exportar fonte.` → `Failed to export font.`
- `Não há glifos desenhados para este weight.` → `No glyphs drawn for this weight.`

**Editor main (`src/editor/main.ts`)** — runtime UI text and errors
- `Canvas principal não encontrado.` → `Main canvas not found.`
- `Elementos de UI essenciais não encontrados.` → `Essential UI elements not found.`
- `Nenhum ponto selecionado` (×2) → `No point selected`
- `Projeto salvo` (×2) → `Project saved`
- `Posição` → `Position`
- `Altura` → `Height`
- `Remover` → `Remove`
- `Ponto ${id} · x ... · y ...` selection text → `Point ${id} · x ... · y ...` (already mostly English; verify)

**fontState (`src/editor/core/fontState.ts`)**
- console.warn `Estado salvo inválido, resetando.` → `Invalid saved state, resetting.`

### Code comments (non-visible) translated for consistency
Across `services/` (kerningService, professionalKerningService, glyphDiagnosticService, glyphShapeAnalyzer, pathSanitizer, svgFontExporter, importService, fontService, fontEditorExporter) and `editor/ui/coordinates.ts`, `editor/ui/canvasRenderer.ts` — translate comments and section headers (`// TIPOS E CONFIGURAÇÕES`, `// ANÁLISE PRINCIPAL`, `// ============ API PRINCIPAL ============`, etc.) to English. No behavior changes.

### Approach
1. Open each file listed above and apply targeted replacements via `code--line_replace`.
2. After edits, run a final ripgrep sweep with a Portuguese-word regex over `src/tools/unbsfont/` to confirm zero remaining hits.
3. No logic, no imports, no types touched — string-only changes.