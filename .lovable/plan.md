
# Redesign da Home -- Layout Full-Screen sem Device Frame

## Problema
A home atual tem um fundo amarelo `#F0FF00` ocupando a tela inteira com um "device frame" branco pequeno centralizado no meio. Isso cria muito espaco vazio amarelo e o conteudo fica apertado dentro de uma caixa pequena.

## Nova Abordagem
Remover completamente o conceito de "device frame" e criar um layout full-screen com duas zonas visuais:

### Layout
- **Fundo**: branco `#FFFFFF` (corpo da pagina)
- **Hero section**: ocupa a maior parte da tela, fundo `#F0FF00`, com o logo UNBSTOOLS grande centralizado e os botoes das ferramentas abaixo
- **Footer bar**: barra escura `#232323` na parte inferior com o barcode visual e status
- Sem bordas arredondadas de "device", sem `max-w-4xl`, sem margens externas

### Estrutura visual (de cima para baixo)
1. **Zona hero amarela** (`#F0FF00`): ocupa `min-h-[85vh]`, centraliza verticalmente:
   - Logo UNBSTOOLS grande (height ~40px) no topo
   - Botoes UNBSCOLOR e UNBSGRID centralizados
   - Detalhes decorativos sutis (corner marks, shield) mantidos mas reposicionados
2. **Zona inferior branca**: contem a status bar escura e os info cards, colados ao fundo

### Detalhes tecnicos

**Arquivo**: `src/pages/Index.tsx`

Mudancas:
- Remover o wrapper `flex items-center justify-center` com fundo amarelo
- Remover o div "Device Frame" com `max-w-4xl border-2 rounded-3xl`
- Estrutura nova:

```text
<div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>
  {/* Hero */}
  <div className="flex-1 flex flex-col items-center justify-center relative px-6 py-12"
       style={{ backgroundColor: '#F0FF00' }}>
    {/* Corner marks nos cantos do hero */}
    {/* Logo UNBSTOOLS centralizado, maior */}
    {/* Botoes das ferramentas */}
  </div>

  {/* Bottom section */}
  <div className="px-6 pb-6 pt-4" style={{ backgroundColor: '#FFFFFF' }}>
    {/* Status bar escura */}
    {/* Info cards */}
  </div>
</div>
```

- Corner marks (`Plus` icons) reposicionados nos cantos do hero section (absolute)
- Shield icon mantido no canto superior esquerdo do hero
- Logo UNBSTOOLS com height maior (~40px)
- Botoes das ferramentas com estilo pill mantido, mas com mais espaco e presenca
- Status bar e info cards ficam na zona branca inferior, sem margens `mx-5` -- usam `max-w-4xl mx-auto` para manter proporcao agradavel
- Remover `overflow-hidden` e `rounded-3xl` do layout
