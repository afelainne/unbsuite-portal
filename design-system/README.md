# UNBSTOOLS Design System

**UNBSTOOLS** is a modern, clean platform of tools for designers — a workspace where tools, kits, tokens, renders and exports live in one place, with an AI assistant sitting permanently at the bottom of the screen. The system covers three surfaces: the **workspace app**, the **marketing site**, and the **mobile app**.

The visual language is deliberately austere: an off-white canvas, black ink, hairline rules, dense hairline data charts, and exactly one saturated colour — the Unserved yellow `#F0FF00` — used as a pointer rather than as paint.

---

## Sources used to build this system

Everything here is derived from material the user supplied in this project. There was no codebase, Figma file or repository to read.

| Source | What it gave us |
| --- | --- |
| `uploads/Ledgerix_01 … _19.png` (19 PNG boards, a presentation-style case study for an AI financial dashboard credited to "RON Design") | The complete visual language: palette sheet with exact hexes, typography sheet naming the typeface and the 36/24/16px ramp, a "UI STRUCTURE" spec giving the 52px nav square and 18px glyph, plus dashboard, mobile, landing-page and environmental-branding boards. |
| Brief text: *"VISUAL SYSTEM UNBSTOOLS — plataforma de ferramentas para designer, moderna e clean, agradável visualmente e com as melhores práticas de UI/UX"* | Product definition, audience (designers) and tone. |

**Important framing.** The uploaded boards are a *style reference*, not UNBSTOOLS' own product screens, and the brand shown on them belongs to a third party. This system therefore lifts only the reusable foundations — palette, typeface, scale, component geometry, layout rhythm, chart language — and applies them to UNBSTOOLS' own content. No third-party logo, wordmark or brand copy was reproduced.

### Substitutions and gaps — please confirm

| Gap | What we did | What we need from you |
| --- | --- | --- |
| **Logo** | The UNBSTOOLS wordmark is a vector file, `assets/logo/unbstools-wordmark.svg`, drawn in `currentColor` so it takes the ink of wherever it sits. The app renders it through `src/components/UnbsLogo.tsx`. |
| **No icon assets** | Substituted **Phosphor Icons** (CDN web font, `regular` + `fill` + `bold` weights) — the closest match to the reference's geometric glyph set with true filled variants for selected states. | Your own icon set, if one exists. |
| **No photography or illustration** | Every image position is a labelled flat inset slot (`--bg-inset`). Nothing was generated. | Product screenshots, team photos, app-store imagery. |
| **No real avatars** | Avatars render initials on `--light-gray`. | Team photos, or keep initials. |
| **Fonts** | BDO Grotesk, vendored as seven static OpenType files (Light to Black) in `assets/fonts/`. Urbanist, the previous family, stays there under the SIL OFL as the fallback that exported SVGs load from Google Fonts. |

---

## Content fundamentals

**Voice.** Plain, causal, numerate. The product explains *why* a number moved, in one sentence, with no adjectives. It never celebrates.

**Person.** Address the reader as **you** on marketing surfaces ("Your workspace, always within reach"). Inside the product, use **we/our** only in the assistant's own suggested questions ("What is our export volume?") — that mirrors how a team actually talks about its own data. Never "I".

**Casing.**
- Marketing headlines: **UPPERCASE**, with weight doing the emphasis — Regular sets up, Bold lands the point. *"EMPOWERING GROWTH THROUGH **SMART TOOLING**"*.
- Product headings and page titles: sentence case, Regular weight. *"Overview"*, *"Why did exports change?"*
- Section markers and card labels: written sentence case in source, **rendered uppercase** by the component with `0.08em` tracking. *"Quick actions"*, *"Half-year production statement"*.
- Chart annotations: **lowercase start, no terminal period**. *"asset exports grew through the half-year"*.

**Sentence length.** Body copy runs one to two sentences per block, 30–45 characters per line. If a paragraph needs a third sentence it probably needs a card of its own.

**Numbers.** Always tabular figures. Thousands use a comma (`1,651,045`); abbreviated magnitudes use a comma as the decimal mark, matching the reference boards (`17,2k`, `93,5k`). Deltas always carry a sign and a percent (`+32%`, `+10%`).

**Emoji: never.** Not in product, not in marketing, not in commit-adjacent copy. The yellow dot is the system's only decorative glyph.

**Vibe.** Confident, quiet, slightly clinical — a measuring instrument rather than a cheerleader. Examples of the register:

> "Smarter design tooling. Powered by AI."
> "UNBSTOOLS keeps every tool, kit and export in one workspace, so designers ship faster without leaving the canvas."
> "Which exports failed this week?"
> "render load rose with the new 3D pipeline"

