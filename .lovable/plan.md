

# Revisao: Kerning Presets e Auto-Kerning

## Problemas Encontrados

### 1. `glyphShapeAnalyzer.ts` ainda usa `svgPathData` (linha 395)

```
const pathData = glyph.svgPathData || glyph.pathData;
```

Apesar de termos unificado `svgPathData -> pathData` em outros arquivos, o analisador geometrico -- que e o MOTOR de todo o auto-kerning -- ainda prioriza `svgPathData`. Se o glyph so tem `pathData` (caso comum apos importacao), funciona. Mas se tem `svgPathData` com dados diferentes de `pathData`, gera inconsistencia.

**Correcao:** Mudar para `const pathData = glyph.pathData || '';`

---

### 2. `calculateOptimalKerning` descarta valores < 15 (linha 580)

```typescript
if (Math.abs(kerningValue) < 15) {
    return 0;
}
```

Apesar de termos corrigido o threshold no `kerningService.ts` para `>= 5`, o `calculateOptimalKerning` (que e chamado internamente pelo `generateSmartAutoKerning` e `generateCommonPairsKerning`) tem seu proprio threshold de 15. Isso significa que pares com kerning entre -14 e -5 sao descartados dentro do analisador antes de chegar ao threshold externo. Muitos pares uteis de minusculas (av=-10, ew=-10) perdem-se aqui.

**Correcao:** Reduzir para `< 5` para ser coerente com o threshold externo.

---

### 3. `generateSmartAutoKerning` so gera pares entre "problematicos" (linhas 216-248)

O algoritmo smart identifica glyphs "problematicos a esquerda" e "problematicos a direita" e so gera kerning entre eles. Isso e conservador demais -- pares como `Ac`, `Ke`, `Da` nunca sao gerados porque nenhum deles e identificado como "problematico" pelas heuristics (que exigem `rightNegativeSpace > 0.25` ou flags especificas).

Quando o smart falha (0 pares), o CompactEditor faz fallback para `generateProfessionalKerning`, o que e bom. Mas no SpacingManager (Advanced), nao ha fallback -- retorna 0 pares silenciosamente.

**Correcao:** No SpacingManager, adicionar fallback para professional quando smart retorna poucos pares (< 10). Tambem relaxar os thresholds de deteccao de "problematico" de `> 0.25` para `> 0.15` para capturar mais glyphs relevantes.

---

### 4. Valores fixos de kerning no `calculateOptimalKerning` ignoram a geometria real

A funcao `calculateOptimalKerning` recebe dois `GlyphProfile` com dados detalhados de perfil de borda, mas os valores de kerning sao constantes fixas (-70, -50, -35, etc.) baseadas apenas em flags booleanas. O parametro `targetDensity` e recebido mas nunca usado. O perfil de borda (`leftEdgeProfile`/`rightEdgeProfile`) tambem nao e utilizado no calculo.

Isso significa que o "kerning geometrico inteligente" e na verdade uma tabela de lookup com 5 regras if/else, nao uma analise real da geometria.

**Correcao:** Manter as regras de lookup como fallback, mas usar os perfis de borda para modular os valores. Calcular a "area de encaixe" entre o perfil direito do glyph esquerdo e o perfil esquerdo do glyph direito para gerar valores mais precisos.

---

### 5. `generateGeometricKerning` (professionalKerningService) e duplicata de `calculateOptimalKerning`

As funcoes `generateGeometricKerning` (linhas 557-627) e `calculateOptimalKerning` (glyphShapeAnalyzer 501-584) tem a MESMA logica de regras if/else com os MESMOS valores (-70, -50, -35, -60, -45, -40, -30, -25, -20). Isso e codigo duplicado. O `generateHybridKerning` chama ambos e pode gerar valores redundantes.

**Correcao:** Remover `generateGeometricKerning` e usar `calculateOptimalKerning` diretamente no `generateHybridKerning`. Eliminar duplicacao.

---

### 6. `applyKerningTemplate` gera duplicatas uppercase/lowercase desnecessarias (linhas 959-973)

A funcao itera todos os pares do template e cria versoes uppercase e lowercase. Ex: `'TA': -90` gera tambem `'ta': -90`. Mas o template ja tem `'TA'` E `'ta'` com valores diferentes (-90 vs -nao existe). Resultado: `'ta'` recebe o valor uppercase -90 quando deveria nao existir ou ter um valor diferente.

**Correcao:** Remover a geracao automatica de uppercase/lowercase. Os templates ja contem todas as combinacoes necessarias com valores apropriados para cada caixa.

---

### 7. `KERNING_CLASSES` (professionalKerningService linhas 122-146) tem classificacoes incorretas

- `'A'` esta em `rightDiagonal` mas seu lado ESQUERDO e diagonal; seu lado direito tambem e diagonal. OK.
- `'d'` esta em `leftRound` -- correto (forma arredondada a esquerda)
- `'u'` esta em `leftStraight` -- incorreto, `u` tem curva a esquerda
- `'r'` esta em `rightStraight` -- incorreto, `r` tem overhang a direita
- `'t'` esta em `rightOverhang` -- correto
- `'b'` esta em `rightStraight` -- incorreto, `b` tem curva a direita
- `'p'` esta em `rightStraight` -- incorreto, `p` tem curva a direita

**Correcao:** Corrigir classificacoes: `'r'` -> `rightOverhang`, `'b'` e `'p'` -> `rightRound`, `'u'` -> `leftRound` (ou `leftStraight` se considerarmos so a haste).

---

### 8. `AUTO_KERN_MATRIX_GENERIC` (kerningService) nunca e usada

