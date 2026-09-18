# UNBS Suite

Quatro ferramentas de design que rodam inteiras no navegador, sem cadastro e sem enviar arquivo para servidor nenhum.

| Ferramenta | O que faz |
| --- | --- |
| **UNBSCOLOR** | Converte entre HEX, RGB, CMYK, HSL, LAB e OKLCH, acha a referência mais próxima por Delta E 2000 em paletas abertas (Tailwind, Open Color, Radix, Material) ou em bibliotecas que a pessoa importa (.acb, .ase, UNBS JSON), monta paletas, verifica contraste (WCAG e APCA), simula daltonismo e exporta em CSS, Tailwind, tokens, ASE e GPL. |
| **UNBSGRID** | Analisa um logo em SVG: 50 construções geométricas sobre o desenho real, métricas de proporção e equilíbrio, diagnóstico com nota, medição no canvas, comparação entre versões, folha de manual de marca e exportação em SVG por camadas, PNG e PDF. |
| **UNBSFORMAT** | Grades editoriais com colunas e linhas reais sobre a linha de base, cânones clássicos (Van de Graaf, Villard, Tschichold, Müller-Brockmann, Gerstner), formatos conferidos e PDF com sangria e marcas de corte. |
| **UNBSFONT** | Editor de fontes: desenho de glifos, espaçamento, kerning e exportação em OTF. |

## Começando

Precisa de Node.js e npm ([instale com nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```bash
npm install
npm run dev
```

O aplicativo sobe em `http://localhost:8080`.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run preview` | serve o build |
| `npm test` | testes, uma passada |
| `npm run test:watch` | testes em observação |
| `npm run lint` | ESLint |
| `npm run design-system` | referência visual do design system, em `http://localhost:4180` |

## Como está organizado

```
src/
  pages/             uma página por rota
  components/        chrome do portal e componentes shadcn/ui
  tools/<nome>/      cada ferramenta, autocontida, com seus próprios testes
  index.css          design system do aplicativo: tokens e classes
design-system/       design system UNBSTOOLS, com tokens, componentes e referência visual
AGENTS.md            instruções para agentes de código
```

Cada ferramenta é carregada sob demanda: a página inicial baixa cerca de 330 KB, e o restante só chega quando a ferramenta é aberta.

## Design system

O app roda no design system **UNBSTOOLS**: página off-white, tinta preta, linhas finas, uma família tipográfica (BDO Grotesk, embutida no build) e uma única cor saturada, o amarelo Unserved `#F0FF00`, usada como ponteiro e não como tinta. Seleção é preenchimento preto com glifo branco.

A fonte da verdade fica em [design-system/](design-system/README.md), com tokens, 19 componentes de referência, 23 cartões de especificação e três kits de tela. O aplicativo carrega esses valores em `src/index.css` e `tailwind.config.ts`, convertidos para os nomes de token que os componentes já usavam.

```bash
npm run design-system   # abre o índice da referência visual
```

## Publicação

O projeto é publicado pelo [Lovable](https://lovable.dev) (Share, depois Publish) e também funciona na Vercel. `vercel.json`, `public/_redirects` e `public/404.html` fazem o roteamento da página única; mantenha os três em sincronia.

Para conectar um domínio no Lovable: Project, Settings, Domains, Connect Domain. [Documentação](https://docs.lovable.dev/features/custom-domain#custom-domain).

## Contribuindo

Leia [AGENTS.md](AGENTS.md): traz a pilha, os comandos, as classes do design system e as armadilhas de cada ferramenta. Vale para pessoas e para agentes.

Antes de abrir mudança: checagem de tipos limpa (`npx tsc --noEmit -p tsconfig.app.json`), `npm test` verde e `npm run lint` sem problemas novos.
