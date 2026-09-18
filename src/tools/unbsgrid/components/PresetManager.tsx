/**
 * Biblioteca de presets.
 *
 * Busca, filtro por família em abas de texto e uma linha por preset:
 * miniatura esquemática da construção numa moldura rebaixada, nome, duas
 * linhas de descrição e a contagem em legenda. Os seus vêm primeiro, sob o
 * próprio título; os prontos seguem agrupados por família.
 */
import React, { useMemo, useState } from 'react';
import { Save, FolderOpen, RotateCcw, Search } from 'lucide-react';
import type { GeometryPreset, PresetFamily } from '../lib/preset-engine';
import { PRESET_FAMILIES, presetDisplayName, presetDisplayDescription } from '../lib/preset-engine';
import { constructionCount } from '../lib/preset-thumb';
import PresetThumb from './PresetThumb';
import { useLanguage, fill, plural } from '../i18n';
import { quietTab } from './chrome-classes';

interface Props {
  activePreset: GeometryPreset | null;
  isModified: boolean;
  onSaveClick: () => void;
  onLoadClick: () => void;
  onRevert: () => void;
  /** Every preset, built-in and user. */
  presets?: GeometryPreset[];
  onApplyPreset?: (preset: GeometryPreset) => void;
}

/** Accent-insensitive, case-insensitive contains. */
const normalize = (value: string) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

type FamilyFilter = PresetFamily | 'all';

/** Grade fluida: uma coluna no painel estreito, duas quando há espaço. */
const CARD_GRID = 'grid gap-x-3 gap-y-0.5 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]';

const PresetManager: React.FC<Props> = ({
  activePreset, isModified, onSaveClick, onLoadClick, onRevert, presets = [], onApplyPreset,
}) => {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<FamilyFilter>('all');
  const { t } = useLanguage();
  const p = t.presetsUi;
  const familyFilters: ReadonlyArray<{ value: FamilyFilter; label: string; hint: string }> = [
    { value: 'all', label: p.filterAll, hint: p.filterAllHint },
    ...PRESET_FAMILIES.map(f => ({ value: f.id as FamilyFilter, label: f.label, hint: f.hint })),
  ];

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return presets.filter(p => {
      if (family !== 'all' && p.family !== family) return false;
      if (!q) return true;
      return normalize(presetDisplayName(p, t)).includes(q) || normalize(presetDisplayDescription(p, t)).includes(q);
    });
    // The display names follow the language, so the dictionary is a dependency.
  }, [presets, query, family, t]);

  const userPresets = useMemo(() => visible.filter(p => !p.isBuiltin), [visible]);
  const builtinPresets = useMemo(() => visible.filter(p => p.isBuiltin), [visible]);

  /** Built-ins grouped by family, in the order the families are declared. */
  const builtinByFamily = useMemo(
    () => PRESET_FAMILIES
      .map(f => ({ family: f, list: builtinPresets.filter(p => p.family === f.id) }))
      .filter(group => group.list.length > 0),
    [builtinPresets],
  );

  const renderPreset = (preset: GeometryPreset, showFamily = false) => {
    const isActive = activePreset?.id === preset.id;
    const name = presetDisplayName(preset, t);
    const description = presetDisplayDescription(preset, t);
    const count = constructionCount(preset);
    const meta = [
      plural(count, p.constructionOne, p.constructionMany, { n: count }),
      showFamily ? PRESET_FAMILIES.find(f => f.id === preset.family)?.label : null,
    ].filter(Boolean).join(' · ');
    // Uma linha de lista, não um cartão dentro do cartão: miniatura numa
    // moldura rebaixada, nome, descrição e a contagem em legenda. O preset
    // aplicado é a seleção do sistema, preenchimento preto e texto branco.
    return (
      <button
        type="button"
        key={preset.id}
        onClick={() => onApplyPreset?.(preset)}
        aria-pressed={isActive}
        title={description || name}
        className={`flex w-full items-start gap-3 rounded-md px-2 py-2.5 -mx-2 text-left transition-colors duration-fast ease-out ${
          isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-fill'
        }`}
        style={{ width: 'calc(100% + 1rem)' }}
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm ${isActive ? 'bg-primary-foreground/10' : 'bg-canvas'}`}>
          <PresetThumb preset={preset} inverted={isActive} className="h-8 w-8" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-subhead">{name}</span>
          {description && (
            <span
              className={`mt-0.5 text-footnote line-clamp-2 ${
                isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}
            >
              {description}
            </span>
          )}
          <span className={`mt-1 block text-footnote tabular-nums ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {meta}
          </span>
        </span>
      </button>
    );
  };

  const groupHead = (label: string, total: number, hint?: string) => (
    <div className="mb-1 flex items-baseline justify-between gap-2">
      <span className="label" title={hint}>{label}</span>
      <span className="text-caption text-muted-foreground tabular-nums">{total}</span>
    </div>
  );

  return (
    <div className="space-y-5">
      {activePreset && (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="label shrink-0">{p.active}</span>
          <span className="text-callout font-medium text-foreground truncate">{presetDisplayName(activePreset, t)}</span>
          {isModified && <span className="chip chip-outline shrink-0">{p.modified}</span>}
        </div>
      )}

      <div className="flex gap-1.5">
        <button type="button" className="ctl ctl-outline ctl-sm flex-1" onClick={onLoadClick}>
          <FolderOpen className="h-3.5 w-3.5" /> {p.open}
        </button>
        <button type="button" className="ctl ctl-outline ctl-sm flex-1" onClick={onSaveClick}>
          <Save className="h-3.5 w-3.5" /> {p.save}
        </button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={p.search}
            aria-label={p.searchAria}
            className="field field-sm w-full pl-7"
          />
        </div>

        {/* 10px entre as abas, e não 16: as quatro famílias cabem numa linha. */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1" role="group" aria-label={p.filterAria}>
          {familyFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              className={quietTab(family === item.value)}
              aria-pressed={family === item.value}
              title={item.hint}
              onClick={() => setFamily(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-callout text-muted-foreground px-1">{p.none}</p>
      ) : (
        <div className="space-y-6" role="group" aria-label={p.availableAria}>
          {userPresets.length > 0 && (
            <div>
              {groupHead(p.yours, userPresets.length)}
              <div className={CARD_GRID}>{userPresets.map(preset => renderPreset(preset, true))}</div>
            </div>
          )}
          {builtinByFamily.map(group => (
            <div key={group.family.id}>
              {groupHead(fill(p.readyMade, { family: group.family.label }), group.list.length, group.family.hint)}
              <div className={CARD_GRID}>{group.list.map(preset => renderPreset(preset))}</div>
            </div>
          ))}
        </div>
      )}

      {isModified && activePreset && (
        <button type="button" className="ctl ctl-plain ctl-sm w-full text-muted-foreground" onClick={onRevert}>
          <RotateCcw className="h-3.5 w-3.5" /> {fill(p.revertTo, { name: presetDisplayName(activePreset, t) })}
        </button>
      )}
    </div>
  );
};

export default PresetManager;
