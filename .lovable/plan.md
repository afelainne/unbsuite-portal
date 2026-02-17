

# Revisao: Tracking, Tipografia, e Exportacao de Pesos

## Problemas Encontrados

### 1. TRACKING NAO FUNCIONA -- Desconexao entre slider e renderizacao

Este e o problema principal. O slider de tracking no TestMode (linha 109-111) atualiza `metadata.tracking`, mas a renderizacao usa `getTrackingBetweenGlyphs` que le `activeProfile.defaultTracking` (trackingService.ts linha 35), NAO `metadata.tracking`. Sao dois valores diferentes e desconectados.

Exemplo: O usuario move o slider para -60. O metadata.tracking vira -60. Mas o rendering continua usando `activeProfile.defaultTracking` que e 6 (profile "Body Text"). O texto NAO muda visualmente.

A unica forma de o tracking mudar e selecionar outro profile (linha 44 do TestMode), que sincroniza `tracking: preset.defaultTracking`. O slider manual e completamente inutil.

No CompactEditor (linha 812), o tracking e aplicado como `letterSpacing * scale` onde `letterSpacing = metadata.tracking`. Mas aqui tambem esta incorreto porque deveria usar o tracking contextual via `getTrackingBetweenGlyphs`.

**Correcao:** O slider de tracking manual deve atualizar `activeProfile.defaultTracking`, nao apenas `metadata.tracking`. Quando o usuario move o slider, deve modificar o profile ativo:
```
onUpdateMetadata(prev => ({
  ...prev,
  tracking: val,
  trackingProfile: { ...prev.trackingProfile, defaultTracking: val }
}))
```

### 2. LINE GAP min=-500 e excessivo

O slider de entrelinhas vai de -500 a 1000 (TestMode linha 146). Para um UPM de 1000, -500 significa 50% de sobreposicao -- linhas completamente sobrepostas. Nenhum cenario real precisa disso. O min razoavel e 0 (linhas coladas) ou no maximo -100 (leve sobreposicao para efeitos display).

No CompactEditor, o lineGap NEM EXISTE como controle -- o `lineHeight` (linha 1054-1062) e um multiplicador CSS local que nao afeta o metadata nem a exportacao. E outra desconexao.

**Correcao:** Mudar o min do lineGap para 0 (ou -100). No CompactEditor, substituir o slider de `lineHeight` CSS por um slider de `lineGap` que atualiza o metadata diretamente, como ja feito no TestMode.

### 3. Tracking Rules funcionam, mas com ressalva

