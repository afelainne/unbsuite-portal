import React from 'react';

/**
 * UNBSCOLOR's small set of layout primitives, drawn from the UNBSTOOLS
 * workspace kit (design-system/reference/ui_kits/workspace). Every screen of
 * the tool is built from these so the anatomy stays identical:
 *
 *   Card        white, 16px radius, 24px padding, one hairline, no shadow;
 *               header = micro label left, up to two 32px quiet buttons right.
 *   Metric      a Regular numeral above its muted caption, 4px apart.
 *   TextTabs    quiet text tabs: muted, the active one ink with an underline.
 *   LegendToggle legend dots: a filled dot is on, a hollow ring is off.
 *   ValueRow    label · value on a hairline, for tables of values.
 */

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/* ---------------------------------------------------------------- Card */

interface CardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Micro label, rendered uppercase by the `.label` class. */
  label?: React.ReactNode;
  /** Right side of the header: quiet 32px icon buttons, or one small control. */
  actions?: React.ReactNode;
  /** `quiet` is the tone for a card that sits on white. */
  tone?: 'raised' | 'quiet';
  as?: 'section' | 'article' | 'div';
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
  /** `quiet` is the 32px card-header button; `surface` is the 40px title-row square. */
  variant?: 'quiet' | 'surface';
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
      variant === 'surface' ? 'ctl-lg ctl-outline [&_svg]:w-[18px] [&_svg]:h-[18px]' : 'ctl-sm ctl-gray',
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
  /** Display XL: one hero number per screen. */
  hero: 'text-[56px] md:text-[88px] leading-[1.02] tracking-[-0.02em]',
  /** Display M: a card's main value. */
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
  /** null when no item is selected. */
  value: T | null;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

/** Quiet text tabs, like the kit's "Week Month Quarter Year". */
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

/* -------------------------------------------------------- LegendToggle */

interface LegendToggleProps {
  label: React.ReactNode;
  on: boolean;
  onClick: () => void;
  /** Dot colour when on; ink by default. Data colour is allowed here. */
  color?: string;
  title?: string;
  /** `radio` for a single choice, `checkbox` for a multi-select. */
  role?: 'radio' | 'checkbox';
  disabled?: boolean;
}

/** A legend entry that doubles as a toggle: ● on, ○ off. */
export const LegendToggle: React.FC<LegendToggleProps> = ({ label, on, onClick, color, title, role = 'checkbox', disabled }) => (
  <button
    type="button"
    role={role}
    aria-checked={on}
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={cx(
      'inline-flex items-center gap-2 text-[14px] whitespace-nowrap transition-colors duration-fast ease-out disabled:opacity-40 disabled:pointer-events-none',
      on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
    )}
  >
    <span
      className="w-[10px] h-[10px] rounded-pill shrink-0 transition-colors duration-fast ease-out"
      style={on ? { background: color || 'hsl(var(--foreground))' } : { boxShadow: 'inset 0 0 0 1.5px hsl(var(--separator-strong))' }}
      aria-hidden="true"
    />
    {label}
  </button>
);

/** A static legend dot with its label. */
export const LegendDot: React.FC<{ label: React.ReactNode; color?: string; hollow?: boolean; className?: string }> = ({
  label,
  color,
  hollow,
  className
}) => (
  <span className={cx('inline-flex items-center gap-2 text-[14px] text-foreground whitespace-nowrap', className)}>
    <span
      className="w-2 h-2 rounded-pill shrink-0"
      style={hollow ? { boxShadow: 'inset 0 0 0 1.5px hsl(var(--separator-strong))' } : { background: color || 'hsl(var(--foreground))' }}
      aria-hidden="true"
    />
    {label}
  </span>
);

/* ------------------------------------------------------------ ValueRow */

interface ValueRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  last?: boolean;
  className?: string;
}

/** Label on the left in muted 14px, value on the right in ink, one hairline under. */
export const ValueRow: React.FC<ValueRowProps> = ({ label, value, last, className }) => (
  <div className={cx('flex items-center justify-between gap-4 min-h-10', !last && 'hairline-b', className)}>
    <span className="text-[14px] text-muted-foreground shrink-0">{label}</span>
    <span className="text-[14px] text-foreground tabular truncate text-right">{value}</span>
  </div>
);

/** Section heading between groups of cards: a title in the H2 step with an optional muted line. */
export const SectionHeading: React.FC<{ title: React.ReactNode; hint?: React.ReactNode; actions?: React.ReactNode }> = ({
  title,
  hint,
  actions
}) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="flex flex-col gap-1 min-w-0">
      <h2 className="text-[24px] md:text-[28px] font-normal leading-[1.2] tracking-[-0.01em] text-foreground">{title}</h2>
      {hint && <p className="text-[14px] text-muted-foreground max-w-[60ch]">{hint}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);
