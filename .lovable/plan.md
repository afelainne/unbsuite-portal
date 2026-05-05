## Problemas atuais no Toolbar lateral (modo Avançado)

Arquivo: `src/tools/unbsfont/components/Toolbar.tsx` (412 linhas, 14+ botões em 5 seções).

1. **Exportação inflada e ambígua**
   - "Exportar Tabela" aparece **duas vezes** com legendas SVG/Sheet — usuário não sabe a diferença.
   - "Preview Final", "Diagnóstico", "Exportar TTF", "Exportar Tabela (vazia)", "Exportar Tabela (preenchida)" amontoados sem hierarquia.
   - 3 variações visuais de botão (`primaryButtonBase` ativo, passivo, `quickActionButtonBase`) sem critério claro.

2. **Projeto com 5 botões redundantes**
   - "Salvar projeto" (localStorage) vs "Baixar arquivo .unbsfo" — ambos salvam, diferença só no destino.
   - "Abrir projeto (.unbsfo)" + "Dashboard" navegam — duplicam o caminho Home.
   - "Import SVG" misturado com ações de projeto (deveria ficar perto da edição).

3. **Seção "Tipografia" vazia** — só mostra um aviso "vá para outra aba". Ocupa espaço sem ação.

4. **Designer name escondido** num double-click da versão. Quase invisível.

5. **Pesos & Estilos** funciona bem, mas cada linha tem 3 botões (usar/duplicar/excluir) — denso. Duplicar pode virar menu.

6. **Preferências** mistura "Modo Compact" (mudança crítica de fluxo) com "Tema" (cosmético).

## Reorganização proposta

Reduzir a **3 seções claras**, ~9 botões totais (de 14+):

```
┌─ HEADER (compacto)
│  Family name [editável]      v1.0 · Designer ✎
│  ───────────────────────────────────────────
│
├─ ESTILOS (Pesos)
│  • Regular        [ATIVO]  ⋯
│  • Bold                    ⋯
│  + Adicionar estilo
│  ───────────────────────────────────────────
│
├─ AÇÕES                        (botão principal grande)
│  ⬇  Importar SVG               Ctrl+V
│  💾  Salvar                     Ctrl+S      ← unifica save+download
│  📂  Abrir .unbsfo
│  ───────────────────────────────────────────
│
├─ EXPORTAR FONTE
│  ⭐ Exportar TTF              [primário]   ← ação principal
│  👁  Preview da fonte
│  ⚠  Diagnóstico
│  ▾  Mais opções (collapse)                  ← esconde sheet/tabela
│       · Tabela SVG (vazia)
│       · Tabela SVG (preenchida)
│  ───────────────────────────────────────────
│
└─ FOOTER (rodapé fixo)
   ◐ Tema   ⇄ Modo Compact   ⌂ Dashboard
```

### Mudanças concretas

**A. Header**
- Tornar o campo "Designer" visível (input pequeno abaixo do nome) em vez de double-click invisível.
- Versão fica como tag pequena ao lado do nome.

**B. Estilos**
- Manter lista, mas colapsar Duplicar/Excluir num menu `⋯` (popover ou inline ao hover) para reduzir ruído visual. Botão "Usar/Ativo" vira o próprio item clicável.

**C. Seção "Ações" (renomeada de "Projeto")**
- 3 botões só: **Importar SVG**, **Salvar** (unifica `onSaveProject` + `onDownloadProjectFile` num único fluxo — salva local + oferece download), **Abrir .unbsfo**.
- Remover botão "Dashboard" daqui (vai pro footer junto com Tema/Compact).

**D. Seção "Exportar fonte"**
- **Exportar TTF** vira único botão primário grande (estilo `activePrimaryClasses`).
- **Preview** e **Diagnóstico** ficam como botões secundários menores lado a lado.
- **Tabela SVG vazia/preenchida** vão pra um collapse "Mais opções" — uso raro, não polui o topo.

**E. Remover seção "Tipografia"** (placeholder vazio).

**F. Footer fixo no fundo do sidebar**
- 3 ícones pequenos: **Tema** (claro/escuro), **Modo Compact**, **Dashboard** (Home).
- Libera espaço vertical no corpo principal.

**G. Estilos visuais**
- Reduzir a 2 variantes: `primary` (ações principais — TTF, Salvar) e `ghost` (tudo o mais).
- Remover `quickActionButtonBase` redundante.
- Padding e espaçamentos consistentes (todos `py-2 px-3 rounded-lg`).

### Comportamento dos botões (sem quebrar API)

`Toolbar.tsx` continua recebendo as mesmas props. Mudanças internas:
- `onSaveProject` + `onDownloadProjectFile` são chamados **sequencialmente** ao clicar "Salvar" (salva local primeiro, depois baixa). Mantém ambos os efeitos.
- `onExportSvgSheet` e `onExportEmptySvgSheet` movidos para dentro do collapse, sem mudança de comportamento.
- Adicionar `useState` local para o collapse "Mais opções" e `useState` para o menu `⋯` por estilo.

### Verificação
- Mesma quantidade de funcionalidades, **menos botões visíveis**.
- Hierarquia clara: Identidade → Estilos → Ações → Exportar → (rodapé global).
- Nenhuma prop nova, nenhuma quebra em `App.tsx`.

Apenas `src/tools/unbsfont/components/Toolbar.tsx` é alterado.
