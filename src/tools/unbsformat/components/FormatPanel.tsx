import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, RotateCw, Search, X } from 'lucide-react';
import { CATEGORY_LABEL, CATEGORY_ORDER, FORMAT_PRESETS, FormatPreset, nearestClassicRatio } from '../lib/formats';
import { matchesQuery, aspectRatioLabel } from '../lib/formatUtils';
import { BLEED_PRESETS } from '../lib/config';
import type { GridConfig } from '../lib/grid';
import { spineWidth } from '../lib/grid';
import { fmt, fromUnit, toUnit, Unit, UNIT_DIGITS } from '../lib/units';
import { NumberField, Segmented } from './controls';

interface Props {
  config: GridConfig;
  unit: Unit;
  onSelectPreset: (preset: FormatPreset) => void;
  onCustom: (width: number, height: number, unit: 'mm' | 'px') => void;
  onRotate: () => void;
  onChange: (patch: Partial<GridConfig>) => void;
}

const FOLD_LABEL: Record<GridConfig['fold'], string> = {
  none: 'Sem dobra',
  half: 'Uma dobra',
  roll: 'Carteira',
  z: 'Sanfona Z',
  gate: 'Janela',
};

export const FormatPanel: React.FC<Props> = ({ config, unit, onSelectPreset, onCustom, onRotate, onChange }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(() => {
    const current = FORMAT_PRESETS.find(f => f.id === config.formatId);
    return new Set([current?.category ?? 'iso']);
  });
  const [customUnit, setCustomUnit] = useState<'mm' | 'px'>(config.docUnit);
  const [custom, setCustom] = useState(() => ({
    width: config.docUnit === 'px' ? Math.round(toUnit(config.width, 'px')) : config.width,
    height: config.docUnit === 'px' ? Math.round(toUnit(config.height, 'px')) : config.height,
  }));
  const [pagesCount, setPagesCount] = useState(96);
  const [paper, setPaper] = useState(100);
  const searchRef = useRef<HTMLInputElement>(null);
  const searching = query.trim().length > 0;

  const groups = useMemo(
    () =>
      CATEGORY_ORDER.map(cat => ({ cat, items: FORMAT_PRESETS.filter(f => f.category === cat && matchesQuery(f, query)) }))
        .filter(g => !searching || g.items.length > 0),
    [query, searching],
  );
  const count = groups.reduce((s, g) => s + g.items.length, 0);

  const toggle = (cat: string) =>
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

  const ratio = nearestClassicRatio(config.width, config.height);
  const du = unit;
  const d = UNIT_DIGITS[du];
  const safeUniform = config.safe.top === config.safe.right && config.safe.top === config.safe.bottom && config.safe.top === config.safe.left;
  const isPrint = config.docUnit === 'mm';

  return (
    <div className="flex flex-col gap-5">
      {/* Formato ativo */}
      <section className="material-card flex flex-col gap-4">
        <div className="card-head">
          <h2 className="label">Formato ativo</h2>
          <button type="button" onClick={onRotate} className="ctl ctl-outline ctl-icon" aria-label="Girar orientação" title="Girar orientação">
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-title-3 truncate" title={config.formatName}>{config.formatName}</span>
          <span className="text-value text-muted-foreground">
            {fmt(toUnit(config.width, du), d)} × {fmt(toUnit(config.height, du), d)} {du}
            {' · '}{config.width > config.height ? 'paisagem' : config.width < config.height ? 'retrato' : 'quadrado'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="chip chip-outline tabular" title="Proporção largura por altura">{aspectRatioLabel(config.width, config.height)}</span>
          {ratio && (
            <span className="chip chip-outline" title={`Proporção clássica mais próxima (desvio de ${fmt(ratio.deviation, 2)}%)`}>
              {ratio.deviation < 0.5 ? '' : '≈ '}{ratio.ratio.label} · {ratio.ratio.name}
            </span>
          )}
        </div>
      </section>

      {/* Lista de formatos */}
      <section className="material-card flex flex-col gap-3 p-4">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setQuery(''); }}
            placeholder="Buscar formato ou medida"
            aria-label="Buscar formato por nome ou medida, como a4 ou 210x297"
            className="field pl-7 pr-8"
          />
          {searching && (
            <button
              type="button"
              onClick={() => { setQuery(''); searchRef.current?.focus(); }}
              aria-label="Limpar busca"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 ctl ctl-plain ctl-icon ctl-sm h-7 w-7"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
        {searching && (
          <p className="text-footnote text-muted-foreground" role="status">
            {count === 0 ? 'Nenhum formato encontrado' : `${count} formato${count > 1 ? 's' : ''}`}
          </p>
        )}
        <div className="flex flex-col max-h-[340px] lg:max-h-[420px] overflow-y-auto -mx-1 px-1">
          {groups.map(({ cat, items }) => {
            const expanded = searching || open.has(cat);
            return (
              <div key={cat} className="flex flex-col">
                <button type="button" className="panel-section-head px-1" aria-expanded={expanded} onClick={() => toggle(cat)}>
                  <span>{CATEGORY_LABEL[cat]}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-footnote text-muted-foreground font-normal tabular">{items.length}</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-fast ease-out ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </span>
                </button>
                {expanded && (
                  <ul className="flex flex-col pb-1">
                    {items.map(f => {
                      const active = f.id === config.formatId;
                      return (
                        <li key={f.id}>
                          <button
                            type="button"
                            onClick={() => onSelectPreset(f)}
                            aria-current={active ? 'true' : undefined}
                            data-active={active}
                            className="row justify-between"
                          >
                            <span className="truncate">{f.name}</span>
                            <span className={`text-footnote tabular shrink-0 ${active ? 'opacity-70' : 'text-muted-foreground'}`}>
                              {fmt(f.width, 2)} × {fmt(f.height, 2)}{f.unit === 'px' ? ' px' : ''}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Personalizado */}
      <section className="material-card flex flex-col gap-3">
        <div className="card-head">
          <h2 className="label">Formato personalizado</h2>
          <Segmented
            size="sm"
            label="Unidade do formato personalizado"
            value={customUnit}
            onChange={setCustomUnit}
            options={[{ value: 'mm', label: 'mm' }, { value: 'px', label: 'px' }]}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Largura" suffix={customUnit} value={custom.width} min={1} max={customUnit === 'px' ? 20000 : 10000} onCommit={v => setCustom(c => ({ ...c, width: v }))} />
          <NumberField label="Altura" suffix={customUnit} value={custom.height} min={1} max={customUnit === 'px' ? 20000 : 10000} onCommit={v => setCustom(c => ({ ...c, height: v }))} />
        </div>
        {(() => {
          const r = nearestClassicRatio(custom.width, custom.height);
          return r ? (
            <p className="text-footnote text-muted-foreground">
              Proporção {aspectRatioLabel(custom.width, custom.height)}, perto de {r.ratio.label} ({r.ratio.name.toLowerCase()}, desvio de {fmt(r.deviation, 1)}%).
            </p>
          ) : null;
        })()}
        <div className="flex gap-2">
          <button type="button" className="ctl ctl-outline flex-1" onClick={() => setCustom(c => ({ width: c.height, height: c.width }))}>
            Trocar lados
          </button>
          <button type="button" className="ctl ctl-filled flex-1" onClick={() => onCustom(custom.width, custom.height, customUnit)}>
            Usar este formato
          </button>
        </div>
      </section>

      {/* Produção */}
      <section className="material-card flex flex-col gap-4">
        <h2 className="label">Produção</h2>
        {isPrint && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Sangria" suffix={du} digits={d} step={du === 'in' ? 0.0625 : 0.5} min={0} max={toUnit(50, du)} value={toUnit(config.bleed, du)} onCommit={v => onChange({ bleed: fromUnit(v, du) })} />
              <NumberField
                label={safeUniform ? 'Área de segurança' : 'Segurança (uniforme)'}
                suffix={du}
                digits={d}
                step={du === 'in' ? 0.0625 : 0.5}
                min={0}
                max={toUnit(Math.min(config.width, config.height) / 2, du)}
                value={toUnit(config.safe.top, du)}
                onCommit={v => { const mm = fromUnit(v, du); onChange({ safe: { top: mm, right: mm, bottom: mm, left: mm } }); }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sangrias padrão">
              {BLEED_PRESETS.map(b => (
                <button
                  key={b.label}
                  type="button"
                  aria-pressed={Math.abs(config.bleed - b.value) < 0.001}
                  className="ctl ctl-outline ctl-sm"
                  onClick={() => onChange({ bleed: b.value })}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <p className="text-footnote text-muted-foreground">3 mm é o padrão europeu e brasileiro; 1/8 in (3,175 mm), o americano. Grandes formatos pedem 5 mm ou mais.</p>
          </div>
        )}
        {!isPrint && (
          <p className="text-footnote text-muted-foreground">
            {safeUniform && config.safe.top === 0
              ? 'Formato de tela: sem sangria. A área segura desta plataforma não foi definida.'
              : `Área segura da plataforma: ${fmt(toUnit(config.safe.top, 'px'), 1)} px no topo, ${fmt(toUnit(config.safe.bottom, 'px'), 1)} na base, ${fmt(toUnit(config.safe.left, 'px'), 1)} e ${fmt(toUnit(config.safe.right, 'px'), 1)} nas laterais.`}
          </p>
        )}

        {isPrint && (
          <div className="flex flex-col gap-2">
            <span className="text-footnote text-muted-foreground">Dobra da folha aberta</span>
            <select
              className="field field-sm"
              value={config.fold}
              aria-label="Dobra da folha aberta"
              onChange={e => onChange({ fold: e.target.value as GridConfig['fold'], facing: e.target.value === 'none' ? config.facing : false })}
            >
              {(Object.keys(FOLD_LABEL) as GridConfig['fold'][]).map(f => (
                <option key={f} value={f}>{FOLD_LABEL[f]}</option>
              ))}
            </select>
            {(config.fold === 'roll' || config.fold === 'gate') && (
              <NumberField
                label={config.fold === 'roll' ? 'Painel que entra por dentro, mais estreito em' : 'Abas mais estreitas, no total'}
                suffix="mm"
                step={0.5}
                min={0}
                max={20}
                value={config.foldTuck}
                onCommit={v => onChange({ foldTuck: v })}
              />
            )}
            {config.fold === 'roll' && (
              <Segmented
                label="Lado da folha"
                value={config.foldSide}
                onChange={v => onChange({ foldSide: v })}
                options={[{ value: 'inside', label: 'Miolo' }, { value: 'outside', label: 'Capa e verso' }]}
              />
            )}
          </div>
        )}

        {isPrint && (
          <div className="flex flex-col gap-2 hairline-t pt-4">
            <span className="text-footnote text-muted-foreground">Lombada de brochura</span>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Páginas" digits={0} min={4} max={3000} step={4} value={pagesCount} onCommit={setPagesCount} />
              <NumberField label="Papel" suffix="µm" digits={0} min={40} max={600} step={5} value={paper} onCommit={setPaper} title="Espessura da folha em micrômetros (offset 90 g ≈ 100 µm)" />
            </div>
            <p className="text-subhead">
              Lombada de <span className="text-value">{fmt(spineWidth(pagesCount, paper), 2)} mm</span>
              <span className="text-footnote text-muted-foreground"> ({Math.ceil(pagesCount / 2)} folhas; some a capa)</span>
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
