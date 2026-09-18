import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cx } from './cx';

/**
 * As peças de layout do UNBSFONT, no desenho do sistema UNBSTOOLS
 * (design-system/reference/ui_kits/workspace). São as mesmas do UNBSCOLOR
 * (`src/tools/unbscolor/components/ui.tsx`), copiadas para cá para que as
 * ferramentas continuem independentes, mais o que um editor de fontes pede:
 * fila de título, folha modal, campo com rótulo, interruptor e barra de
 * progresso.
 *
 * Tudo usa tokens (`bg-card`, `text-foreground`, `bg-canvas`...), então o modo
 * escuro da ferramenta funciona só com a classe `dark` na raiz dela.
 */


/* ---------------------------------------------------------------- Card */

interface CardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Rótulo micro, em caixa alta pela classe `.label`. */
  label?: React.ReactNode;
  /** Direita do cabeçalho: botões de ícone de 32px, ou um controle pequeno. */
  actions?: React.ReactNode;
  /** `quiet` é o tom de um cartão que fica sobre branco. */
  tone?: 'raised' | 'quiet';
  as?: 'section' | 'article' | 'div' | 'aside';
  bodyClassName?: string;
}

export const Card: React.FC<CardProps> = ({
  label,
  actions,
  tone = 'raised',
  as: Tag = 'section',
  className,
  bodyClassName,
  children,
  ...rest
}) => (
  <Tag className={cx(tone === 'quiet' ? 'card-quiet' : 'material-card', 'flex flex-col gap-5 min-w-0', className)} {...rest}>
    {(label || actions) && (
      <header className="flex items-center justify-between gap-4 min-h-8">
        {label ? <span className="label">{label}</span> : <span />}
        {actions && <div className="flex items-center gap-1.5 flex-wrap justify-end">{actions}</div>}
      </header>
    )}
    {React.Children.toArray(children).length > 0 && (
      <div className={cx('flex flex-col gap-5 min-w-0 flex-1', bodyClassName)}>{children}</div>
    )}
  </Tag>
);

/* ---------------------------------------------------------- IconButton */

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  /** `quiet` é o botão de 32px do cabeçalho de cartão; `surface` é o quadrado de 40px da fila de título. */
  variant?: 'quiet' | 'surface' | 'plain' | 'danger';
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({ label, variant = 'quiet', active, className, children, ...rest }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={active === undefined ? undefined : active}
    className={cx(
      'ctl ctl-icon shrink-0',
      variant === 'surface' && 'ctl-lg ctl-outline [&_svg]:w-[18px] [&_svg]:h-[18px]',
      variant === 'quiet' && 'ctl-sm ctl-gray',
      variant === 'plain' && 'ctl-sm ctl-plain',
      variant === 'danger' && 'ctl-sm ctl-danger',
      active && 'ctl-active',
      className
    )}
    {...rest}
  >
    {children}
  </button>
);

/* -------------------------------------------------------------- Metric */

const METRIC_SIZES = {
  hero: 'text-[56px] md:text-[88px] leading-[1.02] tracking-[-0.02em]',
  lg: 'text-[34px] md:text-[44px] leading-[1.08] tracking-[-0.02em]',
  md: 'text-[28px] leading-[1.14] tracking-[-0.01em]',
  sm: 'text-[20px] leading-[1.2] tracking-[-0.01em]'
} as const;

