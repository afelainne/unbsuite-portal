

# Revisao do UNBSMOCKUP -- Textos Editaveis, Avatar e Icones Reais

## Problemas Atuais

1. Templates sociais usam emojis como texto SVG (👍 Like, 💬 Comment, 🌎) -- renderizam mal ou nao renderizam
2. Username e textos sao hardcoded no SVG (`frameSvg`) -- impossivel editar
3. Sem opcao de avatar de perfil
4. A UI nao oferece controle sobre o conteudo textual dos mockups

## Solucao

### A) Novo sistema de campos editaveis por template

Adicionar ao tipo `MockupTemplate` um campo opcional `editableFields` que define quais textos e imagens o usuario pode customizar:

```typescript
interface EditableField {
  id: string;           // ex: 'username', 'caption', 'location'
  label: string;        // ex: 'Username'
  type: 'text' | 'avatar';
  defaultValue: string; // valor padrao
  // posicao no SVG
  x: number;
  y: number;
  fontSize?: number;
  fontWeight?: string;
  fill?: string;
  textAnchor?: string;
  // para avatar:
  cx?: number;
  cy?: number;
  r?: number;
}
```

Cada template social tera seus campos. Exemplo para Instagram Post:
- avatar (circle na posicao do perfil)
- username (texto bold)
- location (texto menor)

### B) Icones SVG reais em vez de emojis

Remover todos os emojis dos templates e substituir por paths SVG reais:
- **Like** (thumbs up): path SVG inline
- **Comment** (balao de fala): path SVG inline
- **Share** (seta de compartilhar): path SVG inline
- **Globe** (globo terrestre): path SVG inline
- **Heart** (coracao): path SVG inline para Instagram

Os paths serao definidos como constantes reutilizaveis no `templates.ts`.

### C) Avatar de perfil

- Novo `ImageUploader` para avatar (separado do principal)
- O avatar e renderizado como `<image>` com `<clipPath>` circular no SVG
- Se nao houver avatar, mostra circulo cinza (placeholder)

### D) Painel de edicao na sidebar

Nova secao "Content" na sidebar (visivel apenas para templates com `editableFields`) com:
- Input de texto para cada campo de texto (username, location, caption)
- Upload de avatar (pequeno, ao lado do nome)

---

## Mudancas por Arquivo

### `src/tools/unbsmockup/templates.ts`

1. Adicionar interface `EditableField` e campo `editableFields?: EditableField[]` ao `MockupTemplate`
2. Criar constantes de paths SVG para icones:
   - `ICON_LIKE` (thumbs up)
   - `ICON_COMMENT` (speech bubble)
   - `ICON_SHARE` (arrow/share)
   - `ICON_GLOBE` (globe)
   - `ICON_HEART` (heart outline)
   - `ICON_BOOKMARK` (bookmark)
3. Atualizar templates sociais:
   - **Instagram Post**: remover emojis do frameSvg, remover textos de username/location do frameSvg, adicionar icones SVG (heart, comment, share, bookmark), adicionar `editableFields` para username, location
   - **Instagram Story**: remover texto username do frameSvg, adicionar `editableFields`
   - **Twitter/X Post**: remover emoji e texto estatico do frameSvg, adicionar `editableFields` para displayName, handle, tweetText, usar icones SVG para reply/retweet/like
   - **Facebook Post**: remover emojis (👍💬🌎) do frameSvg, adicionar icones SVG reais de like/comment/share, adicionar `editableFields` para username, timestamp
   - **YouTube Thumbnail**: sem mudancas (nao tem texto social)

### `src/tools/unbsmockup/components/DeviceFrame.tsx`

1. Receber nova prop `fieldValues: Record<string, string>` e `avatarSrc: string | null`
2. Apos renderizar o `frameSvg` e antes do final, renderizar os campos editaveis:
   - Para campos tipo `text`: renderizar `<text>` com as coordenadas e estilo do campo
   - Para campos tipo `avatar`: renderizar `<image>` com `<clipPath>` circular, ou circulo placeholder se nao houver avatar

### `src/tools/unbsmockup/App.tsx`

1. Adicionar state `fieldValues: Record<string, string>` (inicializado com defaultValues do template)
2. Adicionar state `avatarSrc: string | null`
3. Ao trocar de template, resetar fieldValues com os defaults do novo template
4. Adicionar secao "Content" na sidebar com:
   - Upload de avatar (pequeno, inline)
   - Inputs de texto para cada campo editavel
5. Passar `fieldValues` e `avatarSrc` ao `DeviceFrame`

---

## Templates Sociais Atualizados

### Instagram Post
- Icones: heart outline, comment bubble, share arrow, bookmark (na barra inferior)
- Campos: avatar, username, location

### Instagram Story
- Campos: avatar, username

### Twitter/X Post
- Icones: reply, retweet, heart, share (na barra inferior)
- Campos: avatar, displayName, handle (@), tweetText

### Facebook Post
- Icones: like (thumbs up), comment (bubble), share (arrow)
- Campos: avatar, username, timestamp
- Globe icon no timestamp em vez de emoji

---

## Ordem de Execucao

| # | Tarefa |
|---|--------|
| 1 | Atualizar `templates.ts`: adicionar tipo EditableField, constantes de icones SVG, atualizar templates sociais |
| 2 | Atualizar `DeviceFrame.tsx`: renderizar campos editaveis e avatar |
| 3 | Atualizar `App.tsx`: state de fields/avatar, secao Content na sidebar, upload de avatar |

