/**
 * Classes que os painéis do UNBSGRID repetem, no desenho do sistema
 * UNBSTOOLS. Ficam aqui, e não em `src/index.css`, porque só esta ferramenta
 * as usa. Os componentes que as acompanham estão em `chrome.tsx`.
 */

/** Fila de abas em texto: 14px, 16px entre elas, quebra se faltar largura. */
export const QUIET_TABLIST = 'flex flex-wrap items-center gap-x-4 gap-y-1';

/**
 * Uma aba em texto. Cinza em repouso, preta com um fio de 1,5px embaixo quando
 * ativa. Sem preenchimento: a seleção em bloco preto fica para botões e itens.
 */
export const quietTab = (active: boolean, extra = '') =>
  [
    'inline-flex items-center gap-1.5 whitespace-nowrap select-none pb-1 text-subhead',
    'border-b-[1.5px] transition-[color,border-color] duration-fast ease-out',
    'outline-none focus-visible:shadow-focus rounded-[2px]',
    'disabled:opacity-[0.38] disabled:pointer-events-none',
    active
      ? 'text-foreground border-foreground'
      : 'text-muted-foreground border-transparent hover:text-foreground',
    extra,
  ].join(' ');

/**
 * Grupo de opção curto (tela/impressão, tracejado, fundo): as pílulas do
 * sistema, sem o trilho cinza do `.segmented`. A escolhida é preta.
 */
export const PILL_GROUP = 'segmented bg-transparent p-0 gap-1';

/** Corpo de seção: respiro embaixo e 20px entre blocos. */
export const SECTION_BODY = 'pb-6 space-y-5';

/**
 * Botão quadrado da fila de título: branco com fio, 40px (36 no celular),
 * preto com glifo branco quando ligado.
 */
export const TITLE_ICON_BTN = 'ctl ctl-outline ctl-icon h-9 w-9 md:h-10 md:w-10 rounded-md shrink-0';
