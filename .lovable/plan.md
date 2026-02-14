

# Redesign do Hub UNBSTOOLS -- Layout Inspirado na Referencia

## Objetivo
Recriar a pagina principal (`/`) com um layout inspirado na imagem de referencia: um visual tipo "dispositivo/e-reader" industrial com moldura arredondada, area de destaque em amarelo-limao (#CCFF00), tipografia bold/blackletter, e elementos decorativos nos cantos. O logo SVG fornecido ("UNBSTOOLS") sera integrado no header.

---

## Estrutura Visual (baseada na referencia)

A pagina tera uma estetica de "dispositivo" com:

1. **Moldura externa** -- borda arredondada com cantos decorativos (icones de "+" nos 4 cantos)
2. **Header** -- logo "UNBSTOOLS" SVG centralizado no topo, dentro da moldura
3. **Area principal amarelo-limao (#CCFF00)** -- bloco de destaque grande ocupando a maior parte da tela, com:
   - Emblema/icone no canto superior esquerdo
   - Texto vertical rotacionado na lateral esquerda (nome da ferramenta em destaque)
   - Botoes/labels "FEATURED" e "PROJECT" com bordas finas
   - Nome do autor/usuario na parte inferior
4. **Barra de status** -- faixa fina abaixo da area amarela com barcode visual e indicadores
5. **Cards de informacao** -- dois cards retangulares na parte inferior com texto monospace (links e logs curadoria)

---

## Mudancas Tecnicas

### 1. Criar componente `UnbsToolsLogo` (`src/components/UnbsToolsLogo.tsx`)
- Componente SVG inline com o logo fornecido pelo usuario
- Props para tamanho e cor

### 2. Redesenhar `src/pages/Index.tsx`
- Substituir o layout atual por um layout tipo "dispositivo"
- Moldura externa com `border-2 border-foreground rounded-3xl` e cantos decorativos
- Header com logo SVG centralizado
- Area de destaque amarelo-limao com featured content
- Texto vertical rotacionado na esquerda
- Barra de status simulada
- Cards informativos na base
- Grid de ferramentas (UNBSCOLOR, UNBSGRID) exibidas como botoes/labels dentro da area de destaque

### 3. Atualizar `src/components/Header.tsx`
- Integrar o logo SVG no lugar do texto "UNBSERVED."
- Manter controles do lado direito (search, bell, avatar, mobile menu)

### 4. Atualizar `src/components/ToolCard.tsx`
- Adaptar visual para caber no estilo industrial: bordas finas, fundo transparente, texto uppercase bold
- Estilo de botoes com borda preta fina similar aos labels "FEATURED" / "PROJECT" da referencia

### 5. Atualizar `src/index.css`
- Adicionar cor customizada para o amarelo-limao: `--accent-lime: 72 100% 50%` (approx #CCFF00)
- Adicionar utilidades para texto vertical rotacionado
- Font face ou import para tipografia blackletter/gothic (para o logo area) se necessario

### 6. Atualizar `tailwind.config.ts`
- Adicionar a cor `lime` / `highlight` ao tema extendido

---

## Secao Tecnica -- Detalhes de Implementacao

### Layout da pagina principal (Index.tsx)
```text
+--[rounded frame]-------------------------------+
|  (+)              UNBSTOOLS SVG            (+)  |
|  +--[yellow-lime area]---------------------+    |
|  |  [emblem]                               |    |
|  |                                         |    |
|  |  P                                      |    |
|  |  O                                      |    |
|  |  P     +----------+ +----------+        |    |
|  |  U     | UNBSCOLOR| | UNBSGRID |        |    |
|  |  L     +----------+ +----------+        |    |
|  |  A                                      |    |
|  |  R              YAGO FERREIRA           |    |
|  +--[status bar]---------------------------+    |
|  +--[info card]--+ +--[info card]----------+    |
|  | UNBS//LINK    | | UNBS-17//FEATURED     |    |
|  +---------------+ +----------------------+    |
|  (+)                                       (+)  |
+-------------------------------------------------+
```

### Cores
- Fundo da moldura: branco (`--background`)
- Area destaque: `#CCFF00` (amarelo-limao)
- Bordas/texto: `#232323` (quase preto)
- Barra de status: fundo escuro com elementos claros

### Tipografia
- Logo: SVG fornecido (blackletter)
- Titulos de ferramenta: Inter bold uppercase
- Info cards: monospace/mono

