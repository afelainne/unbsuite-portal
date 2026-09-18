# Formato de biblioteca UNBS

O UNBSCOLOR busca referências em bibliotecas. As paletas abertas vêm embutidas (veja `open/README.md`). Qualquer outra biblioteca é importada pela própria pessoa, em **Ajustes → Bibliotecas → Importar biblioteca**, e aceita três formatos:

| Formato | Extensão | Como vira biblioteca |
| --- | --- | --- |
| Adobe Color Book | `.acb` | Um livro. Lê livros RGB, CMYK e Lab, com ou sem os invólucros de localização `$$$/…=`. O código é prefixo + nome + sufixo; o acabamento sai do sufixo comum a todos os códigos. |
| Adobe Swatch Exchange | `.ase` | Um livro por grupo do arquivo; amostras soltas vão para um livro com o nome do arquivo. Lê RGB, CMYK, Lab e Gray. A receita CMYK é guardada quando existe. |
| UNBS JSON | `.json` | O formato abaixo. Vários livros, acabamentos e notas por código. |

O arquivo é lido no navegador, nunca é enviado a servidor nenhum, e fica guardado no IndexedDB daquele navegador. Se o navegador recusar o IndexedDB (janela privada, dados de site bloqueados), a biblioteca vale até recarregar a página. Importar de novo um arquivo com o mesmo nome substitui a biblioteca anterior.

Cada biblioteca importada aparece na lista com nome, quantidade de livros e de cores e acabamentos. Dá para ligar e desligar na busca, exportar de volta em UNBS JSON e remover.

## Estrutura

```json
{
  "format": "unbs-reference-library",
  "version": 1,
  "name": "Minha biblioteca",
  "exportedAt": "2026-09-18T12:00:00.000Z",
  "books": [
    {
      "id": "solid-c",
      "name": "Sólidas, papel revestido",
      "finish": "C",
      "colors": [
        { "code": "ACME 100 C", "hex": "#F6EB61", "rgb": [246, 235, 97], "cmyk": [0, 0, 51, 0] }
      ]
    }
  ],
  "notes": {
    "100 C": {
      "description": { "en": "…", "pt": "…", "es": "…" },
      "usageTips": { "en": ["…"], "pt": ["…"], "es": ["…"] },
      "psychology": { "en": "…", "pt": "…", "es": "…" }
    }
  }
}
```

| Campo | Obrigatório | Regra |
| --- | --- | --- |
| `format` | sim | Exatamente `"unbs-reference-library"`. |
| `version` | sim | `1`. Outra versão é recusada. |
| `name` | não | Nome exibido. Sem ele, vale o nome do arquivo. Até 120 caracteres. |
| `exportedAt` | não | ISO 8601. Informativo; a exportação grava a data do momento. |
| `books` | sim | Lista com pelo menos um livro, no máximo 64. |
| `books[].id` | não | Identificador do livro. Sem ele, `book-N`; repetidos ganham sufixo. |
| `books[].name` | não | Nome exibido do livro. Sem ele, vale o `id`. |
| `books[].finish` | não | Sufixo curto de acabamento: `C`, `U`, `CP`, `UP` e afins (letras, números e `+`, até 6). Vazio quando não há. Os acabamentos presentes viram o filtro de acabamento do Matcher; sem nenhum, o filtro não aparece. |
| `books[].colors` | sim | Lista de cores, no máximo 20.000 por livro e 100.000 na biblioteca. |
| `colors[].code` | sim | O código como deve aparecer, até 120 caracteres. É exibido como está escrito no arquivo; só o espaçamento e a caixa do acabamento final são normalizados. |
| `colors[].hex` | sim, ou `rgb` | `#RRGGBB` ou `#RGB`. |
| `colors[].rgb` | sim, ou `hex` | `[r, g, b]`, inteiros de 0 a 255. Usado quando falta `hex`. |
| `colors[].cmyk` | não | `[c, m, y, k]`, de 0 a 100. Guardado e devolvido na exportação. |
| `notes` | não | Notas por código. A chave pode ter ou não o prefixo do livro: a nota `"100 C"` responde ao código `"ACME 100 C"`. Cada nota pode ter qualquer uma das três partes; um idioma ausente usa outro presente. Notas malformadas são descartadas sem recusar o arquivo. |

As notas aparecem no cartão "Notas desta referência" do Matcher, para o código mostrado, depois de "Buscar referência". Sem nota para aquele código, o Matcher mostra só a leitura calculada em "Descobertas".

## Validação

O arquivo inteiro é recusado, com mensagem, quando: passa de 50 MB; não é JSON; `format` ou `version` não conferem; não há livros; um livro não tem `colors`; uma cor não tem código ou valor válido (a mensagem diz o livro e a posição); não sobra nenhuma cor; os limites de cores são ultrapassados. Nada entra pela metade.

## Uso pessoal

A edição pública do UNBSCOLOR não traz nenhum dado de biblioteca licenciada. Para usar as bibliotecas licenciadas que você tem, há dois caminhos:

1. **No app público.** Abra Ajustes → Bibliotecas → Importar biblioteca e escolha `personal/unbs-referencias-pantone.json` (a pasta `personal/` fica fora do Git, pelo `.gitignore`). Os códigos entram no Matcher, no filtro de acabamento, na análise multi-slot e nas referências das paletas, e as notas aparecem para cada código. A biblioteca fica só no seu navegador; para outro navegador ou computador, importe de novo. "Exportar biblioteca" devolve o arquivo no mesmo formato.
2. **Na edição pessoal.** Faça checkout do branch `pessoal/pantone` ou da tag `pantone-pessoal-v1`, que têm os dados embutidos. Essa edição não deve ser publicada.
