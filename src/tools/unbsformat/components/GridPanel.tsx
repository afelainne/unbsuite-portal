import React, { useEffect, useState } from 'react';
import type { GridConfig, GridResult, Margins, MethodId } from '../lib/grid';
import { columnCountOf } from '../lib/grid';
import { gerstnerDivisions, METHOD_GROUP_LABEL, methodInfo, METHODS, MethodGroup } from '../lib/methods';
import { fmt, fromUnit, toUnit, Unit, UNIT_DIGITS } from '../lib/units';
import { NumberField, Stepper, Switch } from './controls';

interface Props {
  config: GridConfig;
  result: GridResult;
  unit: Unit;
  onChange: (patch: Partial<GridConfig>) => void;
  onMethod: (id: MethodId, opts?: { columns?: number; rows?: number }) => void;
  onClose: () => void;
  section: 'grade' | 'linhas';
}

/** Campos de Müller-Brockmann: 8, 20 e 32 campos são os exemplos do livro. */
const MB_FIELDS: { columns: number; rows: number; label: string }[] = [
  { columns: 2, rows: 2, label: '4' },
  { columns: 2, rows: 4, label: '8' },
  { columns: 3, rows: 3, label: '9' },
  { columns: 4, rows: 5, label: '20' },
  { columns: 4, rows: 8, label: '32' },
  { columns: 6, rows: 8, label: '48' },
  { columns: 8, rows: 8, label: '64' },
];

const CANON: MethodId[] = ['vandegraaf', 'villard', 'tschichold', 'rosarivo9', 'rosarivo12', 'aurea', 'samara_manuscrito'];

/** Lê "1:2:1" ou "2 1" em proporções positivas. */
function parseRatios(s: string): number[] | null {
  const parts = s.split(/[:\s,;/]+/).map(p => parseFloat(p.replace(',', '.'))).filter(v => Number.isFinite(v) && v > 0);
  return parts.length >= 2 ? parts.slice(0, 24) : null;
}

