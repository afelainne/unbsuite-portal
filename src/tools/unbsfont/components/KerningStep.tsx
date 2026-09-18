import React, { useMemo, useState } from 'react';
import { ArrowDownUp, Eraser, RotateCcw } from 'lucide-react';
import type { FontStyle, KerningSettings, Project } from '../lib/types';
import { buildClasses, classMembers, pairKey, splitKey } from '../lib/kerning';
import { isLower } from '../lib/charset';
import { layoutText } from '../lib/layout';
import { Card, Field, IconButton, Metric, Segmented, Switch } from './ui';
import { TextRender } from './GlyphArt';
import { NumberInput } from './Sidebar';
import { cx } from './cx';

interface KerningStepProps {
  project: Project;
  style: FontStyle;
  onSettings: (s: KerningSettings) => void;
  onGenerate: () => void;
  onClear: () => void;
  onManual: (key: string, value: number | null) => void;
}

type Sort = 'value' | 'pair';

export const KerningStep: React.FC<KerningStepProps> = ({ project, style, onSettings, onGenerate, onClear, onManual }) => {
  const m = project.metrics;
  const settings = style.kerning.settings;
  const [text, setText] = useState('AVATAR Tony HOHO\nTo Ty P. LT "A" r.');
  const [sort, setSort] = useState<Sort>('value');
  const [filter, setFilter] = useState('');
  const [focus, setFocus] = useState<string | null>(null);
  const [kerningOn, setKerningOn] = useState(true);
  const [newPair, setNewPair] = useState('');

  const classes = useMemo(() => buildClasses(style.glyphs, m, settings.useClasses), [style.glyphs, m, settings.useClasses]);
  const membersR = useMemo(() => classMembers(classes.right), [classes]);
  const membersL = useMemo(() => classMembers(classes.left), [classes]);

  const rows = useMemo(() => {
    const keys = new Set([...Object.keys(style.kerning.auto), ...Object.keys(style.kerning.manual)]);
    const list = [...keys].map(key => {
      const [l, r] = splitKey(key);
      const manual = style.kerning.manual[key];
      return { key, l, r, value: manual ?? style.kerning.auto[key] ?? 0, auto: style.kerning.auto[key], manual: manual !== undefined };
    });
    const q = filter.trim();
    const filtered = q
      ? list.filter(p => Array.from(q).every(c => (membersR[p.l] || [p.l]).includes(c) || (membersL[p.r] || [p.r]).includes(c)))
      : list;
    return filtered.sort((a, b) => (sort === 'value' ? a.value - b.value : (a.l + a.r).localeCompare(b.l + b.r)));
  }, [style.kerning, filter, sort, membersR, membersL]);

  const context = (l: string, r: string) => {
    const a = isLower(l) ? 'n' : 'H';
    const b = isLower(r) ? 'n' : 'H';
    const o = (c: string) => (c === 'n' ? 'o' : 'O');
    return `${a}${a}${l}${r}${b}${b} ${o(a)}${l}${r}${o(b)}`;
  };
  const previewText = focus ? `${context(...splitKey(focus))}\n${text}` : text;
  const lines = useMemo(() => layoutText(previewText, style, m, kerningOn ? classes : null), [previewText, style, m, kerningOn, classes]);
  const total = Object.keys({ ...style.kerning.auto, ...style.kerning.manual }).length;
  const manualCount = Object.keys(style.kerning.manual).length;
  const hasGlyphs = Object.values(style.glyphs).some(g => g.outline.length);

  // A classe inteira, líder primeiro ("O C G Q"), quando tem mais de uma letra.
  const members = (leader: string, map: Record<string, string[]>) => [leader, ...(map[leader] || []).filter(c => c !== leader)].join(' ');
  const hasClass = (leader: string, map: Record<string, string[]>) => (map[leader]?.length ?? 1) > 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] items-start">
        <Card label="Kerning automático">
          <p className="text-[14px] text-muted-foreground">
            Mede o branco entre os dois desenhos em cada altura onde ambos têm tinta e acerta o par pelo vão que cada letra forma ao lado do H e do n. Ajustes à mão ficam quando você gera de novo.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Metric value={total} caption={settings.useClasses ? 'pares de classes' : 'pares'} />
            <Metric value={manualCount} caption="ajustados à mão" />
          </div>
          <Field label="Força" value={`${Math.round(settings.strength * 100)}%`}>
            <input
              type="range"
              min={0}
              max={150}
              step={5}
              value={Math.round(settings.strength * 100)}
              onChange={e => onSettings({ ...settings, strength: Number(e.target.value) / 100 })}
              className="tool-slider"
              aria-label="Força do kerning"
            />
          </Field>
          <Segmented<KerningSettings['scope']>
            ariaLabel="Pares"
            value={settings.scope}
            onChange={scope => onSettings({ ...settings, scope })}
            items={[{ value: 'common', label: 'Pares comuns' }, { value: 'all', label: 'Todos os pares' }]}
          />
          <Switch
            checked={settings.useClasses}
            onChange={useClasses => onSettings({ ...settings, useClasses })}
            label="Classes"
            description="Letras com o mesmo lado (O C G Q, n m h, acentuados) dividem o valor."
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ctl ctl-filled ctl-lg" disabled={!hasGlyphs} onClick={onGenerate}>Gerar kerning</button>
            <button type="button" className="ctl ctl-danger ctl-lg" disabled={!total} onClick={onClear}>
              <Eraser className="w-4 h-4" aria-hidden="true" />Limpar kerning
            </button>
          </div>
        </Card>

        <Card label="Prévia" actions={<Switch checked={kerningOn} onChange={setKerningOn} label="Kerning" />}>
          <textarea className="field text-[14px]" rows={2} value={text} onChange={e => setText(e.target.value)} aria-label="Texto da prévia" spellCheck={false} />
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <TextRender lines={lines} m={m} size={56} label="Prévia do kerning" />
          </div>
          {focus && <p className="text-[12px] text-muted-foreground">Primeira linha: o par selecionado entre retas e curvas.</p>}
        </Card>
      </div>

      <Card
        label="Pares"
        actions={
          <IconButton label={sort === 'value' ? 'Ordenar por par' : 'Ordenar por valor'} onClick={() => setSort(s => (s === 'value' ? 'pair' : 'value'))}>
            <ArrowDownUp aria-hidden="true" />
          </IconButton>
        }
      >
        <div className="flex flex-wrap gap-2">
          <input className="field max-w-[200px]" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar por letra" aria-label="Filtrar pares por letra" />
          <form
            className="flex gap-1.5"
            onSubmit={e => {
              e.preventDefault();
              const [a, b] = Array.from(newPair.trim());
              if (!a || !b || !style.glyphs[a] || !style.glyphs[b]) return;
              const key = pairKey(classes.right[a] ?? a, classes.left[b] ?? b);
              if (style.kerning.manual[key] === undefined) onManual(key, style.kerning.auto[key] ?? 0);
              setFocus(key);
              setNewPair('');
            }}
          >
            <input className="field w-24" value={newPair} maxLength={4} onChange={e => setNewPair(e.target.value)} placeholder="Par, ex.: Te" aria-label="Novo par" />
            <button type="submit" className="ctl ctl-outline">Adicionar par</button>
          </form>
        </div>
        {rows.length ? (
          <div className="grid gap-x-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {rows.map(p => (
              <div
                key={p.key}
                className={cx('flex items-center gap-2 min-h-10 hairline-b rounded-xs px-1', focus === p.key && 'bg-fill')}
              >
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left text-[18px] leading-none truncate"
                  aria-label={`Ver o par ${p.l}${p.r}`}
                  onClick={() => setFocus(f => (f === p.key ? null : p.key))}
                >
                  {p.l}{p.r}
                  {(hasClass(p.l, membersR) || hasClass(p.r, membersL)) && (
                    <span className="text-[12px] text-muted-foreground ml-2">
                      {members(p.l, membersR)} · {members(p.r, membersL)}
                    </span>
                  )}
                </button>
                <NumberInput label={`Kerning de ${p.l}${p.r}`} value={p.value} onCommit={v => onManual(pairKey(p.l, p.r), v)} className="field-sm !w-16" />
                {p.manual ? (
                  <IconButton label={`Voltar ${p.l}${p.r} ao automático`} variant="plain" onClick={() => onManual(p.key, null)}>
                    <RotateCcw aria-hidden="true" />
                  </IconButton>
                ) : (
                  <span className="w-8 shrink-0" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-muted-foreground">{total ? 'Nenhum par com essas letras.' : 'Sem kerning ainda. Gere o automático ou adicione um par.'}</p>
        )}
      </Card>
    </div>
  );
};
