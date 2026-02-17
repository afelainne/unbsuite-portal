

# Revisao Completa do Compact Mode - UNBSFONT

## Problemas Identificados

### 1. Sliders de Espacamento nao afetam o Preview
O slider "Entre Letras" atualiza `metadata.tracking`, mas o preview usa `getTrackingBetweenGlyphs()` que le de `trackingProfile.defaultTracking` -- um valor completamente separado. O slider muda um campo que ninguem le.

**Correcao:** Ao alterar o slider de letter spacing, atualizar `metadata.trackingProfile.defaultTracking` em vez de (ou alem de) `metadata.tracking`. Assim o preview reflete a mudanca imediatamente.

### 2. Logo com transparencia
O SVG do logo tem `fill="none"` no elemento raiz. Os paths internos usam `fill="currentColor"`, o que funciona, mas o fundo transparente do SVG pode causar efeitos visuais indesejados dependendo do contexto. Alem disso, nao ha problema de transparencia nos paths em si -- o problema pode ser a `opacity-70` aplicada no botao que contem o logo (linha 603: `className="opacity-70 hover:opacity-100"`).

**Correcao:** Remover `opacity-70` do botao do logo no header, deixando-o sempre com opacidade total.

### 3. Auto Config pode nao funcionar corretamente
O `handleAutoConfig` (linha 294) funciona estruturalmente, mas tem um problema de sincronizacao: ele chama `onUpdateGlyph` em loop (que dispara re-renders individuais) e depois `onUpdateMetadata`. Alem disso, o resultado depende de glyphs terem pathData -- se poucos glyphs tem paths, o auto-config reporta sucesso mas faz pouco.

**Correcao:** Adicionar validacao previa (minimo de glyphs com path) e mostrar aviso claro se poucos glyphs estao preenchidos.

### 4. Slider de Kerning Intensity nao reaplica automaticamente
Ao mudar a intensidade do kerning (linha 1125-1133), o slider so muda o valor local `kerningIntensity` sem reaplicar o preset. O usuario precisa clicar "Reaplicar" manualmente.

**Correcao:** Adicionar `useEffect` que reaplica o kerning quando a intensidade muda (com debounce).

### 5. Inconsistencia no onUpdateMetadata
Algumas chamadas usam forma funcional (`prev => ({...prev, ...})`) e outras passam objeto direto (`{...metadata, ...}`). A forma direta pode causar perda de dados se metadata mudar entre renders.

**Correcao:** Padronizar todas as chamadas para usar a forma funcional com `prev =>`.

---

## Mudancas Tecnicas

### `CompactEditor.tsx`

**A) Corrigir slider de letter spacing (Entre Letras)**
Mudar `setLetterSpacing` para atualizar `trackingProfile.defaultTracking`:

```typescript
const setLetterSpacing = useCallback((val: number) => {
    onUpdateMetadata(prev => ({
        ...prev,
        tracking: val,
        trackingProfile: {
            ...(prev.trackingProfile || DEFAULT_TRACKING_PROFILES['body-text']),
            defaultTracking: val,
        }
    }));
}, [onUpdateMetadata]);
```

**B) Remover opacidade do logo**
Linha 603: mudar `opacity-70 hover:opacity-100` para apenas `hover:opacity-80` ou remover completamente.

**C) Padronizar onUpdateMetadata para forma funcional**
Todas as chamadas diretas como `onUpdateMetadata({ ...metadata, familyName: e.target.value })` devem mudar para `onUpdateMetadata(prev => ({ ...prev, familyName: e.target.value }))`. Afeta linhas: ~610, ~1378, ~1387, ~1410, ~1424, ~1438.

**D) Kerning intensity auto-reaplica**
Adicionar useEffect com debounce de 300ms para reaplicar o preset de kerning quando `kerningIntensity` mudar:

```typescript
useEffect(() => {
    if (kerningPreset === 'none') return;
    const timer = setTimeout(() => {
        applyKerningPreset(kerningPreset);
    }, 300);
    return () => clearTimeout(timer);
}, [kerningIntensity]);
```

**E) Validacao no Auto Config**
Antes de executar, verificar se ha pelo menos 5 glyphs com pathData. Caso contrario, mostrar aviso e nao prosseguir.

### `AppLogo.tsx`
Nenhuma mudanca necessaria -- o SVG em si esta correto. A transparencia vem do botao pai.

---

## Resumo das mudancas por arquivo

| Arquivo | Mudanca |
|---------|---------|
| `CompactEditor.tsx` | Corrigir letter spacing para atualizar trackingProfile; remover opacity do logo; padronizar onUpdateMetadata; auto-reapply kerning intensity; validacao auto-config |

## Ordem de execucao

1. Corrigir `setLetterSpacing` para sincronizar com `trackingProfile.defaultTracking`
2. Remover `opacity-70` do botao do logo
3. Padronizar todas chamadas `onUpdateMetadata` para forma funcional
4. Adicionar auto-reaplica de kerning ao mudar intensidade
5. Adicionar validacao minima no auto-config

