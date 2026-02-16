
# Novos Presets, Presets Colapsavel, Logo UNBSGRID e Home Amarela

## 1. Novos Presets Criativos para UNBSGRID

Adicionar 6 novos presets criativos ao `src/tools/unbsgrid/lib/preset-engine.ts`:

- **Fluxo Dinamico**: parallelFlowLines, dominantDiagonals, skeletonCenterline, pathDirectionArrows -- para analise de movimento e direcao visual
- **Circulos Construtivos**: circles, underlyingCircles, vesicaPiscis, anchoringPoints -- foco em geometria circular
- **Minimalista**: boundingRects, centerLines, opticalCenter -- overlay super limpo, poucos elementos
- **Contraste & Peso**: contrastGuide, visualWeightMap, ruleOfOdds, anchoringPoints -- analise de peso visual e equilibrio
- **Diagonal & Perspectiva**: diagonals, dominantDiagonals, thirdLines, goldenRatio -- linhas de forca e composicao
- **Skeleton & Curvas**: skeletonCenterline, curvatureComb, bezierHandles, tangentIntersections, anchorPoints -- analise de forma e curvas

## 2. Presets Colapsavel

Tornar a secao de Presets no `PresetManager.tsx` colapsavel usando o `Collapsible` do Radix UI:
- O header "Presets" vira um `CollapsibleTrigger` com chevron
- O conteudo (botoes Load/Save, preset chips, revert) fica dentro do `CollapsibleContent`
- Estado padrao: aberto
- Importar `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` dos componentes UI locais

## 3. Restaurar Logo UNBSGRID na Sidebar

O logo UNBSGRID foi removido da sidebar (linha 416: "Compact header - no logo, just upload"). Restaurar o SVG do logo UNBSGRID (o SVG fornecido pelo usuario, com viewBox 0 0 1427 434) acima do SVGDropZone no `src/tools/unbsgrid/pages/Index.tsx`:
- Adicionar o SVG inline compacto (altura ~32px) com `fill="#232323"` no topo do sidebar, antes do upload
- Manter o estilo minimalista -- apenas o logo pequeno

## 4. Logos nos Botoes da Home

No `src/pages/Index.tsx`, substituir os icones Lucide (Palette, LayoutGrid) por SVGs inline dos logos reais:
- **UNBSCOLOR**: usar o SVG do logo UNBSCOLOR (mesmas paths que o Logo.tsx do unbsgrid, que contem "UNBSGRID" -- na verdade o logo compartilhado e o "UNBS" com sufixo diferente). Como os logos sao SVGs grandes, criar versoes compactas inline com altura ~16px
- **UNBSGRID**: usar o SVG fornecido pelo usuario (viewBox 0 0 1427 434)
- Remover os icones Lucide `Palette` e `LayoutGrid` dos botoes

## 5. Fundo da Home #F0FF00

No `src/pages/Index.tsx`:
- Trocar `bg-background` do container principal para `backgroundColor: '#F0FF00'`
- Ajustar cores do device frame: borda `#232323`, fundo interno branco
- O area lime interna ja e `bg-lime` -- pode manter ou ajustar para que nao conflite com o fundo amarelo exterior

---

## Secao Tecnica

### `src/tools/unbsgrid/lib/preset-engine.ts`
Adicionar 6 novos presets ao array retornado por `getBuiltinPresets()`, antes do "Auditoria Completa":

| Preset | Opcoes Ativas |
|---|---|
| Fluxo Dinamico | parallelFlowLines, dominantDiagonals, skeletonCenterline, pathDirectionArrows |
| Circulos Construtivos | circles, underlyingCircles, vesicaPiscis, anchoringPoints |
| Minimalista | boundingRects, centerLines, opticalCenter |
| Contraste & Peso | contrastGuide, visualWeightMap, ruleOfOdds, anchoringPoints |
| Diagonal & Perspectiva | diagonals, dominantDiagonals, thirdLines, goldenRatio |
| Skeleton & Curvas | skeletonCenterline, curvatureComb, bezierHandles, tangentIntersections, anchorPoints |

### `src/tools/unbsgrid/components/PresetManager.tsx`
- Importar `Collapsible, CollapsibleTrigger, CollapsibleContent` de `./ui/collapsible`
- Adicionar estado `open` (default true) via prop ou interno com `useState`
- Envolver conteudo no Collapsible:

```text
<Collapsible defaultOpen>
  <CollapsibleTrigger> [Chevron] Presets [InfoTooltip] </CollapsibleTrigger>
  <CollapsibleContent>
    ... botoes Load/Save, chips, revert ...
  </CollapsibleContent>
</Collapsible>
```

### `src/tools/unbsgrid/pages/Index.tsx`
Linha 417 (dentro do `<div className="px-3 pt-3 pb-2">`): adicionar logo SVG inline antes do SVGDropZone:

```text
<div className="mb-2 flex justify-center">
  <svg width="120" height="auto" viewBox="0 0 1427 434" fill="none" ...>
    [paths do logo UNBSGRID]
  </svg>
</div>
```

### `src/pages/Index.tsx`
- Linha 24: trocar `bg-background` por estilo inline `backgroundColor: '#F0FF00'`
- Linhas 59-71: dentro de cada `<Link>`, substituir `<tool.icon>` por SVG inline do logo correspondente (UNBSCOLOR ou UNBSGRID), com altura ~16px e `fill="currentColor"`
- Remover imports de `Palette` e `LayoutGrid` do lucide-react
- Remover a propriedade `icon` do array `tools`

### Arquivos editados

| Arquivo | Mudanca |
|---|---|
| `src/tools/unbsgrid/lib/preset-engine.ts` | 6 novos presets criativos |
| `src/tools/unbsgrid/components/PresetManager.tsx` | Collapsible na secao Presets |
| `src/tools/unbsgrid/pages/Index.tsx` | Restaurar logo UNBSGRID no topo da sidebar |
| `src/pages/Index.tsx` | Fundo #F0FF00, logos SVG inline nos botoes |
