

# Auto Position + Zonas Visuais Tipograficas (Estilo Glyphs App)

## Resumo

Duas funcionalidades novas no EditorModal:

1. **Auto Position**: O usuario edita a posicao de um glyph (scale, baselineOffset, leftSideBearing) e marca como referencia. Ao ativar "Auto Position", esses valores sao aplicados a todos os outros glyphs que nao tenham override manual.
2. **Zonas visuais coloridas** no canvas SVG (estilo Glyphs.app): faixas semi-transparentes para Ascender, x-Height, Baseline e Descender, substituindo as linhas tracejadas simples atuais.

---

## Parte 1: Auto Position

### Modelo de dados

Adicionar dois campos ao `FontMetadata` (em `types.ts`):

```text
autoPosition?: {
    scale: number;
    baselineOffset: number;
    leftSideBearing: number;
    sourceChar: string;  // qual glyph foi usado como referencia
};
```

Adicionar um campo ao `GlyphData` (em `types.ts`):

```text
manualPosition?: boolean;  // true = ignora autoPosition, usa valores proprios
```

### Logica

- Quando o usuario clica "Definir como Auto Position" no EditorModal, os valores atuais de `scale`, `baselineOffset` e `leftSideBearing` do glyph editado sao salvos em `metadata.autoPosition`.
- Ao salvar, todos os glyphs que NAO tem `manualPosition: true` recebem esses valores automaticamente (via `handleUpdateGlyph` em batch no App.tsx).
- Cada glyph pode ser editado manualmente. Se o usuario mudar scale/baselineOffset/leftSideBearing manualmente, o glyph e marcado com `manualPosition: true`.
- Um botao "Reset to Auto" remove o `manualPosition` flag e reaplica os valores auto.

### UI no EditorModal (aba METRICS)

- Novo bloco "Auto Position" abaixo de "Glyph Geometry":
  - Checkbox: "Posicao manual" (toggle `manualPosition`)
  - Botao: "Usar como referencia para todos" -- salva posicao atual como `metadata.autoPosition`
  - Se `metadata.autoPosition` existe, mostra os valores de referencia (scale, Y off, LSB) e o char fonte
  - Botao: "Resetar para auto" -- remove `manualPosition` e aplica valores auto

### Propagacao no App.tsx

- Nova funcao `applyAutoPositionToAll(autoPos)`: itera todos os glyphs, e para cada um que NAO tenha `manualPosition: true` e que tenha pathData (nao vazio), aplica `scale`, `baselineOffset`, `leftSideBearing` do autoPosition.
- Chamada quando o usuario define um novo autoPosition.

---

## Parte 2: Zonas Visuais Coloridas (Estilo Glyphs App)

### O que o Glyphs.app mostra

O Glyphs.app renderiza zonas coloridas semi-transparentes no fundo do editor:

- **Zona Ascender** (azul claro): faixa entre x-Height e Ascender
- **Zona x-Height** (verde claro): faixa entre Baseline e x-Height
- **Zona Descender** (rosa/vermelho): faixa entre Baseline e Descender
- **Overshoot zones**: finas faixas nos limites para indicar tolerancia de overshoot

### Implementacao no EditorModal

Atualmente o metadata NAO tem `xHeight`. Vamos adicionar:

```text
// Em FontMetadata:
xHeight?: number;  // default ~520
capHeight?: number; // default ~720
```

No canvas SVG do EditorModal (antes das linhas guide e do glyph), renderizar retangulos coloridos:

```text
// Zona Ascender (acima de capHeight ate ascender)
<rect x="-500" y={visualAscenderY} width="2000" 
      height={visualCapHeightY - visualAscenderY} 
      fill="rgba(59, 130, 246, 0.06)" />

// Zona Cap Height (entre xHeight e capHeight)  
<rect x="-500" y={visualCapHeightY} width="2000"
      height={visualXHeightY - visualCapHeightY}
      fill="rgba(34, 197, 94, 0.04)" />

// Zona x-Height (entre baseline e xHeight)
<rect x="-500" y={visualXHeightY} width="2000"
      height={visualBaselineY - visualXHeightY}
      fill="rgba(34, 197, 94, 0.06)" />

// Zona Descender (abaixo da baseline)
<rect x="-500" y={visualBaselineY} width="2000"
      height={visualDescenderY - visualBaselineY}
      fill="rgba(239, 68, 68, 0.06)" />
```

Adicionar linhas guide para x-Height e Cap Height (com labels e draggable):
- x-Height: linha verde tracejada, draggable
- Cap Height: linha azul tracejada, draggable

Adicionar controles para x-Height e Cap Height no painel METRICS (em "Global Vertical Limits"), abaixo do Ascender.

