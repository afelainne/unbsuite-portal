# Varredura de bugs e correção do vínculo família/estilo de fontes

## Bugs / inconsistências identificados

### 1. UNBSFONT — Preview da fonte usa nome fixo (não respeita familyName)
`src/tools/unbsfont/components/FontPreview.tsx` registra a fonte sempre como `FontPreview_UnbsFont`, ignorando `metadata.familyName`. Resultado: o preview não reflete o nome real da família, e qualquer CSS externo tentando usar `familyName` falha.

### 2. UNBSFONT — Preview não recarrega quando metadata/glifos mudam
O `useEffect` depende só de `isOpen` (`eslint-disable-line` ativo). Editar um glifo, fechar e reabrir mostra fonte velha em cache porque o `FontFace` antigo não é removido por mudança de família.

### 3. UNBSFONT — Export "rápido" (CompactEditor) só exporta o estilo ATIVO
`handleExportFontEditor` usa `glyphs` (estilo atual), nunca itera `styleMap`. Famílias com vários pesos (Regular, Bold, Light) só geram 1 arquivo. Apenas `handleExport` (modo Avançado) faz a iteração correta.
Correção: `handleExportFontEditor` deve exportar todos os estilos com `glyphs.some(pathData)`, gerando 1 TTF por peso, todos compartilhando `familyName`.

### 4. UNBSFONT — `fullName` / `postScriptName` montados em 2 lugares (drift)
`fontEditorExporter.ts` repete a montagem nas linhas 524-528 e 676-680. Se uma for atualizada, a outra fica desatualizada. Extrair para helper `applyNameRecords(ttfData, metadata)`.

### 5. UNBSFONT — Falta preferredFamily/preferredSubfamily (name IDs 16/17)
Para fontes com >2 estilos (ex.: Light, Regular, Medium, Bold, Black), o sistema operacional precisa dos name records 16/17 senão os pesos extras viram "famílias separadas" em apps como Word/Figma. Adicionar `name.preferredFamily` e `name.preferredSubFamily` quando `styleMap` tem mais de 2 entradas.

### 6. UNBSTYPE — Upload de fonte não detecta categoria nem weights reais
`handleUploadFont` força `category: 'sans'` e `weights: [400, 700]`. Se a fonte uploaded for serif/mono/display ou tiver só 1 weight, a UI mente. Usar metadata do `FontFace` (`fontFace.weight`) e oferecer dropdown de categoria. Mínimo: ler `fontFace.weight` real.

### 7. UNBSTYPE — Nome do upload colide se mesmo arquivo for enviado 2×
`name = "Upload: file.ttf"` — segunda vez sobrescreve a primeira no `document.fonts` mas adiciona entry duplicada em `customFonts`. Usar `localFontCounter` no nome (`Upload ${counter}: name`) e desduplicar antes de inserir.

### 8. UNBSTYPE — Preview pode tentar usar fonte ainda não carregada
`PreviewPanel` não aguarda `document.fonts.ready`. Em primeira renderização aparece o fallback genérico. Adicionar `await document.fonts.load(\`16px '${fontName}'\`)` antes de marcar como pronto, ou usar `font-display: swap` com loader visual.

### 9. UNBSTYPE — `fontFamily: "'${name}', sans-serif"` quebra com nomes com aspas
Improvável, mas nomes como `Source Sans 3` funcionam; nomes com aspas/carac. especiais não. Sanitizar nome no `loadGoogleFont` e usar nome sanitizado consistentemente.

### 10. CompactEditor — input de SVG sem reset de `value`
Linha ~677: o handler usa `e.target.value = ''` corretamente, OK. Verificar paridade no botão "Carregar SVG" do painel de glifo selecionado (~969).

### 11. Console warning persistente — `Function components cannot be given refs`
Vem de algum filho em `App.tsx` (root) usando `forwardRef` faltando. Localizar e envolver com `React.forwardRef` ou trocar por componente que aceite `ref`.

### 12. Inconsistência de chrome — Header global + ToolHeader em sub-apps
Alguns sub-apps (UNBSFORMAT, UNBSGRID) renderizam um `ToolHeader` próprio dentro do `ToolLayout`, gerando dois headers. Verificar e remover o segundo onde aplicável.

## Mudanças propostas

### A. `src/tools/unbsfont/components/FontPreview.tsx`
- Trocar `FONT_FAMILY_NAME` constante por `\`${metadata.familyName || 'CustomFont'}_preview\``.
- Trocar dependências do `useEffect` para `[isOpen, metadata, glyphs]` e remover o eslint-disable.
- Limpeza ampla: remover qualquer `FontFace` cuja `family` termine com `_preview` antes de adicionar nova.

### B. `src/tools/unbsfont/App.tsx` — `handleExportFontEditor`
Reescrever para iterar `styleMap` igual a `handleExport`, montando 1 candidato por estilo e chamando `downloadFontEditorFont(meta, glyphs)` em loop. Mantém `familyName` constante e varia apenas `styleName`. Mostra notice consolidada no fim.

### C. `src/tools/unbsfont/services/fontEditorExporter.ts`
- Extrair `applyNameRecords(ttfData, metadata, totalStyles)` reutilizado pelas duas funções de export.
- Quando `totalStyles > 2`, preencher `name.preferredFamily = familyName` e `name.preferredSubFamily = styleName` (name IDs 16/17). Para Bold/Italic standard pairs (≤2), seguir só com IDs 1/2.
- Helper aceita `totalStyles` opcional (default 1).
- Caller (`App.tsx`) passa `Object.keys(styleMap).length` ao chamar export.

### D. `src/tools/unbstype/App.tsx` — Upload
- Após `await fontFace.load()`, ler `fontFace.weight` (string tipo `"400"`) e converter em number; usar como único weight.
- Sanitizar `name` removendo extensão e caracteres ` "/\`.
- Antes de `setCustomFonts`, filtrar duplicatas por `name`.

### E. `src/tools/unbstype/components/PreviewPanel.tsx`
- Adicionar `useEffect([headingFont, bodyFont])` que faz `document.fonts.load(\`16px '${headingFont}'\`)` e `\`16px '${bodyFont}'\`` em paralelo, e seta um `ready` boolean. Renderizar com `opacity-0` enquanto `!ready` para evitar flash do fallback.

### F. `src/components/ToolLayout.tsx` / sub-apps
- Auditar UNBSFORMAT e UNBSGRID: garantir que não renderizem header próprio quando estão dentro de `ToolLayout`. Onde renderizam, remover.

### G. Console warning de `forwardRef`
- Buscar nos componentes consumidos pelo `<Routes>` qual está recebendo `ref` (provavelmente `Index` ou um wrapper). Identificar e converter para `React.forwardRef`. Diagnóstico em runtime; sem código a propor antes da inspeção em build mode.

## Verificação
- Exportar uma família com 3 estilos (Light, Regular, Bold) gera 3 TTFs, todos com mesma `familyName` e diferentes `styleName`. Instalados juntos no SO ou Figma, aparecem agrupados sob 1 família.
- Preview do UNBSFONT muda fontFamily quando o usuário renomeia a família.
- Upload de uma fonte serif no UNBSTYPE mostra a categoria correta e o weight real.
- Nenhum warning de forwardRef no console.
- Sem duplicação de header em qualquer sub-app.

Sem mudanças de schema/DB, sem novas dependências.