A funcao `getBaseKernFromShapes` e definida mas nunca e chamada em nenhum lugar do codebase. E a `AUTO_KERN_MATRIX_GENERIC` e as matrizes per-character (`AUTO_KERN_MATRIX_T_RIGHT`, etc.) tambem nao. Sao 55 linhas de codigo morto.

**Correcao:** Remover `getBaseKernFromShapes`, `AUTO_KERN_MATRIX_GENERIC`, e todas as `AUTO_KERN_MATRIX_*` que nao sao usadas.

---

### 9. CompactEditor sugere tracking junto com kerning de forma arbitraria

Quando aplica um preset, o CompactEditor modifica `metadata.tracking` com valores hardcoded (linhas 362, 372, 382, 390, 408, 423, 434-436, 446-448, 461-468). Exemplos:
- `tight` -> tracking = -20
- `loose` -> tracking = 30
- `auto-smart` -> tracking = `-10 * intensity`
- Template Helvetica -> tracking = -15
- Template Didot -> tracking = 15

Esses valores sao arbitrarios e sobrescrevem o tracking do usuario sem aviso. Se o usuario ja ajustou tracking para 50, ao mudar preset de kerning perde o valor.

**Correcao:** Nao modificar `metadata.tracking` ao aplicar presets de kerning. Kerning e tracking sao conceitos separados. Se quiser sugerir, mostrar como "sugestao" sem aplicar automaticamente.

---

### 10. SpacingManager e CompactEditor tem logica de kerning duplicada e diferente

O CompactEditor tem 7 presets (none, tight, normal, loose, auto-smart, auto-common, professional, hybrid + templates). O SpacingManager tem 3 modos (smart, professional, hybrid + templates). Os comportamentos sao diferentes:
- CompactEditor: preset `auto-smart` faz fallback para professional se 0 pares
- SpacingManager: modo `smart` nao faz fallback
- CompactEditor: aplica tracking junto com kerning
- SpacingManager: nao toca em tracking

**Correcao:** Extrair a logica de geracao de kerning para uma funcao unica `applyKerningPreset(glyphs, preset, options)` que ambos os modos usam.

---

## Plano de Implementacao

### Arquivo 1: glyphShapeAnalyzer.ts

- Linha 395: `svgPathData || pathData` -> `pathData || ''`
- Linha 580: threshold `< 15` -> `< 5`
- Linhas 501-584: Usar `rightEdgeProfile`/`leftEdgeProfile` para modular valores de kerning (calcular area de encaixe entre perfis adjacentes)

### Arquivo 2: kerningService.ts

- Remover linhas 63-139: `AUTO_KERN_MATRIX_GENERIC`, todas as `AUTO_KERN_MATRIX_*`, `getBaseKernFromShapes` (codigo morto)
- Linhas 203, 208: relaxar threshold de "problematico" de `> 0.25` para `> 0.15`

### Arquivo 3: professionalKerningService.ts

- Remover `generateGeometricKerning` (linhas 557-627) -- duplicata
- Atualizar `generateHybridKerning` para usar `calculateOptimalKerning` via `analyzeAllGlyphShapes`
- Corrigir `KERNING_CLASSES` (linhas 122-146): mover `r` para `rightOverhang`, `b`/`p` para `rightRound`

### Arquivo 4: kerningTemplates.ts

- Remover geracao automatica uppercase/lowercase de `applyKerningTemplate` (linhas 959-973)

### Arquivo 5: CompactEditor.tsx

- Remover atribuicao de `suggestedTracking` em todos os presets (linhas 362, 372, etc.)
- Nao incluir `tracking` no metadata update ao aplicar kerning (linha 488)

### Arquivo 6: SpacingManager.tsx

- Adicionar fallback para professional quando smart retorna < 10 pares (linha 166-173)

### Arquivo 7 (novo): services/kerningPresetService.ts

- Extrair funcao `applyKerningPreset(glyphs, preset, options)` usada por ambos os modos
- Centralizar toda a logica de geracao/fallback num unico ponto

---

## Detalhes Tecnicos

### Calculo de area de encaixe (melhoria do calculateOptimalKerning)

```text
Para cada linha horizontal (das 20 linhas do perfil):
  gap = (1 - rightEdgeProfile[i]) + leftEdgeProfile[i]
  (espaco vazio entre a borda direita do glyph esquerdo e a borda esquerda do glyph direito)

avgGap = media de todos os gaps
kerningAdjust = -(avgGap - targetDensity) * 100

Isso produz valores proporcionais ao espaco real entre os glyphs,
em vez de valores fixos baseados em categorias booleanas.
```

### Funcao centralizada de preset

```text
interface KerningPresetResult {
  kerning: Record<string, number>;
  pairCount: number;
  quality?: KerningQualityReport;
}

applyKerningPreset(
  glyphs: GlyphData[],
  preset: string,
  options: {
    intensity: number;
    fontStyle: FontStyle;
    existingKerning?: Record<string, number>;
    templateScale?: number;
  }
): KerningPresetResult
```

### Ordem de execucao

| # | Tarefa | Arquivo |
|---|--------|---------|
| 1 | Corrigir svgPathData e threshold no analyzer | glyphShapeAnalyzer.ts |
| 2 | Melhorar calculateOptimalKerning com perfis | glyphShapeAnalyzer.ts |
| 3 | Remover codigo morto e relaxar thresholds | kerningService.ts |
| 4 | Remover duplicata e corrigir classes | professionalKerningService.ts |
| 5 | Corrigir applyKerningTemplate | kerningTemplates.ts |
| 6 | Criar kerningPresetService centralizado | Novo arquivo |
| 7 | Atualizar CompactEditor (sem tracking forcado) | CompactEditor.tsx |
| 8 | Atualizar SpacingManager (fallback + usar preset service) | SpacingManager.tsx |

