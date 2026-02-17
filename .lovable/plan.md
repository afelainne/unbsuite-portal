
# Fix: Canvas Zoom, Pan e Fit-to-View no UNBSFORMAT

## Problema

O canvas SVG usa dimensoes fixas em pixels (`width={vbW} height={vbH}`), que para formatos como A4 geram um SVG de ~816x1145px. Isso ultrapassa a area visivel e o conteudo fica cortado.

## Solucao

Adicionar navegacao completa ao TemplatePreview: **auto-fit**, **zoom** (scroll wheel), **pan** (Alt+drag ou middle-click) e **botoes de controle** -- seguindo o mesmo padrao do PreviewCanvas do unbsgrid.

## Mudancas

### Arquivo: `TemplatePreview.tsx`

**Auto-fit na montagem**: calcular o zoom inicial para que o SVG inteiro caiba na area visivel com padding, usando `Math.min(containerW / vbW, containerH / vbH) * 0.9`.

**Estado de navegacao**:
- `zoom` (number, default calculado para fit)
- `panOffset` ({x, y}, default {0, 0})
- `isPanning` (boolean)

**SVG responsivo**: Em vez de `width={vbW} height={vbH}` fixo, usar `width={vbW * zoom} height={vbH * zoom}` com `transform: translate(panX, panY)` no container.

**Eventos**:
- `onWheel`: zoom in/out (0.1 a 5x)
- `onMouseDown` (Alt+click ou middle-click): inicia pan
- `onMouseMove`: atualiza pan offset
- `onMouseUp`: finaliza pan
- `ResizeObserver`: recalcula fit quando o container muda de tamanho

**Toolbar de navegacao** (acima do canvas, estilo unbsgrid):
- Botoes: Zoom In (+), Zoom Out (-), Fit to Screen, Reset
- Indicador de zoom atual (ex: "75%")
- Dica "Alt+Drag" para pan
- Coordenadas do cursor

**Fit to Screen**: funcao que recalcula o zoom para o SVG caber inteiro na area visivel. Chamada automaticamente ao mudar de formato.

### Estrutura do componente atualizado

```text
<div className="flex-1 flex flex-col">
    <!-- Toolbar: [+] [-] [Fit] [Reset] | Alt+Drag | 75% -->
    <div className="toolbar">...</div>
    
    <!-- Canvas area com overflow hidden -->
    <div ref={containerRef} 
         className="flex-1 overflow-hidden"
         onWheel={handleWheel}
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}>
        
        <!-- SVG com transform para zoom+pan -->
        <div style={{ transform: translate(panX, panY) }}>
            <svg width={vbW * zoom} height={vbH * zoom} 
                 viewBox="0 0 {vbW} {vbH}">
                ... (conteudo existente inalterado)
            </svg>
        </div>
    </div>
</div>
```

### Comportamento

| Acao | Resultado |
|------|-----------|
| Abrir / mudar formato | Auto-fit: SVG cabe inteiro com margem |
| Scroll wheel | Zoom in/out (10% por step, range 10%-500%) |
| Alt + arrastar | Pan (mover canvas livremente) |
| Middle-click + arrastar | Pan (alternativo) |
| Botao Fit | Recentraliza e auto-fit |
| Botao Reset | Zoom 100%, pan (0,0) |
| Botao + / - | Zoom step de 25% |

### Ordem de execucao

| # | Tarefa |
|---|--------|
| 1 | Adicionar estados zoom, panOffset, isPanning ao TemplatePreview |
| 2 | Adicionar containerRef e ResizeObserver para calcular fit inicial |
| 3 | Mudar SVG de dimensoes fixas para zoom responsivo |
| 4 | Adicionar handlers de wheel, mouseDown, mouseMove, mouseUp |
| 5 | Adicionar toolbar com botoes de zoom, fit e reset |
| 6 | Recalcular fit automaticamente ao mudar de formato (preset) |
