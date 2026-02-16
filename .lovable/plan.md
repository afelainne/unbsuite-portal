

# SVG Upload: Apenas SVG, Alimentando Todo o Sistema

## Resumo
Tres mudancas principais:
1. Reverter fundo de ambos os apps para branco (`#FFFFFF`)
2. Restringir upload para apenas SVG (remover suporte a imagens raster)
3. Quando SVG for carregado, as cores extraidas alimentam TODAS as ferramentas automaticamente

## 1. Fundo Branco

### `src/tools/unbscolor/App.tsx`
- Linha 577: trocar `backgroundColor: '#E8E8E3'` para `backgroundColor: '#FFFFFF'`
- Linha 581: trocar `backgroundColor: '#E8E8E3'` para `backgroundColor: '#FFFFFF'`  
- Linha 604: trocar `backgroundColor: 'rgba(255,255,255,0.5)'` (manter, ja esta ok)
- Linha 700 header: trocar `rgba(232,232,227,0.95)` para `rgba(255,255,255,0.95)`

### `src/tools/unbsgrid/pages/Index.tsx`
- Linha 45: trocar `bg: '#E8E8E3'` para `bg: '#FFFFFF'` no objeto THEME
- Linha 50: trocar `inputBg: '#DEDED8'` para `inputBg: '#F5F5F5'`

## 2. Upload Apenas SVG

### `src/tools/unbscolor/components/PaletteGenerator.tsx`
- Mudar `accept` do input de `image/*,.svg` para apenas `.svg,image/svg+xml`
- Remover listener de paste para imagens (ou filtrar apenas SVG no paste)
- No `handleFile`: rejeitar qualquer arquivo que nao seja SVG
- **Nova abordagem de extracao**: em vez de rasterizar o SVG num canvas, parsear o conteudo XML do SVG e extrair cores diretamente dos atributos `fill`, `stroke`, `stop-color`, `style` (cores CSS inline). Isso e mais preciso para SVGs vetoriais.
- Atualizar icone e label do botao (trocar icone de camera para icone de SVG/arquivo)
- Atualizar traducao `uploadImageSvg` para algo como `uploadSvg`

### `src/tools/unbscolor/utils/imageExtraction.ts`
- Adicionar nova funcao `extractColorsFromSvg(svgContent: string): string[]` que:
  - Parseia o SVG como XML via DOMParser
  - Busca atributos `fill`, `stroke`, `stop-color` em todos os elementos
  - Parseia cores inline em atributos `style`
  - Converte cores nomeadas CSS (ex: `red`, `blue`) para hex
  - Remove duplicatas e cores genericas (`none`, `transparent`, `#000000`, `#FFFFFF` opcionalmente)
  - Retorna array de hex unicos

## 3. Cores do SVG Alimentam Todo o Sistema

### `src/tools/unbscolor/App.tsx`
Atualmente o `PaletteGenerator` aparece apenas nas tabs `matcher` e `batch`. Quando cores sao detectadas:
- Na tab `matcher`: apenas `handleHexChange(colors[0])` e chamado (cores perdidas)
- Na tab `batch`: `setBatchColors(colors)` e `handleHexChange(colors[0])`

**Mudanca**: Mover o botao de upload SVG para o header (fora do condicional de tab), e unificar o callback `onPaletteDetected` para SEMPRE:
1. `setBatchColors(colors)` -- alimenta Multi-Slot (tab batch) e Generated Palettes (`externalColors`)
2. `handleHexChange(colors[0])` -- alimenta Matcher (cor primaria) e Contrast Palette (via `initialHex`)
3. ColorGuide ja recebe `batchColors` como prop, entao automaticamente recebe as cores do SVG
4. GeneratedPalettes ja recebe `externalColors={batchColors}`, entao tambem recebe automaticamente

Mudanca no JSX do header (linhas 724-742):
```text
De:
  {activeTab === 'matcher' && <PaletteGenerator ... />}
  {activeTab === 'batch' && <PaletteGenerator ... />}

Para:
  <PaletteGenerator
    onColorSelect={handleHexChange}
    onPaletteDetected={(colors) => {
      setBatchColors(colors);
      handleHexChange(colors[0]);
    }}
  />
```

Isso garante que:
- **Matcher**: cor primaria atualizada, strip e similarity grid recalculados
- **Multi-Slot (batch)**: todos os slots preenchidos com as cores do SVG
- **Contrast Palette**: `initialHex` atualizado via `handleHexChange`
- **Generated Palettes**: `externalColors` atualizado via `batchColors`
- **Print Guide**: `batchColors` atualizado, `selectedHex` atualizado

---

## Secao Tecnica

### Arquivos a editar

| Arquivo | Mudanca |
|---|---|
| `src/tools/unbscolor/App.tsx` | Fundo branco. Mover PaletteGenerator para header global (fora de condicional de tab). Unificar callback. |
| `src/tools/unbscolor/components/PaletteGenerator.tsx` | Aceitar apenas SVG. Parsear XML em vez de rasterizar. Novo icone. |
| `src/tools/unbscolor/utils/imageExtraction.ts` | Adicionar `extractColorsFromSvg()` que parseia atributos fill/stroke/stop-color do XML |
| `src/tools/unbsgrid/pages/Index.tsx` | Fundo branco no THEME |

### Nova funcao `extractColorsFromSvg`

```text
1. Ler conteudo do SVG como texto (FileReader.readAsText)
2. DOMParser().parseFromString(svgText, 'image/svg+xml')
3. querySelectorAll('*') no documento
4. Para cada elemento, verificar:
   - getAttribute('fill')
   - getAttribute('stroke')  
   - getAttribute('stop-color')
   - style.fill, style.stroke (inline)
5. Converter cada valor para hex:
   - rgb(r,g,b) -> hex
   - cores nomeadas (red, blue, etc) -> hex via canvas auxiliar
   - #RGB -> #RRGGBB
   - Ignorar: none, transparent, inherit, currentColor, url(...)
6. Deduplicar e retornar array
```

### Impacto
- Upload SVG alimenta automaticamente todas as 5 tabs
- Nenhuma funcionalidade removida (apenas troca de imagem para SVG)
- Extracao mais precisa (cores vetoriais exatas vs amostragem de pixels)
- Fundo branco consistente em ambos os apps
