

# Otimizacao Visual do Painel UNBSGRID

## Objetivo
Tornar o painel lateral do UNBSGRID mais compacto e usavel, alinhando seu visual ao estilo do UNBSCOLOR. Cores oficiais: `#F0FF00` (detalhes), `#232323` (preto), `#E8E8E3` (fundo geral). Nenhuma funcao sera removida.

## Mudancas Planejadas

### 1. Cores e Tema do UNBSGRID
O UNBSGRID usa variaveis CSS do tema dark (`bg-sidebar`, `bg-canvas`, etc). O UNBSCOLOR usa fundo branco com texto preto, visual clean e minimalista. Vamos:
- Alterar o sidebar do UNBSGRID para usar fundo `#E8E8E3` em vez de branco puro
- Textos em `#232323` 
- Acentos/destaques em `#F0FF00`
- Canvas area mantem fundo escuro (padrao do app)
- Botoes de acao e preset chips usam `#F0FF00` com texto `#232323` quando ativos

### 2. Compactar o Painel Lateral (sidebar 300px)

**SVG Upload** -- Manter como esta, ja compacto.

**SVG Color + SVG Outline + Interpretation Mode** -- Agrupar numa unica secao colapsavel "SVG Settings":
- SVG Color: paleta de cores em linha (ja esta ok, manter)
- Outline toggle + label numa unica linha
- Interpretation toggle + label numa unica linha  
- Opcoes expandidas do outline (espessura, estilo, terminacao) aparecem apenas quando outline esta ativo

**Presets** -- Reduzir espacamento:
- Chips de preset em 2 colunas mais compactas
- Botoes Carregar/Salvar lado a lado (ja estao, manter)

**Canvas Background** -- Inline: Label + Select na mesma linha (em vez de empilhados)

**Clearspace** -- Inline:
- Value + Unit na mesma linha (Input + UnitSelector lado a lado)
- Em vez de labels separados empilhados

**Construction Grid** -- Compactar:
- Show Grid toggle + Subdivisions input na mesma linha quando ativo
- Invert Components toggle compacto

**Construction Geometry** -- Manter como esta (ja usa collapsibles)

### 3. Remover o Logo grande do topo do sidebar
O `Logo` component renderiza um SVG de ~80px de altura no topo. Isso desperica espaco. Substituir por uma versao menor inline ou remover (ja tem o header do hub com "UNBSGRID").

### 4. Botoes de Export no rodape
- Manter o layout atual mas com estilo `#F0FF00` bg + `#232323` texto no botao principal
- PNG 1x/2x/4x em chips compactos

### 5. Estilo dos componentes internos
- `bg-sidebar` -> `#E8E8E3`
- `border-sidebar-border` -> `#D0D0C8` (borda mais suave)
- `text-muted-foreground` -> `#888`
- Selects, inputs, switches com borda `#C0C0B8`
- Switch ativo com cor `#F0FF00`
- Checkbox ativo com cor `#232323`

---

## Secao Tecnica

### Arquivos a editar

| Arquivo | Mudanca |
|---|---|
| `src/tools/unbsgrid/pages/Index.tsx` | Agrupar secoes SVG Color/Outline/Interpretation em colapsavel unico. Inline Canvas bg. Inline Clearspace value+unit. Reduzir logo. Aplicar cores `#E8E8E3`/`#232323`/`#F0FF00` via classes inline/style |
| `src/tools/unbsgrid/components/PreviewCanvas.tsx` | Toolbar com cores alinhadas ao novo tema |
| `src/tools/unbsgrid/components/PresetManager.tsx` | Chips com cores `#F0FF00` quando ativos |
| `src/tools/unbsgrid/components/SVGDropZone.tsx` | Borda e hover com cores do tema |

### Abordagem de implementacao
- Aplicar estilos diretamente via `style={{}}` e classes Tailwind inline nos componentes do UNBSGRID
- Nao alterar variaveis CSS globais (para nao afetar UNBSCOLOR ou o hub)
- Manter toda a logica de estado, callbacks e props inalterada
- Apenas reorganizar JSX e ajustar classNames/styles

### Impacto
- Zero impacto na funcionalidade -- apenas reorganizacao visual e tematica
- O sidebar fica mais compacto com ~30% menos scroll necessario
- Visual alinhado com o estilo clean/minimalista do UNBSCOLOR
- Cores oficiais aplicadas consistentemente

