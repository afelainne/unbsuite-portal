/**
 * Componentes que todos os painéis do UNBSGRID repetem, no desenho do sistema
 * UNBSTOOLS: o cabeçalho de seção em rótulo micro com a seta à direita e a
 * linha rótulo / valor das leituras. As classes irmãs estão em
 * `chrome-classes.ts`.
 */
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { CollapsibleTrigger } from './ui/collapsible';
import InfoTooltip from './InfoTooltip';

interface SectionHeadProps {
  label: string;
  open: boolean;
  /** Leitura curta à direita do rótulo (nota, contagem, formato). */
  meta?: React.ReactNode;
  /** Texto do botão de informação ao lado do cabeçalho. */
  tooltip?: string;
  /** Botão extra à direita, fora do gatilho. */
  action?: React.ReactNode;
  ariaLabel?: string;
}

/**
 * Cabeçalho de seção recolhível: rótulo micro em tinta à esquerda, leitura
 * opcional e a seta à direita. Precisa estar dentro de um `<Collapsible>`.
 */
export const SectionHead: React.FC<SectionHeadProps> = ({ label, open, meta, tooltip, action, ariaLabel }) => {
  const hasMeta = meta !== undefined && meta !== null && meta !== false && meta !== '';
  return (
    <div className="flex items-center gap-1">
      <CollapsibleTrigger
        aria-label={ariaLabel}
        className="flex h-11 flex-1 min-w-0 items-center gap-2 rounded-sm -ml-2 pl-2 pr-1.5 text-left transition-colors duration-fast ease-out hover:bg-fill outline-none focus-visible:shadow-focus"
      >
        <span className="label text-foreground truncate">{label}</span>
        {hasMeta && (
          <span className="ml-auto shrink-0 text-footnote text-muted-foreground tabular-nums">{meta}</span>
        )}
        <ChevronDown
          className={`${hasMeta ? '' : 'ml-auto '}h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-base ease-out`}
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
          strokeWidth={2}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      {tooltip && <InfoTooltip content={tooltip} />}
      {action}
    </div>
  );
};

/** Linha rótulo / valor, o formato das leituras nos painéis. */
export const ValueRow: React.FC<{
  label: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  /** Barra fina em tinta sob a linha, de 0 a 1. */
  meter?: number;
}> = ({ label, children, title, meter }) => (
  <div className="py-2 min-w-0" title={title}>
    <div className="flex items-baseline justify-between gap-3 min-w-0">
      <span className="text-subhead text-muted-foreground truncate">{label}</span>
      <span className="text-value text-foreground shrink-0">{children}</span>
    </div>
    {meter !== undefined && (
      <div className="mt-2 h-[3px] w-full rounded-pill bg-fill-2 overflow-hidden" aria-hidden="true">
        <div
          className="h-full rounded-pill bg-foreground transition-[width] duration-base ease-out"
          style={{ width: `${Math.max(0, Math.min(1, Number.isFinite(meter) ? meter : 0)) * 100}%` }}
        />
      </div>
    )}
  </div>
);
