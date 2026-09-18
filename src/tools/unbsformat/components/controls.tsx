import React, { useEffect, useId, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { fmt, parseNum } from '../lib/units';

/** Cartão do sistema: branco, 16 px de raio, um fio, sem sombra. Rótulo micro no cabeçalho. */
export const Card: React.FC<{
  title?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, actions, className = '', children }) => (
  <section className={`material-card flex flex-col gap-4 ${className}`}>
    {(title || actions) && (
      <div className="card-head">
        {title && <h2 className="label">{title}</h2>}
        {actions && <div className="card-actions">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

/** Valor grande sobre legenda. */
export const Metric: React.FC<{ value: React.ReactNode; caption: React.ReactNode; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  value, caption, size = 'md', className = '',
}) => (
  <div className={`metric ${size === 'lg' ? 'metric-lg' : size === 'sm' ? 'metric-sm' : ''} ${className}`}>
    <span className="metric-value">{value}</span>
    <span className="metric-caption">{caption}</span>
  </div>
);

interface NumberFieldProps {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  digits?: number;
  disabled?: boolean;
  className?: string;
  title?: string;
}

/**
 * Campo numérico que aceita vírgula ou ponto. Confirma ao sair ou no Enter;
 * setas sobem e descem um passo (Shift: dez passos).
 */
export const NumberField: React.FC<NumberFieldProps> = ({
  label, value, onCommit, suffix, step = 1, min = -Infinity, max = Infinity, digits = 2, disabled, className = '', title,
}) => {
  const id = useId();
  const [draft, setDraft] = useState(fmt(value, digits));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(fmt(value, digits));
  }, [value, digits]);

  const commit = (raw: string) => {
    const v = parseNum(raw);
    if (Number.isFinite(v)) {
      const clamped = Math.min(max, Math.max(min, v));
      onCommit(clamped);
      setDraft(fmt(clamped, digits));
    } else {
      setDraft(fmt(value, digits));
    }
  };

  const nudge = (dir: 1 | -1, big: boolean) => {
    const base = Number.isFinite(parseNum(draft)) ? parseNum(draft) : value;
    const next = Math.min(max, Math.max(min, base + dir * step * (big ? 10 : 1)));
    const rounded = Math.round(next * 1e6) / 1e6;
    setDraft(fmt(rounded, digits));
    onCommit(rounded);
  };

  return (
    <label htmlFor={id} className={`flex flex-col gap-1 min-w-0 ${className}`} title={title}>
      <span className="text-footnote text-muted-foreground truncate">{label}</span>
      <span className="relative flex items-center">
        <input
          id={id}
          aria-label={suffix ? `${label} em ${suffix}` : label}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={draft}
          onFocus={e => { focused.current = true; e.currentTarget.select(); }}
          onBlur={e => { focused.current = false; commit(e.currentTarget.value); }}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { commit(e.currentTarget.value); e.currentTarget.blur(); }
            else if (e.key === 'Escape') { setDraft(fmt(value, digits)); e.currentTarget.blur(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); nudge(1, e.shiftKey); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); nudge(-1, e.shiftKey); }
          }}
          className={`field field-sm tabular w-full ${suffix ? 'pr-8' : ''} disabled:opacity-40`}
        />
        {suffix && (
          <span className="absolute right-2 text-footnote text-muted-foreground pointer-events-none" aria-hidden="true">{suffix}</span>
        )}
      </span>
    </label>
  );
};

/** Inteiro com botões de menos e mais. */
export const Stepper: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}> = ({ label, value, onChange, min = 1, max = 48, disabled }) => {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v))));
  return (
    <div className="flex flex-col gap-1 min-w-0" role="group" aria-label={label}>
      <span className="text-footnote text-muted-foreground truncate">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" className="ctl ctl-outline ctl-icon ctl-sm shrink-0" aria-label={`Menos ${label.toLowerCase()}`} onClick={() => set(value - 1)} disabled={disabled || value <= min}>
          <Minus aria-hidden="true" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          disabled={disabled}
          value={value}
          onChange={e => {
            const v = parseInt(e.target.value, 10);
            if (Number.isFinite(v)) set(v);
          }}
          className="field field-sm tabular text-center min-w-0 flex-1 px-1 disabled:opacity-40"
        />
        <button type="button" className="ctl ctl-outline ctl-icon ctl-sm shrink-0" aria-label={`Mais ${label.toLowerCase()}`} onClick={() => set(value + 1)} disabled={disabled || value >= max}>
          <Plus aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

/** Interruptor: ligado = preenchimento preto, como toda seleção do sistema. */
export const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }> = ({
  checked, onChange, label, description,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className="flex items-center justify-between gap-3 w-full text-left rounded-sm py-1"
  >
    <span className="min-w-0">
      <span className="block text-subhead text-foreground">{label}</span>
      {description && <span className="block text-footnote text-muted-foreground">{description}</span>}
    </span>
    <span
      aria-hidden="true"
      className={`relative shrink-0 h-5 w-9 rounded-full transition-colors duration-fast ease-out ${checked ? 'bg-primary' : 'bg-fill-3'}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-card transition-transform duration-fast ease-out ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
      />
    </span>
  </button>
);

/** Controle segmentado: item ativo em preto. */
export function Segmented<T extends string>({
  value, options, onChange, label, size = 'md', className = '',
}: {
  value: T;
  options: { value: NoInfer<T>; label: React.ReactNode; title?: string; disabled?: boolean }[];
  onChange: (v: NoInfer<T>) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div className={`segmented ${className}`} role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`segmented-item ${o.value === value ? 'is-active' : ''} ${size === 'sm' ? 'h-6 px-2 text-footnote' : ''} disabled:opacity-40`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Abas de texto discretas, como no kit de referência. */
export function TextTabs<T extends string>({
  value, options, onChange, label, idPrefix,
}: {
  value: T;
  options: { value: NoInfer<T>; label: string }[];
  onChange: (v: NoInfer<T>) => void;
  label: string;
  idPrefix: string;
}) {
  return (
    <div className="flex items-center gap-4" role="tablist" aria-label={label}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${o.value}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${o.value}`}
            onClick={() => onChange(o.value)}
            className={`text-subhead h-8 transition-colors duration-fast ease-out ${active ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
