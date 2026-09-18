import React, { useEffect, useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import type { Metrics, Project } from '../lib/types';
import { Card, Field, IconButton } from './ui';
import { cx } from './cx';

/** Campo numérico que só confirma ao sair ou apertar Enter (não reescala a cada tecla). */
export const NumberInput: React.FC<{
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
  label: string;
}> = ({ value, onCommit, min, max, className, label }) => {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const v = Number(text.replace(',', '.'));
    if (!Number.isFinite(v)) { setText(String(value)); return; }
    const clamped = Math.round(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v)));
    if (clamped !== value) onCommit(clamped);
    else setText(String(value));
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className={cx('field tabular', className)}
    />
  );
};

/** Métrica grande e editável: numeral Regular sobre a legenda. */
const MetricField: React.FC<{ label: string; value: number; onCommit: (v: number) => void; min?: number; max?: number }> = ({ label, value, onCommit, min, max }) => (
  <div className="flex flex-col gap-1 min-w-0">
    <NumberInput
      label={label}
      value={value}
      onCommit={onCommit}
      min={min}
      max={max}
      className="!h-auto !px-0 !bg-transparent !shadow-none hover:!shadow-none focus:!shadow-[inset_0_-1px_0_hsl(var(--foreground))] !rounded-none text-[28px] leading-[1.14] tracking-[-0.01em] font-normal"
    />
    <span className="text-[12px] text-muted-foreground">{label}</span>
  </div>
);

interface SidebarProps {
  project: Project;
  styleId: string;
  onFamily: (family: string) => void;
  onDesigner: (designer: string) => void;
  onSelectStyle: (id: string) => void;
  onAddStyle: (name: string, copyFrom?: string) => void;
  onRenameStyle: (id: string, name: string) => void;
  onRemoveStyle: (id: string) => void;
  onMetrics: (m: Metrics) => void;
  onUpm: (upm: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ project, styleId, onFamily, onDesigner, onSelectStyle, onAddStyle, onRenameStyle, onRemoveStyle, onMetrics, onUpm }) => {
  const [newName, setNewName] = useState('');
  const style = project.styles.find(s => s.id === styleId) ?? project.styles[0];
  const m = project.metrics;
  const set = (patch: Partial<Metrics>) => onMetrics({ ...m, ...patch });
  const add = (copy: boolean) => {
    const name = newName.trim() || (copy ? `${style.name} cópia` : 'Bold');
    onAddStyle(name, copy ? style.id : undefined);
    setNewName('');
  };

  return (
    <div className="flex flex-col gap-5">
      <Card label="Família">
        <Field label="Nome da família">
          <input className="field" value={project.family} onChange={e => onFamily(e.target.value)} />
        </Field>
        <Field label="Designer">
          <input className="field" value={project.designer} placeholder="Opcional" onChange={e => onDesigner(e.target.value)} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-muted-foreground">Estilos</span>
          <div className="flex flex-col gap-0.5" role="listbox" aria-label="Estilos">
            {project.styles.map(s => {
              const count = Object.values(s.glyphs).filter(g => g.outline.length).length;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={s.id === style.id}
                  onClick={() => onSelectStyle(s.id)}
                  className={cx('row justify-between', s.id === style.id && 'is-active')}
                >
                  <span className="truncate">{s.name}</span>
                  <span className="text-[12px] tabular opacity-70">{count} glifos</span>
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Nome do estilo atual">
          <div className="flex gap-1.5">
            <input className="field" value={style.name} onChange={e => onRenameStyle(style.id, e.target.value)} />
            <IconButton label="Excluir este estilo" variant="danger" disabled={project.styles.length < 2} onClick={() => onRemoveStyle(style.id)}>
              <Trash2 aria-hidden="true" />
            </IconButton>
          </div>
        </Field>
        <Field label="Novo estilo" hint="Cada estilo tem os seus glifos, espaço e kerning.">
          <div className="flex gap-1.5">
            <input className="field" value={newName} placeholder="Bold, Italic…" onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(false); }} />
            <IconButton label="Criar estilo vazio" onClick={() => add(false)}><Plus aria-hidden="true" /></IconButton>
            <IconButton label="Criar como cópia do atual" onClick={() => add(true)}><Copy aria-hidden="true" /></IconButton>
          </div>
        </Field>
      </Card>

      <Card label="Métricas">
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          <MetricField label="UPM" value={m.unitsPerEm} min={16} max={16384} onCommit={onUpm} />
          <MetricField label="Maiúsculas" value={m.capHeight} min={1} max={m.unitsPerEm * 2} onCommit={v => set({ capHeight: v })} />
          <MetricField label="Altura-x" value={m.xHeight} min={1} max={m.unitsPerEm * 2} onCommit={v => set({ xHeight: v })} />
          <MetricField label="Ascendente" value={m.ascender} min={0} max={m.unitsPerEm * 3} onCommit={v => set({ ascender: v })} />
          <MetricField label="Descendente" value={m.descender} min={-m.unitsPerEm * 3} max={0} onCommit={v => set({ descender: v })} />
          <MetricField label="Entrelinha extra" value={m.lineGap} min={0} max={m.unitsPerEm * 3} onCommit={v => set({ lineGap: v })} />
          <MetricField label="Espaço" value={m.spaceWidth} min={0} max={m.unitsPerEm * 2} onCommit={v => set({ spaceWidth: v })} />
        </div>
        <p className="text-[12px] text-muted-foreground">A altura das maiúsculas define a escala do desenho. Mudar a UPM reescala tudo.</p>
      </Card>
    </div>
  );
};