Avoid: exclamation marks, "unlock", "supercharge", "next-gen", "we're so excited", any sentence that would read the same for any SaaS product.

---

## Visual foundations

### Colour
Five defined hexes, and nothing else invented at the base layer: **Black `#000000`**, **White `#FFFFFF`**, **Yellow `#F0FF00`** (the Unserved yellow; it replaced Mint `#75FB90` as the signal colour), **Gray `#AAA9AB`**, **Light gray `#DBDADD`**. On top of those, the system derives a canvas/surface ramp (`#EFEFF1` page, `#E6E6E8` inset, `#F7F7F8`/`#F2F2F3` quiet surfaces) and an ink ramp (`#000`, `#3A3A3C`, `#6E6D70`, `#AAA9AB`).

**Yellow discipline is the single most important rule in this system.** Yellow is a pointer: the one committing button, the one positive delta, the one highlighted bar, the AI launcher square, the section dot. More than about three yellow elements on a screen and the system stops working. There is no red, amber or blue anywhere — negative and neutral states are expressed in ink, not in hue.

**Charts** use `--series-1..4` in order: black → yellow → mid-gray → light-gray. No other colour ever enters a chart.

### Type
One family: **BDO Grotesk** (static, Light 300 to Black 900), vendored locally — it is what makes big numerals read as instrument readouts rather than as marketing.

The scale the source spec defines, extended on the same ramp:

| Role | Size / line-height / weight |
| --- | --- |
| Display XL | 88 / 1.02 / Regular, `-0.02em` — one hero number or headline per screen |
| Display M | 44 / 1.14 / Regular |
| A1 Heading | **36 / 1.14 / SemiBold** *(source spec)* |
| H2 | 28 / 1.2 / Regular |
| B1 Subheading | **24 / 1.35 / Regular** *(source spec)* |
| C1 Body | **16 / 1.5 / Regular** *(source spec)* |
| Body S | 14 / 1.35 — cards, legends, table rows |
| Caption | 12 — axis ticks, metadata |
| Micro label | 11 / Medium / uppercase / `0.08em` — the only tracked style |

Headline weight-mixing inside one sentence is a signature move. Never bold a micro label; never track anything other than the micro label.

### Spacing & layout
4px base grid. The measurements that matter: **card padding 24**, **card gap 20**, **section rhythm 64** (96 between marketing sections), **page gutter 40** (20 on mobile), **max content 1240**. Controls are 32 / 40 / 48 tall; the nav and toolbar square is **52px with an 18px glyph** — the one hard number the source spec states outright.

Layout is a centred single column with generous empty space. The workspace header is a three-column grid (brand · nav · account) so the nav rail stays optically centred. Marketing sections open with a section marker on the left and the headline on the right, separated by a hairline and a three-item meta row. The workspace title row and the command bar are the only fixed/floating elements.

### Backgrounds
Flat tint only. `#EFEFF1` page, `#E6E6E8` for recessed frames around media or mocks. **No gradients as decoration** — the one permitted gradient is inside a bar (`yellow-400 → yellow-050`) marking the winning column of a survey chart. No textures, no patterns, no hand-drawn illustration, no full-bleed photographic heroes. Imagery, where it exists, is cool-toned, desaturated, and always sits inside a rounded inset frame — never bled to the page edge.

### Corners
Symmetric, always: 6 (xs) · 10 (sm) · 12 (md, controls and icon buttons) · 16 (lg, cards) · 20 (xl, panels and mock chrome) · 28 (2xl) · pill (badges, switches, dots). Avatars are 6px-radius squares, not circles. **Never a single-side radius, never a coloured left border.**

### Cards
White (`--surface-card`), 16px radius, 1px `#E8E7EA` hairline, and `--shadow-2` (`0 2px 8px rgba(0,0,0,.05)`) — barely visible. A card on white uses the `quiet` tone (`#F7F7F8`) with no shadow at all. Exactly one `invert` (black) card per view, maximum. Card header = uppercase micro label left, two 32px quiet icon buttons right. Inside, value sits above its caption with 4px between them.

### Shadow system
Four steps, all neutral, all low-opacity: `1` hover lift, `2` cards, `3` popovers, `4` the floating command bar and product mocks. There is no inner-shadow system; fields use a 1px inset ring instead (`inset 0 0 0 1px`), which turns black on focus. Separation is done with hairlines and surface-tint changes far more often than with shadow.

