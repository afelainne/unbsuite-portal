# UNBSFONT: Plano de Revisao - STATUS

## ✅ TODAS AS FASES IMPLEMENTADAS

### Fase 1: Seletor de Modo ✅
- Criado `ModeSelector.tsx` com cards Compact/Advanced
- `App.tsx` agora tem screen `MODE_SELECT` entre Dashboard e Editor
- `handleCreateProject` e `handleOpenProject` redirecionam para MODE_SELECT

### Fase 2: Correcoes de Kerning ✅
- Threshold reduzido de `>= 15` para `>= 5`
- `sanitizeToken` retorna `undefined` quando grupo vazio (evita colisão class/direct)
- Filtro respeita `includeNumbers` e `includePunctuation`
- Referências `svgPathData` unificadas para `pathData`

### Fase 3: Coerencia de State ✅
- Estado local de kerning/tracking/wordSpacing removido do CompactEditor
- Agora deriva diretamente do `metadata` (single source of truth)
- Removidos `isLocalUpdateRef` e `lastSyncedMetadataRef` (sem risco de loops)
- `handleAutoConfig` usa updater funcional
- EditorModal tem auto-save ao fechar (Close em vez de Cancel)

### Fase 4: TestMode e Badges ✅
- Placeholder pontilhado com "?" para glyphs ausentes no TestMode
- Placeholders clicáveis para abrir editor
- `GlyphCard` aceita prop `warnings` para badges tipográficos (overshoot, height-violation, no-path)

### Fase 5: Menu e Rota ✅
- UNBSFONT já estava no menu e rota configurada
