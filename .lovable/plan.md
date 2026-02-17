

# Melhorias no UNBSMOCKUP e UNBSTYPE

## 1. UNBSMOCKUP -- Ajuste manual da imagem + Mais templates

### A) Controles de posicionamento da imagem
Adicionar na sidebar (entre "Background" e "Templates") uma secao **"Ajustar Imagem"** com 3 sliders:
- **Zoom** (scale): 1x a 3x (default 1) -- altera o tamanho da imagem dentro do clip
- **X offset**: -50% a +50% -- desloca horizontalmente
- **Y offset**: -50% a +50% -- desloca verticalmente

No `DeviceFrame.tsx`, em vez de posicionar a `<image>` diretamente no screen.x/y com screen.width/height, calcular posicao e dimensoes baseadas no zoom e offset:

```text
imageWidth  = screen.width  * scale
imageHeight = screen.height * scale
imageX = screen.x - (imageWidth - screen.width) / 2 + offsetX * screen.width
imageY = screen.y - (imageHeight - screen.height) / 2 + offsetY * screen.height
```

O clipPath ja garante que a imagem nao vaze para fora da tela.

Botao "Reset" para voltar zoom=1, offsets=0.

### B) Novos templates (adicionar ao `templates.ts`)

**Mobile:**
- Android Phone (390x844, bordas mais finas, camera centralizada)
- iPhone SE (320x568, bordas mais grossas, botao home)

**Laptop:**
- Windows Laptop (900x580, bordas diferentes do MacBook, sem trackpad visivel)

**Tablet:**
- iPad Landscape (780x560)

**Web:**
- Dark Browser (igual ao Browser mas com tema escuro invertido)
- Mobile Browser (380x700, barra de navegacao no topo, barra inferior com controles)

**Social:**
- Instagram Story (1080x1920 scaled, com UI do stories)
- Twitter/X Post (500x280, com header de tweet)
- Facebook Post (500x300, com header de post)
- YouTube Thumbnail (640x360, com botao play)

**Print:**
- A4 Vertical (210x297mm scaled)
- Album Cover (500x500, quadrado com sombra)
- Book Cover (400x600, com lombada)

**Wearable:**
- Apple Watch (198x242, tela redonda-quadrada)
- Smart TV (960x540, tela larga com base)

Total: 8 existentes + ~15 novos = ~23 templates

### Arquivos modificados
- `src/tools/unbsmockup/App.tsx` -- adicionar state de zoom/offsetX/offsetY + sliders + passar para DeviceFrame
- `src/tools/unbsmockup/components/DeviceFrame.tsx` -- receber zoom/offsets e calcular posicao da imagem
- `src/tools/unbsmockup/templates.ts` -- adicionar os novos templates

---

## 2. UNBSTYPE -- Upload de fontes + Shuffle de cores

### A) Upload de fontes locais
Adicionar ao `FontSelector.tsx` um botao "Upload .ttf/.otf/.woff2" no topo do dropdown. Ao clicar:
1. Abre file picker para `.ttf, .otf, .woff, .woff2`
2. Le o arquivo como ArrayBuffer, cria um `@font-face` via `FontFace API`:
   ```typescript
   const fontFace = new FontFace('CustomFont-1', arrayBuffer);
   await fontFace.load();
   document.fonts.add(fontFace);
   ```
3. Adiciona a fonte ao estado local com um nome gerado (ex: "Upload: MeuFont.ttf")
4. A fonte aparece no topo da lista com badge "LOCAL"
5. Selecionar aplica normalmente via `fontFamily`

Estado das fontes locais gerenciado no `App.tsx` e passado ao `FontSelector` via prop `customFonts`.

### B) Shuffle de cores no preview
Adicionar na sidebar uma secao **"Cores"** com:
- **Botao Shuffle** que randomiza as cores do preview (foreground e background)
- **Color pickers** para foreground e background
- Paletas pre-definidas (Dark, Light, Warm, Cool, High Contrast, Pastel)

No `PreviewPanel.tsx`, receber `fgColor` e `bgColor` como props e aplicar:
- O container do preview usa `backgroundColor: bgColor`
- Todos os textos usam `color: fgColor`

O shuffle gera cores aleatorias com contraste minimo WCAG AA (ratio >= 4.5:1).

### Arquivos modificados
- `src/tools/unbstype/App.tsx` -- adicionar state de customFonts, fgColor, bgColor + shuffle + color pickers
- `src/tools/unbstype/components/FontSelector.tsx` -- adicionar botao upload + mostrar fontes locais no topo
- `src/tools/unbstype/components/PreviewPanel.tsx` -- receber e aplicar fgColor/bgColor
- `src/tools/unbstype/constants.ts` -- adicionar paletas de cores pre-definidas e funcao de contraste

---

## Resumo tecnico

| Arquivo | Mudanca |
|---------|---------|
| `unbsmockup/App.tsx` | State zoom/offsetX/offsetY, sliders na sidebar, reset |
| `unbsmockup/components/DeviceFrame.tsx` | Props zoom/offsets, calculo de posicao da imagem |
| `unbsmockup/templates.ts` | +15 novos templates (Android, iPad Landscape, Stories, Twitter, YouTube, A4, Watch, TV, etc.) |
| `unbstype/App.tsx` | State customFonts/fgColor/bgColor, shuffle, color pickers, paletas |
| `unbstype/components/FontSelector.tsx` | Botao upload .ttf/.otf/.woff2, FontFace API, badge LOCAL |
| `unbstype/components/PreviewPanel.tsx` | Props fgColor/bgColor aplicadas em todos os textos |
| `unbstype/constants.ts` | Paletas de cores + funcao de contraste WCAG |

## Ordem de execucao

1. Adicionar novos templates ao UNBSMOCKUP
2. Implementar controles de zoom/offset da imagem no UNBSMOCKUP
3. Adicionar upload de fontes locais ao UNBSTYPE
4. Adicionar shuffle de cores e color pickers ao UNBSTYPE

