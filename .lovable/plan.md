

# Correcao de Erros de Build -- UNBSCOLOR

## Problema
Ha 3 categorias de erros de TypeScript impedindo o build:

1. **`colorAnalysis.ts`**: ~70 entradas usam strings simples em portugues em vez do formato multilingue `{en, pt, es}` exigido pelo tipo `AnalysisResult`
2. **`InfoGrid.tsx`**: Renderiza `analysis.psychology` e `analysis.description` como ReactNode, mas eles sao objetos `{en, pt, es}`. Tambem chama `.map()` em `analysis.usageTips` que e um objeto, nao array
3. **`LibraryManager.tsx`**: Usa a variavel `isStandard` sem defini-la

## Causa Raiz
O codigo foi parcialmente migrado para i18n multilingue. Algumas entradas no banco de dados de analises ficaram no formato antigo (string pura em PT), e os componentes que consomem esses dados nao foram atualizados para resolver o idioma correto.

---

## Solucao

### 1. `colorAnalysis.ts` -- Converter entradas legadas para formato multilingue
Cada entrada que usa `description: 'string'` precisa virar `description: { en: '...', pt: '...', es: '...' }`. Como as strings existentes sao em portugues, elas serao usadas para `pt`, e traducoes em `en` e `es` serao derivadas/adaptadas.

Sao aproximadamente 70 entradas espalhadas pelo arquivo (linhas 1079-1920+). Cada uma segue o mesmo padrao:

Antes:
```ts
'2597': {
    description: 'Roxo profundo como vinho do Porto...',
    usageTips: ['Vinhos e destilados', 'Clubes privados', 'Arte e cultura'],
    psychology: 'Sugere profundidade, mistério e sofisticação.'
}
```

Depois:
```ts
'2597': {
    description: {
        en: 'Deep purple like port wine, complexity in every nuance.',
        pt: 'Roxo profundo como vinho do Porto, complexidade em cada nuance.',
        es: 'Purpura profundo como vino de Oporto, complejidad en cada matiz.'
    },
    usageTips: {
        en: ['Wines and spirits', 'Private clubs', 'Art and culture'],
        pt: ['Vinhos e destilados', 'Clubes privados', 'Arte e cultura'],
        es: ['Vinos y destilados', 'Clubes privados', 'Arte y cultura']
    },
    psychology: {
        en: 'Suggests depth, mystery and sophistication.',
        pt: 'Sugere profundidade, mistério e sofisticação.',
        es: 'Sugiere profundidad, misterio y sofisticación.'
    }
}
```

### 2. `InfoGrid.tsx` -- Resolver idioma antes de renderizar
O componente `InfoGrid` recebe `analysis` com tipo `AnalysisResult` (que tem objetos multilingues), mas o estado em `App.tsx` (linha 84) ja resolve para strings simples via `analysisService.ts`. Portanto a correcao e:

- Atualizar o tipo de `analysis` na prop de `InfoGrid` para `{ description: string; usageTips: string[]; psychology: string }` (que e o tipo ja resolvido pelo service)
- Ou, alternativamente, usar `useLanguage()` dentro do InfoGrid para resolver `analysis.description[language]`

Como o `App.tsx` ja resolve via `analysisService`, a melhor abordagem e ajustar o tipo da prop no InfoGrid para aceitar o formato ja resolvido.

### 3. `LibraryManager.tsx` -- Definir `isStandard`
Adicionar a derivacao da variavel apos as declaracoes existentes:

```ts
const isStandard = currentLibraryName === t.standardLibrary;
```

Isso determina se a biblioteca selecionada e a padrao (nao pode ser exportada/deletada).

---

## Secao Tecnica -- Arquivos e Mudancas

| Arquivo | Mudanca |
|---|---|
| `src/tools/unbscolor/data/colorAnalysis.ts` | Converter ~70 entradas de string simples para formato `{en, pt, es}` |
| `src/tools/unbscolor/components/InfoGrid.tsx` | Atualizar tipo de `analysis` na interface para `{ description: string; usageTips: string[]; psychology: string } | null` |
| `src/tools/unbscolor/components/LibraryManager.tsx` | Adicionar `const isStandard = currentLibraryName === t.standardLibrary;` apos linha 30 |

### Impacto
- Zero impacto na funcionalidade existente -- os dados continuam iguais, apenas tipados corretamente
- O `analysisService.ts` ja faz a resolucao de idioma, entao o fluxo end-to-end nao muda
- A variavel `isStandard` restaura a logica de mostrar/esconder botoes de gerenciamento de biblioteca

