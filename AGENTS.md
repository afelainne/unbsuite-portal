# AGENTS.md

Instruções para agentes de código neste repositório. É a fonte da verdade; `CLAUDE.md` apenas importa este arquivo.

## O que é o projeto

**UNBS Suite** — quatro ferramentas de design independentes, num único aplicativo de página única, sem servidor próprio e sem cadastro. Tudo roda no navegador do usuário.

| Rota | Ferramenta | O que faz |
| --- | --- | --- |
| `/` | Portal | Índice das ferramentas, com busca |
| `/unbscolor` | UNBSCOLOR | Conversão de cor, referência mais próxima (paletas abertas e bibliotecas importadas), paletas, contraste, escala tonal |
| `/unbsgrid` | UNBSGRID | Análise de logo em SVG: 50 construções geométricas, métricas, diagnóstico, folha de marca |
| `/unbsformat` | UNBSFORMAT | Grades editoriais: colunas e linhas sobre a linha de base, cânones clássicos, formatos, PDF com sangria |
| `/unbsfont` | UNBSFONT | Editor de fontes: glifos, espaçamento, kerning, export OTF |

## Como rodar

```bash
npm install
npm run dev              # http://localhost:8080
npm test                 # Vitest, uma passada
npm run lint             # ESLint
npm run build            # build de produção
npm run design-system    # referência visual do design system, http://localhost:4180
npx tsc --noEmit -p tsconfig.app.json   # checagem de tipos
```

**Antes de entregar qualquer mudança:** checagem de tipos limpa, `npm test` verde e `npm run lint` sem problemas novos. O lint tem uma baseline conhecida de 6 erros e 67 avisos herdados; não aumente esse número.

## Pilha

React 18.3, Vite 5.4, TypeScript 5.8, Tailwind 3.4, shadcn/ui (estilo `default`, `baseColor` slate, variáveis CSS), React Router 6, TanStack Query, Vitest com jsdom, paper.js no UNBSGRID, opentype.js e fonteditor-core no UNBSFONT.

Tailwind fica na versão 3 de propósito. O shadcn/ui segue suportando v3; migrar para v4 move a configuração para dentro do CSS e não traz ganho para este app.

Cada ferramenta é carregada sob demanda em `src/App.tsx`. A página inicial carrega cerca de 330 KB; as ferramentas mais pesadas são o UNBSGRID (paper.js, cerca de 1 MB) e o UNBSFONT, e cada uma só carrega quando aberta. **Não importe ferramenta de forma estática no roteador.**

## Estrutura

```
src/
  components/        chrome do portal (Header, ToolLayout) e ui/ do shadcn
  pages/             uma página por rota
  tools/<nome>/      cada ferramenta, autocontida
    lib/ ou utils/   lógica pura, testada
    components/      interface da ferramenta
    __tests__/       testes da ferramenta
  tools/_shared/ui/  controles compartilhados entre ferramentas
  index.css          tokens e classes de componente, carregados do design system
design-system/       design system UNBSTOOLS: fonte da verdade (leia o README de lá)
```

## Design system

O app roda no design system **UNBSTOOLS**. A fonte da verdade é `design-system/` (leia o README de lá); `src/index.css` e `tailwind.config.ts` carregam aqueles valores com os nomes de token que os componentes já usam. Use as classes de lá, não invente estilo solto:

- **Controles:** `ctl` mais variante (`ctl-filled`, `ctl-outline`, `ctl-plain`, `ctl-gray`, `ctl-tinted`, `ctl-danger`), tamanho (`ctl-sm`, `ctl-lg`, `ctl-icon`) e `ctl-active` quando ligado.
- **Campos:** `field`, `field-sm`, `field-mono`. Sliders: `tool-slider`. Caixas de seleção: `ctl-check`.
- **Superfícies:** `material-card`, `material-chrome`, `material-sidebar`, `material-popover`, `material-sheet`, e `hairline-t|b|l|r` no lugar de borda.
- **Outros:** `segmented` com `segmented-item is-active`, `chip` e variantes, `row` para item de lista, `panel-section-head`, `label` para rótulo.
- **Texto:** `text-display`, `text-title-1|2|3`, `text-headline`, `text-body`, `text-callout`, `text-subhead`, `text-footnote`, `text-caption`, `text-value` para número.

