# UNBSFORMAT — motor de formato e grade

Lógica pura, em milímetros, sem DOM. A interface (`../components`) só lê e escreve `GridConfig`.

| Arquivo | O que faz |
| --- | --- |
| `units.ts` | mm, pt (1/72 in), in, px (1/96 in); formatação com vírgula |
| `formats.ts` | formatos conferidos, proporções clássicas, proporção mais próxima |
| `grid.ts` | o motor: páginas, espelho, dobras, mancha, colunas, linhas, módulos, linha de base, diagnóstico, `closeGrid`, lombada |
| `methods.ts` | construtores clássicos e linhas de construção |
| `scene.ts` | a lista de formas que a prévia, o SVG e o PDF desenham |
| `exports.ts` | valores para InDesign e Figma, SVG em escala real |
| `pdf.ts` | PDF com TrimBox/BleedBox, marcas de corte e guias em camada que não imprime |
| `config.ts`, `storage.ts` | valores iniciais, troca de formato, validação de JSON, `localStorage` em `try/catch` |

## Métodos e fontes

**Linhas reais (grade modular sobre linha de base).** Josef Müller-Brockmann, *Grid Systems in Graphic Design / Raster Systeme für die visuelle Gestaltung* (Niggli, 1981). A altura de cada campo corresponde a um número inteiro de linhas de texto; a largura do campo é a da coluna; o espaço vertical entre campos é de uma, duas ou mais linhas, e o livro trabalha com grades de 8, 20 e 32 campos. Aqui: com a linha de base ligada, `altura do campo = n × entrelinha`, `medianiz = g × entrelinha`, e a mancha fecha quando `linhas × n + (linhas − 1) × g = altura da mancha / entrelinha`. A sobra aparece na prévia e `closeGrid` resolve as margens superior e inferior (na proporção que já tinham) escolhendo entre tirar ou pôr uma linha por campo o que muda menos. Com o deslocamento em 0, o pé de cada campo cai sobre uma linha de base, como nos exemplos do livro. Referência consultada: [Grid systems in graphic design (arquivo)](https://ia802309.us.archive.org/4/items/GridSystemsInGraphicDesignJosefMullerBrockmann/Grid%20systems%20in%20graphic%20design%20-%20Josef%20Muller-Brockmann.pdf).

**Cânone de Van de Graaf.** J. A. van de Graaf (1946), divulgado por Jan Tschichold em *The Form of the Book* (1975). Com as diagonais da página e do espelho, uma vertical e uma reta de volta à outra página, chega-se a margens de 1/9 (lombada e topo) e 2/9 (corte e pé) e a uma mancha com a mesma proporção da página; numa página 2:3 a altura da mancha é igual à largura da página e as margens ficam em 2:3:4:6. A construção vale para qualquer proporção. A camada Construção desenha as diagonais, a vertical e a reta de retorno. Referência: [Canons of page construction (Wikipedia)](https://en.wikipedia.org/wiki/Canons_of_page_construction).

**Diagrama de Villard.** Villard de Honnecourt (séc. XIII), como apresentado por Tschichold: uma reta que parte do pé da lombada até W/(k−1) no topo corta a diagonal da página em W/k, e a vertical desse ponto alimenta o passo seguinte. A escada dá 1/2, 1/3, … 1/9 sem medir nada. Levada ao nono, coincide com o cânone; a ferramenta desenha a escada completa.

**Tschichold 2:3:4:6.** Interna : superior : externa : inferior = 2 : 3 : 4 : 6, com a condição do cânone de que a altura da mancha seja igual à largura da página: `u = (H − W) / 9`. Numa página 2:3 dá exatamente Van de Graaf; em página deitada não tem solução e cai no cânone em nonos. Tschichold, *The Form of the Book*, "Consistent Correlation Between Page and Type Area".

**Rosarivo, nonos e doze avos.** Raúl Rosarivo, *Divina proporción tipográfica* (1947), analisando Gutenberg e os primeiros impressores: a página dividida em 9 × 9 (ou 12 × 12) partes, uma parte na lombada e no topo, duas no corte e no pé. É o "cânone secreto" dos manuscritos medievais de que fala Tschichold. A construção mostra a divisão.

**Proporções de página e medida.** Robert Bringhurst, *The Elements of Typographic Style*, cap. 8 ("Shaping the Page"): a escala cromática de proporções, com nomes de intervalos musicais (15:16 segunda menor, 4:5 terça maior, 3:4 quarta, 1:√2 ISO, 2:3 quinta, 5:8 sexta menor, 1:φ seção áurea, 3:5, 9:16, 8:15, 1:2 oitava), usada para dizer a que proporção clássica a página, a mancha e o módulo estão mais próximos; e, no cap. 2, a medida de 45 a 75 caracteres, com 66 como ideal. A medida é estimada com meio eme por caractere, aproximação de *copyfitting* para texto corrido. A opção "margens em seção áurea" usa uma mancha com 1/φ da largura e da altura (mesma proporção da página) e reparte as sobras em 1:φ (lombada:corte e topo:pé). Referência: [Chromatic proportion layouts (Vasilis van Gemert, estudos de Bringhurst)](https://vasilis.nl/nerd/code/bringhurst-studies/chromatic-scale/).

**Gerstner, grade móvel de 58 unidades.** Karl Gerstner, *Designing Programmes* (1964), grade da revista *Capital* (1962): unidade de 10 pt, igual ao corpo com entrelinha, 58 unidades na largura, que dividem sem resto em 1, 2, 3, 4, 5 e 6 colunas com medianiz de 2 unidades (58; 2 × 28 + 2; 3 × 18 + 2 × 2; 4 × 13 + 3 × 2; 5 × 10 + 4 × 2; 6 × 8 + 5 × 2). Aqui a unidade é a mancha dividida por 58, e ela vira a entrelinha, então as linhas também caem nas unidades. Referências: [Designing Programmes (PDF, CUNY)](https://openlab.citytech.cuny.edu/langecomd3504fa2019/files/2018/10/Gerstner_DesigningProgrammes-1.pdf), [ms-studio: Karl Gerstner's layout grid](https://ms-studio.net/notes/karl-gerstners-layout-grid/).

**Tipos de grade.** Timothy Samara, *Making and Breaking the Grid* (Rockport, 2002): manuscrito (um bloco), colunas, modular e hierárquica. A hierárquica usa colunas com proporções diferentes (campo "Proporção das colunas", por exemplo 1:2).

**Digital.** Bootstrap 5: 12 colunas e medianiz de 1,5 rem (24 px), [documentação da grade](https://getbootstrap.com/docs/5.3/layout/grid/). Material Design 2: grade responsiva de 4 colunas até 599 dp (margem 16), 8 colunas de 600 a 904 dp (margem 32) e 12 colunas acima, [responsive layout grid](https://m2.material.io/design/layout/responsive-layout-grid.html); a medianiz de 16/24 é o valor de partida desta ferramenta. Grade de 8 pt: convenção de margens, medianizes e linha de base em múltiplos de 8, com a coluna flutuando.

**Áreas seguras de redes sociais.** A Meta não publica um número único para Reels e Stories; usamos o valor dos guias de produção: 220 px no topo, 450 px na base e 35 px nas laterais em 1080 × 1920 ([Verve Creative](https://vervecreative.studio/instagram-reels-safe-zones-and-tips/), [Outfy](https://www.outfy.com/blog/instagram-safe-zone/)). O post 4:5 (1080 × 1350) aparece recortado em 3:4 na grade do perfil, o que deixa 1012,5 px úteis na largura. Banner do YouTube: 2560 × 1440 com área segura central de 1546 × 423 px.

**Produção gráfica.** Sangria de 3 mm (padrão europeu e brasileiro) ou 1/8 in = 3,175 mm (padrão americano). No PDF, a MediaBox inclui a área das marcas, a TrimBox é o formato final e a BleedBox é o corte mais a sangria; as marcas ficam a no mínimo 6 pt do corte (padrão do InDesign) ou além da sangria, em cor de registro. As guias vão num grupo de conteúdo opcional com `/PrintState /OFF` (ISO 32000-1, 8.11): aparecem na tela e não saem na impressão. Folder de duas dobras carteira: o painel que entra por dentro é 2 a 3 mm mais estreito (A4: 100 + 100 + 97 mm), e troca de lado no verso ([Print and Package, guia de trípticos](https://printnpackage.com/blog/trifold-brochure-layout-guide)). Lombada de brochura: número de folhas (páginas ÷ 2) × espessura do papel, mais a capa.

**Formatos.** ISO 216 (A e B: cada formato é o anterior dividido ao meio, arredondado ao milímetro para baixo; A0 = 841 × 1189 mm), ISO 269 (C4, C5, C6 e DL para envelopes), ISO 217 (SRA3, SRA4), ISO/IEC 7810 (cartão ID-1, 85,60 × 53,98 mm), e os formatos americanos em polegadas exatas (Letter 8,5 × 11, Legal 8,5 × 14, Tabloid 11 × 17). Redes sociais e telas ficam em px e convertem a 96 px/in.

## Unidades de exportação

- **InDesign:** tudo em pt; a grade de linha de base sai como início relativo à margem superior e incremento igual à entrelinha; "Layout > Criar guias" recebe linhas, colunas e medianizes.
- **Figma:** em documento de tela, px; em impresso, 1 pt = 1 px (o preset A4 do Figma é 595 × 842). A linha de base vai como uma grade de linhas de 1 px com medianiz de entrelinha − 1.
