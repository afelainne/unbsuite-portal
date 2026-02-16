
# Melhorias no UNBSCOLOR: Shuffle, Contraste, Multi-Slot e Header

## Resumo
Quatro frentes de trabalho:
1. Melhorar o shuffle do "2. ALBERS INTERACTION SQUARES" e "3. CUSTOM COMBINATIONS" para cobrir todos os slots e gerar sugestoes baseadas em contraste
2. Adicionar botao "Full Contrast" que gera apenas combinacoes com contraste minimo aceitavel (WCAG AA 4.5:1)
3. Corrigir Multi-Slot Match para baixar tambem alternativas Pantone quando ativadas
4. Melhorar o header da plataforma geral e remover limites laterais

---

## 1. Shuffle Inteligente com Contraste

### Problema atual
O `shuffleAlbers()` no `GeneratedPalettes.tsx` (linha 355-380) apenas incrementa o `albersSeed` ou embaralha posicoes desbloqueadas. O `albersGrid` (linha 229-270) gera combinacoes baseadas em peso, mas o shuffle nao garante diversidade nem prioriza contraste. O `suggestNewCombination()` (linha 539-556) gera cores aleatorias com harmonias, mas nao alimenta todos os slots.

### Solucao
- **Novo estado**: `fullContrastMode` (boolean, default false)
- **Novo botao**: "FULL CONTRAST" ao lado do "Shuffle" nas secoes 2 e 3
- Quando `fullContrastMode` esta ativo:
  - `albersGrid` filtra combinacoes para manter apenas aquelas onde `getContrastRatio(middle, inner) >= 4.5` (WCAG AA)
  - O shuffle prioriza combinacoes com maior contraste entre camadas
  - `suggestNewCombination()` gera cores garantindo que todas as combinacoes tenham contraste minimo AA
- Quando desativado: comportamento aleatorio atual mantido
- O shuffle deve cobrir TODOS os slots da paleta (nao apenas os primeiros), distribuindo as cores de forma que cada slot da paleta participe das combinacoes

### Arquivo: `src/tools/unbscolor/components/GeneratedPalettes.tsx`
- Adicionar estado `fullContrastMode` (linha ~88)
- Modificar `albersGrid` (useMemo, linha 229-270): quando fullContrastMode ativo, filtrar para `getContrastRatio(middle, inner) >= 4.5`
- Modificar `suggestNewCombination()` (linha 539-556): gerar cores com garantia de contraste quando fullContrastMode ativo
- Adicionar botao "FULL CONTRAST" toggle nos controles da secao 2 (linha ~1301) e secao 3 (linha ~1334)
- Estilo do botao: quando ativo `bg-[#F0FF00] text-[#232323]`, quando inativo `bg-gray-100`

---

## 2. Multi-Slot Match: Download com Alternativas Pantone

### Problema atual
No `BatchAnalyzer.tsx`, a secao "Nearby Alternatives" (linha 173-198) mostra alternativas Pantone quando `showAlternatives` esta true, mas o download SVG/PNG do card (`onDownloadCard`) nao inclui essas alternativas no arquivo exportado. O `buildCardExportData` no `App.tsx` (linha 240-311) ja inclui um `strip` de 6 alternativas, mas apenas com hex e nome -- nao inclui o codigo Pantone.

### Solucao
- Modificar `buildCardExportData` no `App.tsx` para incluir o `code` Pantone de cada alternativa no strip
- Modificar `generateCardSvg` para renderizar os codigos Pantone abaixo de cada swatch do strip quando disponiveis
- No `BatchAnalyzer.tsx`, mudar o estado `showAlternatives` para ser individual por slot (em vez de global) usando um `Set<number>`

### Arquivos:
- `src/tools/unbscolor/App.tsx` linhas 240-395: adicionar `code` ao strip e renderiza-lo no SVG
- `src/tools/unbscolor/components/BatchAnalyzer.tsx`: trocar `showAlternatives` boolean por `Set<number>` para controle por slot

---

## 3. Header da Plataforma

### Problema atual
O `Header.tsx` tem botoes que nao funcionam (Search, FolderOpen, Bell, Perfil, Sair) -- sao apenas visuais sem funcionalidade. O dropdown de perfil aponta para `/profile` que nao existe. O visual usa `hsl(var(--surface-primary))` que pode nao estar definido. A rota `/profile` nao existe no `App.tsx`.