Os controles de Punctuation Factor, Whitespace Factor e ALL CAPS Bonus estao corretos -- eles atualizam `activeProfile.rules` via `updateProfileRule` e sao usados por `getTrackingBetweenGlyphs`. O problema e que o efeito so e visivel se o tracking base (`defaultTracking`) for diferente de 0. Como o slider de tracking esta quebrado (problema #1), os rules parecem nao fazer nada.

**Correcao:** Resolver o problema #1 automaticamente resolve este.

### 4. CompactEditor usa tracking diferente do TestMode

No CompactEditor (linha 812), o tracking e aplicado como:
```
const trackingAdjust = letterSpacing * scale;
```
Isso usa `metadata.tracking` multiplicado pelo scale, aplicado uniformemente. NAO usa `getTrackingBetweenGlyphs` que considera contexto (caps, pontuacao, whitespace, size compensation).

**Correcao:** No CompactEditor, substituir `trackingAdjust = letterSpacing * scale` por `getTrackingBetweenGlyphs` usando o `trackingProfile` do metadata, consistente com TestMode.

### 5. Exportacao de pesos -- funciona mas metadata e compartilhado

A exportacao em `handleExport` (App.tsx linhas 769-848) itera todos os estilos no `styleMap` e exporta cada um como OTF separado com o MESMO `familyName` e `styleName` diferente. O `getWeightAndWidth` mapeia nomes como "Bold", "Light" para os valores corretos de `usWeightClass` (700, 300 etc). Isso FUNCIONA para instalacao como mesma familia.

Porem, todos os pesos compartilham o MESMO metadata (tracking, kerning, lineGap, wordSpacing). Ao exportar, o kerning e tracking de um peso sao aplicados identicamente a todos. Isso nao e correto tipograficamente -- um "Bold" precisa de kerning diferente de um "Light".

**Correcao nao-prioritaria:** Cada estilo deveria ter seu proprio metadata (tracking, kerning). Mas isso requer uma reestruturacao do modelo `Project`. Para agora, documentar a limitacao e garantir que o export funciona corretamente com o metadata atual.

### 6. Criacao de pesos -- funciona mas gera slots vazios

`handleAddStyle` (App.tsx linha 452) cria um novo peso com `generateInitialGlyphs()` -- todos os slots vazios. O usuario precisa reimportar ou redesenhar todos os glyphs para cada peso. Nao ha opcao de duplicar um peso existente como base.

**Correcao:** Adicionar opcao "Duplicar peso atual" que copia os glyphs do estilo ativo para o novo peso, permitindo ajustes em vez de recomecar do zero.

---

## Plano de Implementacao

### Tarefa 1: Corrigir tracking slider (TestMode + CompactEditor)

**TestMode.tsx:**
- Linha 109-111: Alterar o onChange do slider de tracking para sincronizar `metadata.tracking` E `trackingProfile.defaultTracking`
- O slider passa a ter efeito real na renderizacao

**CompactEditor.tsx:**
- Linha 812: Substituir `const trackingAdjust = letterSpacing * scale` por calculo contextual usando `getTrackingBetweenGlyphs` entre cada par de glyphs, consistente com TestMode
- Importar `getTrackingBetweenGlyphs` e `isAllCapsWord` do trackingService

### Tarefa 2: Corrigir lineGap no TestMode e adicionar ao CompactEditor

**TestMode.tsx:**
- Linha 146: Mudar min de -500 para 0

**CompactEditor.tsx:**
- Linhas 1050-1063: Substituir o slider de `lineHeight` (estado local CSS) por um slider de `lineGap` que atualiza `metadata.lineGap` diretamente
- Isso garante que entrelinhas do CompactEditor e TestMode sao consistentes e afetam a exportacao

### Tarefa 3: Adicionar "Duplicar peso" na criacao de estilos

**App.tsx:**
- Criar `handleDuplicateStyle(baseName: string, newName: string)` que copia os glyphs do estilo base para o novo
- O metadata permanece compartilhado (limitacao documentada)

**Toolbar.tsx:**
- Adicionar botao "Duplicar" ao lado de cada peso na lista de estilos, ou como opcao no modal de adicionar estilo

### Tarefa 4: Testar fluxo completo no browser

- Criar fonte, importar SVG, ajustar tracking (verificar que o slider tem efeito visual)
- Ajustar lineGap (verificar range correto)
- Criar 2 pesos (Regular + Bold), exportar, verificar que instalam como mesma familia

---

## Detalhes Tecnicos

### Tracking slider corrigido

```text
// TestMode.tsx - onChange do slider de tracking
onChange={(e) => {
    const val = parseInt(e.target.value);
    onUpdateMetadata(prev => ({
        ...prev,
        tracking: val,
        trackingProfile: {
            ...(prev.trackingProfile || DEFAULT_TRACKING_PROFILES['body-text']),
            defaultTracking: val
        }
    }));
}}
```

### CompactEditor tracking contextual

```text
// Em vez de:
const trackingAdjust = letterSpacing * scale;

// Usar:
let trackingAdjust = 0;
if (idx > 0) {
    const prevG = getGlyph(previewText[idx - 1]);
    if (prevG) {
        const profile = metadata.trackingProfile || DEFAULT_TRACKING_PROFILES['body-text'];
        trackingAdjust = getTrackingBetweenGlyphs(prevG, g, profile, fontSize, isAllCapsWord(previewText)) * scale;
    }
}
```

### LineGap no CompactEditor (substituindo lineHeight local)

```text
// Substituir:
const [lineHeight, setLineHeight] = useState(1.2);

// Por leitura direta do metadata:
const lineGap = metadata.lineGap ?? 200;

// Slider:
<input type="range" min="0" max="1000" step="10" value={lineGap}
  onChange={(e) => onUpdateMetadata(prev => ({ ...prev, lineGap: parseInt(e.target.value) }))}
/>

// No container de preview, usar lineGap para calcular marginTop entre linhas:
style={{ lineHeight: 1 + (lineGap / (metadata.unitsPerEm || 1000)) }}
```

### Duplicar peso

```text
const handleDuplicateStyle = (newName: string) => {
    if (styleMap[newName]) { pushNotice('Esse peso ja existe.', 'warning'); return; }
    const clonedGlyphs = deepClone(glyphs); // copia do estilo ativo
    setStyleMap(prev => ({ ...prev, [newName]: clonedGlyphs }));
    handleSwitchStyle(newName);
    pushNotice(`Peso "${newName}" criado como copia de "${currentStyle}".`, 'success');
};
```

### Ordem de execucao

| # | Tarefa | Arquivo |
|---|--------|---------|
| 1 | Sincronizar tracking slider com trackingProfile.defaultTracking | TestMode.tsx |
| 2 | Aplicar tracking contextual no CompactEditor | CompactEditor.tsx |
| 3 | Corrigir lineGap min e substituir lineHeight no CompactEditor | TestMode.tsx, CompactEditor.tsx |
| 4 | Adicionar duplicacao de pesos | App.tsx, Toolbar.tsx |
| 5 | Testar fluxo completo | Browser |

