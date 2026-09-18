/**
 * Regras de aderência ao design system UNBSTOOLS.
 *
 * Origem: `adherence.oxlintrc.json`, nesta mesma pasta, gerado junto com o export do design
 * system (oxlint). Convertido para a configuração plana do ESLint, que é o
 * linter deste projeto. Nenhum seletor ou mensagem foi alterado; só os
 * padrões de import ganharam o prefixo do caminho real da pasta.
 *
 * Dois grupos:
 *  - `contract`: props e variantes válidas de cada componente, mais a regra
 *    de importar pelo `index.js` em vez do arquivo interno. Pega erro de
 *    verdade e vale para todo código que consome o design system.
 *  - `literals`: proíbe hex, px e família de fonte crus, exigindo token.
 *    Só faz sentido em código escrito com os tokens do design system, e por
 *    isso não é aplicado ao app, que usa Tailwind. Veja eslint.config.js.
 *
 * A regra `react/forbid-elements` do arquivo original foi omitida: sua lista
 * de elementos proibidos está vazia e o plugin não está instalado.
 */
export const contract = {
  "no-restricted-imports": ["warn", {"patterns":[{"group":["**/design-system/components/*/*","**/design-system/reference/ui_kits/*/*"],"message":"Import design-system components from 'index.js', not component internals."}]}],
  "no-restricted-syntax": [
    "warn",
    {
      "selector": "JSXOpeningElement[name.name='Person'] > JSXAttribute > JSXIdentifier[name!=/^(?:name|src|initials|key|ref|className|style|children)$/]",
      "message": "<Person> doesn't accept that prop. Declared props: name, src, initials."
    },
    {
      "selector": "JSXOpeningElement[name.name='Badge'] > JSXAttribute > JSXIdentifier[name!=/^(?:children|tone|dot|key|ref|className|style|children)$/]",
      "message": "<Badge> doesn't accept that prop. Declared props: children, tone, dot."
    },
    {
      "selector": "JSXOpeningElement[name.name='Badge'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:accent|invert|neutral|outline|quiet)$/]",
      "message": "<Badge> tone must be one of 'accent' | 'invert' | 'neutral' | 'outline' | 'quiet'."
    },
    {
      "selector": "JSXOpeningElement[name.name='BarDatum'] > JSXAttribute > JSXIdentifier[name!=/^(?:value|label|tone|key|ref|className|style|children)$/]",
      "message": "<BarDatum> doesn't accept that prop. Declared props: value, label, tone."
    },
    {
      "selector": "JSXOpeningElement[name.name='BarDatum'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:ink|gray|accent)$/]",
      "message": "<BarDatum> tone must be one of 'ink' | 'gray' | 'accent'."
    },
    {
      "selector": "JSXOpeningElement[name.name='Crumb'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|icon|key|ref|className|style|children)$/]",
      "message": "<Crumb> doesn't accept that prop. Declared props: label, icon."
    },
    {
      "selector": "JSXOpeningElement[name.name='Button'] > JSXAttribute > JSXIdentifier[name!=/^(?:children|variant|size|icon|iconAfter|disabled|fullWidth|key|ref|className|style|children)$/]",
      "message": "<Button> doesn't accept that prop. Declared props: children, variant, size, icon, iconAfter, disabled, fullWidth."
    },
    {
      "selector": "JSXOpeningElement[name.name='Button'] > JSXAttribute[name.name='variant'] > Literal[value!=/^(?:primary|invert|secondary|ghost)$/]",
      "message": "<Button> variant must be one of 'primary' | 'invert' | 'secondary' | 'ghost'."
    },
    {
      "selector": "JSXOpeningElement[name.name='Button'] > JSXAttribute[name.name='size'] > Literal[value!=/^(?:sm|md|lg)$/]",
      "message": "<Button> size must be one of 'sm' | 'md' | 'lg'."
    },
    {
      "selector": "JSXOpeningElement[name.name='Card'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|actions|children|tone|padding|radius|dot|key|ref|className|style|children)$/]",
      "message": "<Card> doesn't accept that prop. Declared props: label, actions, children, tone, padding, radius, dot."
    },
    {
      "selector": "JSXOpeningElement[name.name='Card'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:raised|quiet|inset|invert)$/]",
      "message": "<Card> tone must be one of 'raised' | 'quiet' | 'inset' | 'invert'."
    },
    {
      "selector": "JSXOpeningElement[name.name='Chip'] > JSXAttribute > JSXIdentifier[name!=/^(?:children|tone|icon|onAdd|key|ref|className|style|children)$/]",
      "message": "<Chip> doesn't accept that prop. Declared props: children, tone, icon, onAdd."
    },
    {
      "selector": "JSXOpeningElement[name.name='Chip'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:light|dark)$/]",
      "message": "<Chip> tone must be one of 'light' | 'dark'."
    },
    {
      "selector": "JSXOpeningElement[name.name='CommandBar'] > JSXAttribute > JSXIdentifier[name!=/^(?:placeholder|value|onChange|onSubmit|suggestions|onSuggestion|actions|width|floating|key|ref|className|style|children)$/]",
      "message": "<CommandBar> doesn't accept that prop. Declared props: placeholder, value, onChange, onSubmit, suggestions, onSuggestion, actions, width, floating."
    },
    {
      "selector": "JSXOpeningElement[name.name='Gauge'] > JSXAttribute > JSXIdentifier[name!=/^(?:value|max|size|thickness|tone|label|caption|key|ref|className|style|children)$/]",
      "message": "<Gauge> doesn't accept that prop. Declared props: value, max, size, thickness, tone, label, caption."
    },
    {
      "selector": "JSXOpeningElement[name.name='Gauge'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:ink|accent)$/]",
      "message": "<Gauge> tone must be one of 'ink' | 'accent'."
    },
    {
      "selector": "JSXOpeningElement[name.name='IconButton'] > JSXAttribute > JSXIdentifier[name!=/^(?:icon|label|size|variant|active|badge|disabled|key|ref|className|style|children)$/]",
      "message": "<IconButton> doesn't accept that prop. Declared props: icon, label, size, variant, active, badge, disabled."
    },
    {
      "selector": "JSXOpeningElement[name.name='IconButton'] > JSXAttribute[name.name='size'] > Literal[value!=/^(?:sm|md|lg)$/]",
      "message": "<IconButton> size must be one of 'sm' | 'md' | 'lg'."
    },
    {
      "selector": "JSXOpeningElement[name.name='IconButton'] > JSXAttribute[name.name='variant'] > Literal[value!=/^(?:surface|quiet|invert|accent)$/]",
      "message": "<IconButton> variant must be one of 'surface' | 'quiet' | 'invert' | 'accent'."
    },
    {
      "selector": "JSXOpeningElement[name.name='InsightPopover'] > JSXAttribute > JSXIdentifier[name!=/^(?:value|delta|deltaTone|children|onDismiss|tone|key|ref|className|style|children)$/]",
      "message": "<InsightPopover> doesn't accept that prop. Declared props: value, delta, deltaTone, children, onDismiss, tone."
    },
    {
      "selector": "JSXOpeningElement[name.name='InsightPopover'] > JSXAttribute[name.name='deltaTone'] > Literal[value!=/^(?:accent|invert)$/]",
      "message": "<InsightPopover> deltaTone must be one of 'accent' | 'invert'."
    },
    {
      "selector": "JSXOpeningElement[name.name='InsightPopover'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:light|dark)$/]",
      "message": "<InsightPopover> tone must be one of 'light' | 'dark'."
    },
    {
      "selector": "JSXOpeningElement[name.name='LegendItem'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|color|value|key|ref|className|style|children)$/]",
      "message": "<LegendItem> doesn't accept that prop. Declared props: label, color, value."
    },
    {
      "selector": "JSXOpeningElement[name.name='MetricBlock'] > JSXAttribute > JSXIdentifier[name!=/^(?:value|caption|prefix|delta|deltaTone|size|align|key|ref|className|style|children)$/]",
      "message": "<MetricBlock> doesn't accept that prop. Declared props: value, caption, prefix, delta, deltaTone, size, align."
    },
    {
      "selector": "JSXOpeningElement[name.name='MetricBlock'] > JSXAttribute[name.name='deltaTone'] > Literal[value!=/^(?:accent|invert)$/]",
      "message": "<MetricBlock> deltaTone must be one of 'accent' | 'invert'."
    },
    {
      "selector": "JSXOpeningElement[name.name='MetricBlock'] > JSXAttribute[name.name='size'] > Literal[value!=/^(?:hero|lg|md|sm)$/]",
      "message": "<MetricBlock> size must be one of 'hero' | 'lg' | 'md' | 'sm'."
    },
    {
      "selector": "JSXOpeningElement[name.name='MetricBlock'] > JSXAttribute[name.name='align'] > Literal[value!=/^(?:left|center)$/]",
      "message": "<MetricBlock> align must be one of 'left' | 'center'."
    },
    {
      "selector": "JSXOpeningElement[name.name='NavRailItem'] > JSXAttribute > JSXIdentifier[name!=/^(?:value|label|icon|iconActive|badge|key|ref|className|style|children)$/]",
      "message": "<NavRailItem> doesn't accept that prop. Declared props: value, label, icon, iconActive, badge."
    },
    {
      "selector": "JSXOpeningElement[name.name='SearchInput'] > JSXAttribute > JSXIdentifier[name!=/^(?:size|detached|tone|trailing|key|ref|className|style|children)$/]",
      "message": "<SearchInput> doesn't accept that prop. Declared props: size, detached, tone, trailing."
    },
    {
      "selector": "JSXOpeningElement[name.name='SearchInput'] > JSXAttribute[name.name='size'] > Literal[value!=/^(?:sm|md|lg)$/]",
      "message": "<SearchInput> size must be one of 'sm' | 'md' | 'lg'."
    },
    {
      "selector": "JSXOpeningElement[name.name='SearchInput'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:light|dark)$/]",
      "message": "<SearchInput> tone must be one of 'light' | 'dark'."
    },
    {
      "selector": "JSXOpeningElement[name.name='SectionLabel'] > JSXAttribute > JSXIdentifier[name!=/^(?:children|tone|size|key|ref|className|style|children)$/]",
      "message": "<SectionLabel> doesn't accept that prop. Declared props: children, tone, size."
    },
    {
      "selector": "JSXOpeningElement[name.name='SectionLabel'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:accent|ink|muted)$/]",
      "message": "<SectionLabel> tone must be one of 'accent' | 'ink' | 'muted'."
    },
    {
      "selector": "JSXOpeningElement[name.name='SectionLabel'] > JSXAttribute[name.name='size'] > Literal[value!=/^(?:sm|md)$/]",
      "message": "<SectionLabel> size must be one of 'sm' | 'md'."
    },
    {
      "selector": "JSXOpeningElement[name.name='SeriesOption'] > JSXAttribute > JSXIdentifier[name!=/^(?:value|label|color|key|ref|className|style|children)$/]",
      "message": "<SeriesOption> doesn't accept that prop. Declared props: value, label, color."
    },
    {
      "selector": "JSXOpeningElement[name.name='Switch'] > JSXAttribute > JSXIdentifier[name!=/^(?:checked|onChange|label|disabled|key|ref|className|style|children)$/]",
      "message": "<Switch> doesn't accept that prop. Declared props: checked, onChange, label, disabled."
    },
    {
      "selector": "JSXOpeningElement[name.name='TabItem'] > JSXAttribute > JSXIdentifier[name!=/^(?:value|label|key|ref|className|style|children)$/]",
      "message": "<TabItem> doesn't accept that prop. Declared props: value, label."
    }
  ],
};

export const literals = {
  "no-restricted-syntax": [
    "warn",
    {
      "selector": "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
      "message": "Raw hex color — use a design-system color token via var()."
    },
    {
      "selector": "Literal[value=/\\b\\d+px\\b/]",
      "message": "Raw px value — use a design-system spacing token via var()."
    },
    {
      "selector": "Literal[value=/font-family\\s*:\\s*(?!['\\\"]?(?:BDO Grotesk))/i]",
      "message": "Font not provided by the design system. Available: BDO Grotesk."
    }
  ],
};

export default { contract, literals };