export const GridPanel: React.FC<Props> = ({ config, result, unit, onChange, onMethod, onClose, section }) => {
  const du = unit;
  const d = UNIT_DIGITS[du];
  const tu: Unit = config.docUnit === 'px' ? 'px' : 'pt';
  const info = methodInfo(config.method);
  const sided = config.facing || config.fold !== 'none';
  const cols = columnCountOf(config);
  const [ratiosDraft, setRatiosDraft] = useState(config.columnRatios ? config.columnRatios.join(':') : '');
  useEffect(() => setRatiosDraft(config.columnRatios ? config.columnRatios.join(':') : ''), [config.columnRatios]);

  const setMargin = (key: keyof Margins, v: number) => {
    const patch: Partial<GridConfig> = { margins: { ...config.margins, [key]: fromUnit(v, du) } };
    // Mexer à mão numa margem de cânone desfaz o cânone.
    if (CANON.includes(config.method)) patch.method = 'livre';
    onChange(patch);
  };

  const groups = (Object.keys(METHOD_GROUP_LABEL) as MethodGroup[]).map(g => ({ g, items: METHODS.filter(m => m.group === g) }));
  const mm = (v: number) => toUnit(v, du);
  const lines = result.lines;

  if (section === 'linhas') {
    const bl = config.baseline;
    return (
      <div className="flex flex-col gap-5">
        <section className="material-card flex flex-col gap-4">
          <h2 className="label">Linha de base</h2>
          <Switch
            checked={bl.enabled}
            onChange={v => onChange({ baseline: { ...bl, enabled: v } })}
            label="Grade de linha de base"
            description="Campos com número inteiro de linhas: as linhas da grade viram linhas de texto."
          />
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Entrelinha" suffix={tu} digits={2} step={tu === 'px' ? 1 : 0.5} min={toUnit(0.5, tu)} max={toUnit(200, tu)} value={toUnit(bl.leading, tu)} disabled={!bl.enabled} onCommit={v => onChange({ baseline: { ...bl, leading: fromUnit(v, tu) } })} />
            <NumberField label="Corpo do texto" suffix={tu} digits={2} step={tu === 'px' ? 1 : 0.5} min={toUnit(0.5, tu)} max={toUnit(200, tu)} value={toUnit(config.fontSize, tu)} onCommit={v => onChange({ fontSize: fromUnit(v, tu) })} />
            <NumberField
              label="Início após a margem"
              suffix={tu}
              digits={2}
              step={tu === 'px' ? 1 : 0.5}
              min={0}
              max={toUnit(bl.leading, tu)}
              value={toUnit(bl.offset, tu)}
              disabled={!bl.enabled}
              title="Deslocamento da grade de linha de base, relativo à margem superior. Com 0, cada campo termina numa linha de base."
              onCommit={v => onChange({ baseline: { ...bl, offset: fromUnit(v, tu) } })}
            />
            <div className="flex flex-col gap-1">
              <span className="text-footnote text-muted-foreground">Corpo / entrelinha</span>
              <span className="text-value h-7 flex items-center">
                {fmt(toUnit(config.fontSize, tu), 1)}/{fmt(toUnit(bl.leading, tu), 1)} {tu}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stepper label="Medianiz vertical (linhas)" min={0} max={20} value={bl.rowGutterLines} disabled={!bl.enabled} onChange={v => onChange({ baseline: { ...bl, rowGutterLines: v } })} />
            <Stepper label="Medianiz horizontal (linhas)" min={0} max={20} value={bl.columnGutterLines} disabled={!bl.enabled} onChange={v => onChange({ baseline: { ...bl, columnGutterLines: v } })} />
          </div>
          <p className="text-footnote text-muted-foreground">
            Medianiz horizontal em 0 usa o valor livre da aba Grade. Müller-Brockmann usa uma linha nas duas direções.
          </p>
        </section>

        {bl.enabled && (
          <section className="material-card flex flex-col gap-3">
            <h2 className="label">Fechamento</h2>
            {lines && (
              <p className="text-subhead">
                <span className="text-value">{lines.used}</span> de <span className="text-value">{lines.available}</span> linhas usadas:{' '}
                {config.rows} × {lines.perRow} de campo + {config.rows - 1} × {bl.rowGutterLines} de medianiz.
              </p>
            )}
            <p className={`text-subhead ${result.closes ? '' : 'font-semibold'}`}>
              {result.closes ? 'A grade fecha exatamente na linha de base.' : `Sobram ${fmt(toUnit(result.leftover, du), d)} ${du} no pé da mancha.`}
            </p>
            <button type="button" className="ctl ctl-filled w-full" onClick={onClose} disabled={result.closes && config.docUnit !== 'px'}>
              Ajustar margens para fechar a grade
            </button>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Método */}
      <section className="material-card flex flex-col gap-3">
        <h2 className="label">Método</h2>
        <select className="field" value={config.method} aria-label="Método de construção" onChange={e => onMethod(e.target.value as MethodId)}>
          {groups.map(({ g, items }) => (
            <optgroup key={g} label={METHOD_GROUP_LABEL[g]}>
              {items.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </optgroup>
          ))}
        </select>
        <p className="text-subhead text-muted-foreground">{info.summary}</p>
        {info.source && <p className="text-footnote text-muted-foreground">Fonte: {info.source}</p>}

        {(config.method === 'mullerbrockmann' || config.method === 'samara_modular') && (
          <div className="flex flex-col gap-2">
            <span className="text-footnote text-muted-foreground">Campos</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Número de campos">
              {MB_FIELDS.map(f => (
                <button
                  key={f.label}
                  type="button"
                  className="ctl ctl-outline ctl-sm tabular"
                  aria-pressed={cols === f.columns && config.rows === f.rows}
                  title={`${f.columns} colunas × ${f.rows} linhas`}
                  onClick={() => onMethod(config.method, { columns: f.columns, rows: f.rows })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {config.method === 'gerstner' && (
          <div className="flex flex-col gap-2">
            <span className="text-footnote text-muted-foreground">Colunas sobre as 58 unidades</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Colunas de Gerstner">
              {gerstnerDivisions(1).map(g => (
                <button
                  key={g.columns}
                  type="button"
                  className="ctl ctl-outline ctl-sm ctl-icon tabular"
                  aria-pressed={cols === g.columns}
                  title={`${g.columns} × ${g.columnUnits} unidades + ${g.columns - 1} × 2`}
                  onClick={() => onMethod('gerstner', { columns: g.columns, rows: config.rows })}
                >
                  {g.columns}
                </button>
              ))}
            </div>
          </div>
        )}

        {config.method !== 'livre' && (
          <button type="button" className="ctl ctl-outline" onClick={() => onMethod(config.method, { columns: cols, rows: config.rows })}>
            Reaplicar ao formato atual
          </button>
        )}
      </section>

      {/* Margens */}
      <section className="material-card flex flex-col gap-3">
        <div className="card-head">
          <h2 className="label">Margens</h2>
          <span className="text-footnote text-muted-foreground">{du}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Superior" suffix={du} digits={d} step={du === 'in' ? 0.0625 : du === 'mm' ? 0.5 : 1} min={0} max={mm(config.height)} value={mm(config.margins.top)} onCommit={v => setMargin('top', v)} />
          <NumberField label="Inferior" suffix={du} digits={d} step={du === 'in' ? 0.0625 : du === 'mm' ? 0.5 : 1} min={0} max={mm(config.height)} value={mm(config.margins.bottom)} onCommit={v => setMargin('bottom', v)} />
          <NumberField label={sided ? (config.fold !== 'none' ? 'Na dobra' : 'Interna') : 'Esquerda'} suffix={du} digits={d} step={du === 'in' ? 0.0625 : du === 'mm' ? 0.5 : 1} min={0} max={mm(config.width)} value={mm(config.margins.inside)} onCommit={v => setMargin('inside', v)} />
          <NumberField label={sided ? (config.fold !== 'none' ? 'Na borda' : 'Externa') : 'Direita'} suffix={du} digits={d} step={du === 'in' ? 0.0625 : du === 'mm' ? 0.5 : 1} min={0} max={mm(config.width)} value={mm(config.margins.outside)} onCommit={v => setMargin('outside', v)} />
        </div>
        <Switch
          checked={config.facing}
          onChange={v => onChange({ facing: v, fold: v ? 'none' : config.fold })}
          label="Páginas espelhadas"
          description="Interna e externa trocam de lado na página par."
        />
      </section>

      {/* Colunas e linhas */}
      <section className="material-card flex flex-col gap-3">
        <h2 className="label">Colunas e linhas</h2>
        <div className="grid grid-cols-2 gap-2">
          <Stepper label="Colunas" value={cols} onChange={v => onChange({ columns: v, columnRatios: null })} />
          <Stepper label="Linhas" value={config.rows} onChange={v => onChange({ rows: v })} />
          <NumberField
            label="Medianiz horizontal"
            suffix={du}
            digits={d}
            step={du === 'mm' ? 0.5 : 1}
            min={0}
            max={mm(config.width)}
            value={mm(result.columnGutter)}
            disabled={config.baseline.enabled && config.baseline.columnGutterLines > 0}
            title={config.baseline.enabled && config.baseline.columnGutterLines > 0 ? 'Definida em linhas na aba Linha de base' : undefined}
            onCommit={v => onChange({ columnGutter: fromUnit(v, du) })}
          />
          <NumberField
            label="Medianiz vertical"
            suffix={du}
            digits={d}
            step={du === 'mm' ? 0.5 : 1}
            min={0}
            max={mm(config.height)}
            value={mm(result.rowGutter)}
            disabled={config.baseline.enabled}
            title={config.baseline.enabled ? 'Definida em linhas na aba Linha de base' : undefined}
            onCommit={v => onChange({ rowGutter: fromUnit(v, du) })}
          />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-footnote text-muted-foreground">Proporção das colunas (grade hierárquica)</span>
          <input
            type="text"
            className="field field-sm tabular"
            placeholder="Iguais. Ex.: 1:2 ou 2:1:1"
            value={ratiosDraft}
            onChange={e => setRatiosDraft(e.target.value)}
            onBlur={() => onChange({ columnRatios: parseRatios(ratiosDraft) })}
            onKeyDown={e => { if (e.key === 'Enter') onChange({ columnRatios: parseRatios(ratiosDraft) }); }}
          />
        </label>
      </section>
    </div>
  );
};