Regras do sistema, que valem para qualquer tela nova:

- **O amarelo é ponteiro, não tinta.** O amarelo Unserved `#F0FF00` marca a ação que confirma, a variação positiva, a barra em destaque. Mais de três elementos amarelos numa tela e o sistema para de funcionar.
- **Seleção é preenchimento preto com glifo branco**, em toda parte: aba ativa, item selecionado, botão de ícone ligado. Não use o amarelo para escolha.
- **O amarelo nunca vira cor de texto sobre fundo claro** (1,1 para 1 contra branco). Texto na cor de sinal usa `--accent-ink`, o passo oliva `#5F6600`.
- **Uma família só, BDO Grotesk**, embutida no build (sete pesos, de Light a Black). Mono só em valor numérico.
- **Um único estilo com tracking**, o rótulo micro (`label`), em caixa alta e 0.08em. Nada mais é tracked.
- **Página off-white, cartão branco.** É assim que o cartão se levanta da página.
- Raio `sm` em item pequeno, `md` em controle, `lg` em cartão, `xl` em folha, sempre simétrico.
- Movimento de 90 a 320ms, plano, sem salto. `duration-fast ease-out`, nunca `transition-all`.
- Texto de interface em português, em frase. Todo `<button>` com `type="button"`; botão só com ícone com `aria-label`.

**Cor que é dado nunca vira token.** Amostras de cor, paletas, cores de construção geométrica e valores hexadecimais digitados pelo usuário continuam como estão.

## Armadilhas por ferramenta

- **UNBSGRID.** Todo SVG que entra passa por `lib/svg-sanitize.ts` antes de chegar ao paper.js: o import anexa o documento ao DOM. Use `resetPaperProject` em vez de `paper.setup`, que vaza projeto a cada chamada. Toda medida decorativa (traço, tracejado, rótulo, ponto) vem de `components/renderers/scale.ts`, para a exportação grande não virar fio de cabelo. Construções se baseiam na tinta real do desenho, não na caixa que a envolve.
- **UNBSCOLOR.** Nenhum dado de biblioteca licenciada entra no código nem no build: o app traz só paletas abertas (`data/open/`, licença de cada uma no README de lá) e o resto é importado pela pessoa em Ajustes → Bibliotecas (`.acb`, `.ase`, UNBS JSON, formato em `data/LIBRARY_FORMAT.md`), lido no navegador e guardado no IndexedDB. Não embuta bibliotecas de terceiros nem cite marca de livro de cor na interface. Tudo que lê bibliotecas passa por `libraries/store.ts`. `findReferenceMatches` tem cache por array; não contorne. Texto interpolado em SVG de exportação passa por `escapeXml`.
- **UNBSFONT.** Tem modo escuro próprio: a classe `dark` é aplicada na raiz da ferramenta, e os editores ficam dentro de um contêiner que a herda.
- **Todas.** Acesso ao `localStorage` sempre dentro de `try/catch`. Download com `setTimeout` antes de liberar a URL do objeto, senão o navegador cancela.

## Limites

- Não altere a paleta, a tipografia ou o reset global sem pedido explícito. Para mudar um valor do sistema, mude em `design-system/tokens/` e reflita no bloco `:root` de `src/index.css`.
- Não importe `design-system/styles.css` no app: ele traz um reset próprio que conflita com o Tailwind. O app já recebe os tokens pelo `:root`.
- Não mexa em `.env`, `supabase/` nem `.lovable/`.
- O projeto é publicado pelo Lovable e pela Vercel. `public/_redirects`, `public/404.html` e `vercel.json` fazem o roteamento da página única funcionar; mantenha os três em sincronia.
