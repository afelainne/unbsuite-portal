# Paletas abertas embutidas

As referências que o UNBSCOLOR traz de fábrica, para o Matcher responder sem nenhuma biblioteca importada. Todas têm licença permissiva, que autoriza uso comercial e redistribuição. Cada arquivo `.ts` desta pasta repete a licença no cabeçalho.

| Arquivo | Paleta | Versão e origem | Licença | Cores | Código exibido |
| --- | --- | --- | --- | --- | --- |
| `tailwind.ts` | Tailwind CSS v3, paleta padrão | `tailwindcss@3.4.17`, `lib/public/colors.js` | MIT, Copyright (c) Tailwind Labs, Inc. | 244 | `Tailwind red-500` |
| `openColor.ts` | Open Color | `open-color@1.9.1`, `open-color.json` | MIT, Copyright (c) 2016 heeyeun | 132 | `Open Color blue 6` |
| `radix.ts` | Radix Colors, escalas claras, passos 1 a 12 | `@radix-ui/colors@3.0.0`, `index.js` | MIT, Copyright (c) 2021 Radix | 372 | `Radix blue 9` |
| `material.ts` | Material Design 2 | `material-design-lite@1.3.0`, `src/_color-definitions.scss` | Apache-2.0, Copyright 2015 Google Inc. | 254 | `Material red A200` |

Ficam de fora: os apelidos obsoletos do Tailwind (`lightBlue`, `warmGray`, `trueGray`, `coolGray`, `blueGray`), as escalas escuras, alfa e P3 do Radix.

Os arquivos são gerados a partir dos pacotes publicados no npm, sem edição de valor. Os textos completos das licenças acompanham cada pacote (`LICENSE`). Para atualizar, baixe a nova versão do pacote, regenere a lista `[nome, hex]` e confira a licença de novo antes de trocar.

Nenhuma destas paletas vem de livro de cor comercial. Bibliotecas licenciadas não são embutidas no app: quem tem uma importa pelo painel Bibliotecas, e ela fica só no navegador dessa pessoa (veja `../LIBRARY_FORMAT.md`).