### Transparency & blur
Used in exactly three places, always `blur(14px) saturate(120%)`: the chart insight popover (72% light or dark), the sticky marketing header (78% canvas), and the suggested-prompt rail tucked behind the command bar (82% `#3A3A3C`). Everything else is opaque. Blur is for things that float *over* content — never for decoration.

### Motion
Short, flat, no bounce. `90ms` icon/colour swaps · `140ms` hover and focus · `200ms` chart and panel transitions · `320ms` route changes. Easing is `cubic-bezier(.16,1,.3,1)` (out) or `cubic-bezier(.4,0,.2,1)` (in-out). Fades and single-axis slides only — no scale-ins, no springs, no staggered entrances, no scroll-jacking.

### States
| State | Treatment |
| --- | --- |
| Hover | Fill one step darker: yellow-400 → yellow-500, black → `#2A2A2C`, white/quiet → `#F2F2F3`. Cards go shadow-2 → shadow-3. |
| Press | `transform: scale(.985)` over 90ms. No colour change beyond hover. |
| Focus | 3px `--yellow-400` ring (`--ring-focus`); text fields instead switch their 1px inset ring to black. |
| Selected | **Black fill, white glyph.** This is how selection reads everywhere — nav rail, pill tabs, active icon buttons. |
| Disabled | 38% opacity. Never a gray repaint, never a different fill. |

---

## Iconography

**System:** Phosphor Icons, loaded from CDN (`@phosphor-icons/web@2.1.1`) in `regular`, `fill` and `bold` weights. This is a **flagged substitution** — no icon files were supplied. Phosphor was chosen because the reference glyphs are geometric with rounded terminals and appear in both outline and solid form, and Phosphor is the closest CDN set with a true `fill` weight.

**Usage rules**
- Resting glyphs use `ph` (regular). Selected glyphs use `ph-fill`, white on black. That outline→fill swap plus the black chip is the whole selection language.
- Glyph size is **18px** inside a 52px square, **14px** inside 32px controls, 24px only for a feature icon inside a marketing benefit card.
- Icons are never coloured. They are ink, white-on-black, or black-on-yellow (the AI launcher). Never yellow-on-white.
- Icon-only controls always carry an `aria-label` — `IconButton` requires it.
- **Emoji are never used.** Unicode characters are used as icons in exactly one place: the `/` separator in a breadcrumb.
- No hand-drawn SVG. Data visualisation is the exception: `Gauge` draws an arc and `BarSeries` draws bars, because those are data, not iconography.

Feature icons on marketing cards sit in a 40px yellow square with a black glyph — the only place a filled yellow container holds an icon other than the AI launcher.

---

## Como este sistema entra no app

O app **roda neste sistema**. Os valores desta pasta são a fonte da verdade; `src/index.css` os carrega convertidos para os nomes de token que o Tailwind e os componentes do app já usavam, então nada precisou ser reescrito componente a componente.

| O que | Onde está a fonte | Como chega ao app |
| --- | --- | --- |
| Fonte BDO Grotesk | `assets/fonts/` e `tokens/fonts.css` | `src/index.css` importa `tokens/fonts.css`; o Vite embute os arquivos no build, sem requisição externa |
| Cor, raio, sombra, motion | `tokens/*.css` | convertidos para os tripletos HSL do Tailwind no bloco `:root` de `src/index.css` |
| Escala tipográfica | `tokens/typography.css` | classes `text-display`, `text-title-*`, `text-headline`, `label` em `src/index.css` |
| Regras de estado | `README.md`, seção Visual foundations | implementadas em `.ctl`, `.segmented-item`, `.row`, `.field` |

**Três diferenças conscientes entre o sistema e o app:**

1. **Corpo de texto em 14px**, não 16. O sistema chama esse passo de body-s e o reserva para cartões, legendas e linhas de tabela — que é exatamente o conteúdo destas ferramentas. Títulos seguem a escala cheia.
2. **Destrutivo continua vermelho.** O sistema não define vermelho, âmbar nem azul, mas uma interface que apaga arquivo precisa de uma cor para isso.
3. **Ícones são os do lucide-react**, não Phosphor. Trocar a biblioteca inteira mudaria centenas de chamadas sem ganho visual relevante; os dois conjuntos são geométricos.

Os componentes React desta pasta (`components/`) continuam sendo material de referência: o app usa os seus próprios, em TypeScript e Tailwind, que agora renderizam com estes valores. Os nomes colidem — `Button`, `Badge`, `Card`, `Switch`, `Tabs` existem dos dois lados — então, ao usar os daqui numa tela, renomeie na importação:

```jsx
import { Button as DSButton, MetricBlock } from "../../design-system";
```

Uma tela que use os componentes daqui precisa dos tokens, que já estão carregados globalmente pelo app.