---

## Arquivos a editar

| # | Arquivo | Mudanca |
|---|---------|---------|
| 1 | `types.ts` | Adicionar `autoPosition` em FontMetadata, `manualPosition` em GlyphData, `xHeight` e `capHeight` em FontMetadata, defaults em INITIAL_METADATA |
| 2 | `EditorModal.tsx` | Zonas visuais coloridas no canvas, linhas x-Height/capHeight, controles Auto Position na aba METRICS, controles x-Height/capHeight |
| 3 | `App.tsx` | Funcao `applyAutoPositionToAll`, integrar com handleUpdateGlyph |
| 4 | `generateInitialGlyphs` em `types.ts` | Adicionar `manualPosition: false` ao default de cada glyph |

---

## Detalhes tecnicos

### types.ts - Novos campos

```text
// FontMetadata - adicionar:
xHeight?: number;
capHeight?: number;
autoPosition?: {
    scale: number;
    baselineOffset: number;
    leftSideBearing: number;
    sourceChar: string;
};

// GlyphData - adicionar:
manualPosition?: boolean;

// INITIAL_METADATA - adicionar:
xHeight: 520,
capHeight: 720,
```

### EditorModal.tsx - Zonas visuais

Calcular posicoes visuais:
```text
const xHeight = metadata.xHeight ?? 520;
const capHeight = metadata.capHeight ?? 720;
const visualXHeightY = visualBaselineY - xHeight;
const visualCapHeightY = visualBaselineY - capHeight;
```

Renderizar retangulos ANTES das linhas guide (para ficarem atras):
- Ascender zone: `visualAscenderY` ate `visualCapHeightY` (azul)
- Cap-to-xHeight zone: `visualCapHeightY` ate `visualXHeightY` (verde claro)
- x-Height zone: `visualXHeightY` ate `visualBaselineY` (verde)
- Descender zone: `visualBaselineY` ate `visualDescenderY` (vermelho)

Adicionar linhas guide draggable para x-Height e Cap Height com os mesmos patterns das linhas existentes (Ascender, Baseline, Descender).

Expandir o `draggingGuide` type para incluir `'X_HEIGHT' | 'CAP_HEIGHT'`.

### EditorModal.tsx - Auto Position UI

Na aba METRICS, novo bloco entre "Glyph Geometry" e "Context & Ghost Char":

```text
<div className="p-2 rounded-lg border ...">
    <label>Auto Position</label>
    
    {/* Status */}
    {metadata.autoPosition ? (
        <div>Referencia: '{metadata.autoPosition.sourceChar}' 
             (Scale: {metadata.autoPosition.scale}, 
              Y: {metadata.autoPosition.baselineOffset}, 
              LSB: {metadata.autoPosition.leftSideBearing})</div>
    ) : (
        <div>Nenhuma referencia definida.</div>
    )}
    
    {/* Checkbox manual */}
    <label>
        <input type="checkbox" checked={data.manualPosition ?? false} 
               onChange={...} />
        Posicao manual (ignora auto)
    </label>
    
    {/* Botoes */}
    <button onClick={handleSetAutoPosition}>
        Usar este glyph como referencia
    </button>
    {metadata.autoPosition && !data.manualPosition && (
        <button onClick={handleApplyAutoToThis}>
            Resetar para auto
        </button>
    )}
</div>
```

### App.tsx - applyAutoPositionToAll

```text
const applyAutoPositionToAll = useCallback((autoPos: FontMetadata['autoPosition']) => {
    if (!autoPos) return;
    setGlyphs(prev => prev.map(g => {
        if (g.manualPosition) return g;
        if (!g.pathData || g.char === ' ') return g;
        if (g.char === autoPos.sourceChar) return g;
        return {
            ...g,
            scale: autoPos.scale,
            baselineOffset: autoPos.baselineOffset,
            leftSideBearing: autoPos.leftSideBearing,
        };
    }));
}, []);
```

Passar `applyAutoPositionToAll` como prop para o EditorModal, ou expor via callback do `onUpdateMetadata`.

### Ordem de execucao

| # | Tarefa |
|---|--------|
| 1 | Adicionar campos em `types.ts` (autoPosition, manualPosition, xHeight, capHeight) |
| 2 | Renderizar zonas visuais coloridas no canvas do EditorModal |
| 3 | Adicionar linhas guide x-Height e Cap Height (draggable) |
| 4 | Adicionar controles x-Height e capHeight no painel METRICS |
| 5 | Implementar UI de Auto Position no painel METRICS |
| 6 | Implementar `applyAutoPositionToAll` no App.tsx |
| 7 | Conectar callbacks entre EditorModal e App.tsx |