interface MetricProps {
  value: React.ReactNode;
  caption?: React.ReactNode;
  size?: keyof typeof METRIC_SIZES;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

/** Numeral Regular sobre a legenda em cinza, 4px entre eles. */
export const Metric: React.FC<MetricProps> = ({ value, caption, size = 'md', align = 'left', className }) => (
  <div
    className={cx(
      'flex flex-col gap-1 min-w-0',
      align === 'right' && 'items-end text-right',
      align === 'center' && 'items-center text-center',
      className
    )}
  >
    <span className={cx('font-normal tabular text-foreground whitespace-nowrap', METRIC_SIZES[size])}>{value}</span>
    {caption && (
      <span className={cx('text-muted-foreground truncate max-w-full', size === 'sm' ? 'text-[12px]' : 'text-[13px]')}>
        {caption}
      </span>
    )}
  </div>
);

/* ------------------------------------------------------------ TextTabs */

export interface TabItem<T extends string> {
  value: T;
  label: React.ReactNode;
  title?: string;
  disabled?: boolean;
}

interface TextTabsProps<T extends string> {
  items: TabItem<T>[];
  value: T | null;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

/** Abas em texto: cinza em repouso, a ativa em tinta com um fio embaixo. */
export function TextTabs<T extends string>({ items, value, onChange, size = 'md', className, ariaLabel }: TextTabsProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cx('flex items-center gap-5 overflow-x-auto scrollbar-hide', className)}>
      {items.map((item) => {
        const on = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={on}
            title={item.title}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            className={cx(
              'shrink-0 whitespace-nowrap pb-1 border-b-[1.5px] transition-colors duration-fast ease-out disabled:opacity-40 disabled:pointer-events-none',
              size === 'sm' ? 'text-[12px]' : 'text-[14px]',
              on ? 'text-foreground border-foreground' : 'text-muted-foreground border-transparent hover:text-foreground'
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ Segmented */

interface SegmentedProps<T extends string> {
  items: { value: T; label: React.ReactNode; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}

/** Pílulas do sistema para uma escolha curta. A escolhida é preta. */
export function Segmented<T extends string>({ items, value, onChange, ariaLabel, className }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cx('segmented', className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="radio"
          aria-checked={item.value === value}
          title={item.title}
          onClick={() => onChange(item.value)}
          className={cx('segmented-item', item.value === value && 'is-active')}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ ValueRow */

interface ValueRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  last?: boolean;
  className?: string;
}

/** Rótulo em cinza à esquerda, valor em tinta à direita, um fio embaixo. */
export const ValueRow: React.FC<ValueRowProps> = ({ label, value, last, className }) => (
  <div className={cx('flex items-center justify-between gap-4 min-h-10', !last && 'hairline-b', className)}>
    <span className="text-[14px] text-muted-foreground shrink-0">{label}</span>
    <span className="text-[14px] text-foreground tabular truncate text-right">{value}</span>
  </div>
);

/** Título de seção entre grupos de cartões. */
export const SectionHeading: React.FC<{ title: React.ReactNode; hint?: React.ReactNode; actions?: React.ReactNode; className?: string }> = ({
  title,
  hint,
  actions,
  className
}) => (
  <div className={cx('flex flex-wrap items-end justify-between gap-4', className)}>
    <div className="flex flex-col gap-1 min-w-0">
      <h2 className="text-[24px] md:text-[28px] font-normal leading-[1.2] tracking-[-0.01em] text-foreground">{title}</h2>
      {hint && <p className="text-[14px] text-muted-foreground max-w-[60ch]">{hint}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

/* ------------------------------------------------------------ TitleRow */

interface TitleRowProps {
  title: React.ReactNode;
  /** Contexto da tela (não é mais exibido; o título já diz onde se está). */
  crumb?: React.ReactNode;
  actions?: React.ReactNode;
  /** Abas em texto sob o título. */
  tabs?: React.ReactNode;
  className?: string;
}

/** Fila de título: 40px Regular e botões quadrados à direita. */
export const TitleRow: React.FC<TitleRowProps> = ({ title, actions, tabs, className }) => (
  <div className={cx('w-full', className)}>
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 min-w-0">
        <h1 className="text-[30px] md:text-[40px] font-normal leading-[1.1] tracking-[-0.015em] text-foreground truncate max-w-full">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
    {tabs && <div className="mt-6">{tabs}</div>}
  </div>
);

/* --------------------------------------------------------------- Sheet */

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Largura máxima em Tailwind (`max-w-md`, `max-w-6xl`...). */
  size?: string;
  /** Cabeçalho: botões extras antes do fechar. */
  actions?: React.ReactNode;
  /** Rodapé fixo da folha. */
  footer?: React.ReactNode;
  children?: React.ReactNode;
  bodyClassName?: string;
  /** Ocupa quase a tela inteira (editores). */
  full?: boolean;
  zIndex?: string;
}

/**
 * Folha modal: véu em tinta a 30%, folha branca de 20px, título 24px Regular,
 * fechar em quadrado de 40px. Esc fecha.
 */
export const Sheet: React.FC<SheetProps> = ({
  open,
  onClose,
  title,
  description,
  size = 'max-w-lg',
  actions,
  footer,
  children,
  bodyClassName,
  full,
  zIndex = 'z-[70]'
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={cx('fixed inset-0 flex items-center justify-center p-3 md:p-6', zIndex)}>
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'relative w-full material-sheet fade-in-up flex flex-col min-h-0 text-foreground',
          full ? 'h-full max-h-full' : 'max-h-[90dvh]',
          size
        )}
      >
        <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 md:px-6 md:pt-6 shrink-0">
          <div className="min-w-0 flex flex-col gap-1">
            <h2 className="text-[22px] md:text-[24px] font-normal leading-[1.25] tracking-[-0.01em] text-foreground truncate">{title}</h2>
            {description && <p className="text-[14px] text-muted-foreground">{description}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {actions}
            <IconButton label="Fechar" variant="surface" onClick={onClose}>
              <X className="w-4 h-4" aria-hidden="true" />
            </IconButton>
          </div>
        </header>
        <div className={cx('flex-1 min-h-0 overflow-y-auto px-5 pb-5 md:px-6 md:pb-6', bodyClassName)}>{children}</div>
        {footer && <footer className="shrink-0 hairline-t px-5 py-4 md:px-6 flex items-center justify-end gap-2 flex-wrap">{footer}</footer>}
      </div>
    </div>
  );
};

/* --------------------------------------------------------------- Field */

interface FieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Valor lido à direita do rótulo (sliders). */
  value?: React.ReactNode;
}

/** Rótulo de 12px em cinza sobre o controle. */
export const Field: React.FC<FieldProps> = ({ label, hint, children, className, value }) => (
  <label className={cx('flex flex-col gap-1.5 min-w-0', className)}>
    <span className="flex items-baseline justify-between gap-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      {value !== undefined && <span className="text-[12px] text-foreground tabular">{value}</span>}
    </span>
    {children}
    {hint && <span className="text-[12px] text-muted-foreground">{hint}</span>}
  </label>
);

/* -------------------------------------------------------------- Switch */

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/** Interruptor em tinta, como o das configurações do UNBSCOLOR. */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, description, className, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cx('flex items-center justify-between gap-3 text-left disabled:opacity-40', className)}
  >
    <span className="min-w-0">
      <span className="block text-[14px] text-foreground">{label}</span>
      {description && <span className="block text-[12px] text-muted-foreground">{description}</span>}
    </span>
    <span
      aria-hidden="true"
      className={cx(
        'w-9 h-5 p-0.5 rounded-pill flex items-center shrink-0 transition-colors duration-fast ease-out',
        checked ? 'bg-primary justify-end' : 'bg-fill-3 justify-start'
      )}
    >
      <span className={cx('w-4 h-4 rounded-pill', checked ? 'bg-primary-foreground' : 'bg-card')} />
    </span>
  </button>
);

/* ------------------------------------------------------------ Progress */

/** Barra fina em tinta sobre trilho cinza, de 0 a 1. */
export const Progress: React.FC<{ value: number; className?: string; label?: string }> = ({ value, className, label }) => {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <div
      className={cx('h-1 w-full rounded-pill bg-fill-2 overflow-hidden', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
    >
      <div className="h-full rounded-pill bg-foreground transition-[width] duration-base ease-out" style={{ width: `${v * 100}%` }} />
    </div>
  );
};

/* ------------------------------------------------------------- Spinner */

export const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <span
    aria-hidden="true"
    className={cx('inline-block w-4 h-4 rounded-pill border-2 border-current border-t-transparent animate-spin', className)}
  />
);

/* ------------------------------------------------------------ GlyphSvg */

interface GlyphSvgProps {
  pathData?: string;
  leftSideBearing?: number;
  baselineOffset?: number;
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
  viewBox?: string;
  label?: string;
}

/** Desenho de um glifo em `currentColor`, na caixa de 1000 unidades. */
export const GlyphSvg: React.FC<GlyphSvgProps> = ({
  pathData,
  leftSideBearing = 0,
  baselineOffset = 0,
  scale = 1,
  className,
  style,
  viewBox = '0 0 1000 1000',
  label
}) => (
  <svg
    viewBox={viewBox}
    className={cx('fill-current overflow-visible', className)}
    style={style}
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
  >
    {pathData && (
      <g transform={`translate(${leftSideBearing}, ${baselineOffset}) scale(${scale})`}>
        <path d={pathData} />
      </g>
    )}
  </svg>
);