### Solucao
- Remover os botoes sem funcionalidade (Search, FolderOpen, Bell)
- Remover o dropdown de perfil e o botao "Sair" (nao ha autenticacao)
- Simplificar o header para: logo "UNBSERVED." a esquerda + link de volta quando em sub-app
- Aplicar cores oficiais: fundo branco, texto `#232323`, borda `#D0D0C8`
- Remover o menu mobile (apenas o back arrow e logo sao necessarios)

### Arquivo: `src/components/Header.tsx`
- Reescrever para versao minimalista: apenas logo + back arrow + titulo

---

## 4. Remover Limites Laterais

### Problema atual
O `ToolLayout.tsx` usa `<main className="container py-6">` que aplica `max-width` e padding lateral do Tailwind container. O UNBSCOLOR internamente usa `max-w-[1600px]`, e o UNBSGRID tem seu proprio layout. O `container` do Tailwind adiciona margens laterais que limitam o conteudo.

### Solucao
- No `ToolLayout.tsx`: trocar `className="container py-6"` por `className="w-full py-6"` para remover o max-width do container
- No `Header.tsx`: trocar `className="container flex..."` por `className="w-full px-6 flex..."` para que o header tambem ocupe toda a largura
- Cada sub-app ja controla seu proprio max-width internamente

### Arquivos:
- `src/components/ToolLayout.tsx`: remover `container`
- `src/components/Header.tsx`: remover `container`

---

## Secao Tecnica Detalhada

### `src/tools/unbscolor/components/GeneratedPalettes.tsx`

**Novo estado (linha ~88)**:
```text
const [fullContrastMode, setFullContrastMode] = useState(false);
```

**Modificar `albersGrid` useMemo (linhas 229-270)**:
- Adicionar `fullContrastMode` como dependencia
- Quando ativo, filtrar o grid final para manter apenas combos onde `getContrastRatio(combo.middle, combo.inner) >= 4.5`
- Garantir que todas as cores da paleta participem como outer pelo menos uma vez

**Modificar `suggestNewCombination` (linhas 539-556)**:
- Quando `fullContrastMode` ativo: gerar cores com luminosidades variadas para garantir contraste
- Exemplo: gerar 2-3 cores saturadas + 1 branco + 1 preto, validar que pares tenham ratio >= 4.5

**Botao UI na secao 2 (linha ~1301-1307)**:
```text
<button 
  onClick={() => setFullContrastMode(!fullContrastMode)}
  style={fullContrastMode ? { backgroundColor: '#F0FF00', color: '#232323' } : {}}
  className="px-4 py-2 rounded-lg font-mono text-[10px] font-bold uppercase..."
>
  FULL CONTRAST
</button>
```

**Botao UI na secao 3 (linha ~1334)**: mesmo padrao

### `src/tools/unbscolor/App.tsx`

**`buildCardExportData` (linhas 296-311)**: adicionar `code` ao strip:
```text
const strip = findReferenceMatches(color, library, 6).map((m) => ({
    hex: m.reference.hex,
    name: m.reference.name,
    code: m.reference.code  // NOVO
}));
```

**`generateCardSvg` (linhas 356-370)**: renderizar codigo Pantone abaixo de cada swatch rect quando disponivel

### `src/tools/unbscolor/components/BatchAnalyzer.tsx`

**Trocar estado (linha 48)**:
```text
De: const [showAlternatives, setShowAlternatives] = useState(false);
Para: const [showAlternatives, setShowAlternatives] = useState<Set<number>>(new Set());
```

**Toggle por slot (linhas 176-183)**:
```text
onClick={() => setShowAlternatives(prev => {
  const next = new Set(prev);
  next.has(idx) ? next.delete(idx) : next.add(idx);
  return next;
})}
```

**Condicional (linha 186)**: `showAlternatives.has(idx)`

### `src/components/Header.tsx`
Reescrever completamente para versao minimalista:
- Apenas: ArrowLeft (quando showBack) + "UNBSERVED." link + titulo breadcrumb
- Fundo branco, borda `#D0D0C8`, texto `#232323`
- Sem botoes nao funcionais, sem menu mobile, sem avatar

### `src/components/ToolLayout.tsx`
- Linha 13: trocar `container py-6` por `w-full py-6`

### Impacto
- Shuffle agora cobre todos os slots e tem modo de contraste garantido
- Multi-Slot exporta alternativas Pantone
- Header limpo e funcional
- Apps sem limites laterais artificiais
- Zero quebra de funcionalidade existente