## Verificação automática

`adherence.eslint.js` traz as regras de aderência que vieram no export, convertidas para a configuração plana do ESLint:

- **`contract`** — props e variantes válidas de cada componente, e a exigência de importar pelo `index.js`. Ligado em `eslint.config.js` para os arquivos de entrada desta pasta.
- **`literals`** — proíbe hex, px e família de fonte crus, exigindo token. Desligado por padrão: o app é Tailwind e carrega cor em hexadecimal como dado. Ligue por pasta quando escrever contra os tokens.

A regra `react/forbid-elements` do arquivo original foi omitida, porque a lista de elementos proibidos está vazia e o plugin não está instalado.

## Índice

### Raiz
| Arquivo | O que é |
| --- | --- |
| `styles.css` | Ponto de entrada dos tokens. Só uma lista de `@import`. |
| `index.js` / `index.d.ts` | Entrada pública dos 19 componentes, com tipos. |
| `adherence.eslint.js` | Regras de aderência convertidas para o ESLint. |
| `adherence.oxlintrc.json` | O arquivo de aderência original do export (oxlint), guardado como origem da conversão. |
| `serve.mjs` | Servidor estático da referência visual, sem dependências. |
| `README.md` | Este guia. |
| `SKILL.md` | Front-matter que faz esta pasta funcionar como skill do Claude Code. |

### `tokens/`
`fonts.css` (`@font-face` da BDO Grotesk, um por peso) · `colors.css` · `typography.css` · `spacing.css` · `radius.css` · `elevation.css` · `motion.css` · `base.css` (reset mínimo, `a`/`a:hover` e duas classes utilitárias).

### `assets/`
`fonts/BDOGrotesk-*.otf` (sete pesos), `fonts/Urbanist[wght].ttf`, `fonts/Urbanist-Italic[wght].ttf`, `fonts/Urbanist-OFL.txt`, `logo/unbstools-wordmark.svg`.

### `components/`
Agrupados por função. Cada componente é `<Nome>.jsx` + `<Nome>.d.ts` + `<Nome>.prompt.md`.

**`core/`** — `Button`, `IconButton`, `Badge`, `Chip`, `Card`, `SectionLabel`
**`forms/`** — `SearchInput`, `SeriesToggle`, `Tabs`, `Switch`
**`data/`** — `MetricBlock`, `LegendList`, `Gauge`, `BarSeries`, `InsightPopover`
**`navigation/`** — `NavRail`, `Breadcrumb`, `AvatarStack`, `CommandBar`

Cada uma das 19 famílias tem contraparte nas pranchas de origem. **Adições intencionais** (duas, sinalizadas nos arquivos `.prompt.md`):
- `Switch` — as pranchas não mostram um interruptor, mas automações e configurações precisam de um. Segue o par de estado ligado da marca: trilho amarelo, botão preto.
- `SearchInput` fora da busca — as pranchas só mostram um campo de busca, então ele serve como campo de uma linha do sistema, em vez de inventar um `Input` separado.

### `reference/` — especimens visuais
Abra `reference/index.html` para o índice navegável dos 33 arquivos.

```bash
npm run design-system     # http://localhost:4180
```

| Pasta | Conteúdo |
| --- | --- |
| `reference/guidelines/` | 23 cartões de especificação, agrupados em **Colors**, **Type**, **Spacing** e **Brand**. HTML e CSS puros: abrem direto do disco. |
| `reference/components/` | 4 cartões, um por grupo de componentes, renderizando as variantes ao vivo. |
| `reference/ui_kits/` | Três kits de tela: **workspace** (1440px: Overview, Library, Automations, Usage), **site** (1440px: hero, benefícios, planos, rodapé) e **mobile** (390×844: Overview, Library, Settings). Cada um tem seu próprio `README.md`. |
| `reference/_ds_bundle.js` | Cópia empacotada dos componentes, usada só pelas páginas de referência através de `window.DS`. Não é a fonte: a fonte é `components/`. |
| `reference/thumbnail.html` | Capa do sistema. |

**Os kits e os cartões de componente precisam de servidor.** Eles carregam as telas com `<script type="text/babel" src="Tela.jsx">`, e o Babel busca esses arquivos em tempo de execução: abrir do disco (`file://`) bloqueia a busca, e servir pelo Vite do app reescreve o `.jsx` antes de o navegador ver. Use `npm run design-system`. Os cartões de `guidelines/` não têm essa restrição.

**Dependências externas.** Os kits e os cartões de componente carregam React, Babel e os ícones Phosphor por CDN, então precisam de internet. Os cartões de guideline funcionam offline.
