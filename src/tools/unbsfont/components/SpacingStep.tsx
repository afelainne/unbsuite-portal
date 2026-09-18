import React, { useMemo, useState } from 'react';
import { Lock, LockOpen, RotateCcw } from 'lucide-react';
import type { FontStyle, Glyph, Project, SpacingSettings } from '../lib/types';
import { spacingReference } from '../lib/spacing';
import { layoutText } from '../lib/layout';
import { advanceOf } from '../lib/outline';
import { Card, Field, IconButton, Metric, Switch } from './ui';
import { TextRender } from './GlyphArt';
import { NumberInput } from './Sidebar';

interface SpacingStepProps {
  project: Project;
  style: FontStyle;
  onSpacing: (s: SpacingSettings) => void;
  onGlyph: (g: Glyph) => void;
  onUnlockAll: () => void;
}

/** Linhas de teste do método de Tracy: retas e curvas em alternância. */
const TRACY = ['HHOHOO HOHOHO', 'nnonoo nonono', 'HAHBHCHDHEHF', 'nanbncndnenf'];

export const SpacingStep: React.FC<SpacingStepProps> = ({ project, style, onSpacing, onGlyph, onUnlockAll }) => {
  const m = project.metrics;
  const [margins, setMargins] = useState(true);
  const [text, setText] = useState(TRACY.join('\n'));
  const ref = useMemo(() => spacingReference(style.glyphs, m, style.spacing), [style.glyphs, m, style.spacing]);
  const lines = useMemo(() => layoutText(text, style, m, null), [text, style, m]);
  // Derivados (unicase, compostos) herdam as margens da origem: não entram na lista.
  const glyphs = Object.values(style.glyphs).filter(g => g.outline.length && !g.derived).sort((a, b) => (a.char.codePointAt(0) || 0) - (b.char.codePointAt(0) || 0));
  const locked = glyphs.filter(g => g.locked).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] items-start">
        <Card label="Espaçamento automático">
          <p className="text-[14px] text-muted-foreground">
            Cada lado recebe a mesma quantidade de branco, medida entre a tinta e a margem (método HT Letterspacer), calibrada pela contraforma do {ref.refUpper ?? 'H'} e do {ref.refLower ?? 'n'}, como no método de Walter Tracy.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Metric value={Math.round(ref.straightUpper)} caption={`margem de reta, ${ref.refUpper ?? 'maiúsculas'}`} />
            <Metric value={Math.round(ref.straightLower)} caption={`margem de reta, ${ref.refLower ?? 'minúsculas'}`} />
          </div>
          <Field label="Espaço" value={`${Math.round(style.spacing.factor * 100)}%`}>
            <input
              type="range"
              min={50}
              max={160}
              step={1}
              value={Math.round(style.spacing.factor * 100)}
              onChange={e => onSpacing({ ...style.spacing, factor: Number(e.target.value) / 100 })}
              className="tool-slider"
              aria-label="Espaço"
            />
          </Field>
          <Field label="Tracking (unidades somadas a cada glifo)">
            <NumberInput label="Tracking" value={style.spacing.tracking} min={-m.unitsPerEm} max={m.unitsPerEm} onCommit={v => onSpacing({ ...style.spacing, tracking: v })} />
          </Field>
          {locked > 0 && (
            <button type="button" className="ctl ctl-outline" onClick={onUnlockAll}>
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Voltar {locked} {locked === 1 ? 'glifo ajustado' : 'glifos ajustados'} ao automático
            </button>
          )}
        </Card>

        <Card label="Teste de ritmo" actions={<Switch checked={margins} onChange={setMargins} label="Margens" />}>
          <textarea className="field text-[14px]" rows={4} value={text} onChange={e => setText(e.target.value)} aria-label="Texto de teste do espaçamento" spellCheck={false} />
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            {glyphs.length ? (
              <TextRender lines={lines} m={m} size={56} showMargins={margins} label="Teste de espaçamento sem kerning" />
            ) : (
              <p className="text-[14px] text-muted-foreground">Crie os glifos na etapa Entrada.</p>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground">Sem kerning, para julgar só as margens.</p>
        </Card>
      </div>

      <Card label="Margens por glifo" actions={<span className="text-[12px] text-muted-foreground">Editar trava o glifo</span>}>
        <div className="grid gap-x-5 gap-y-1 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {glyphs.map(g => (
            <div key={g.char} className="flex items-center gap-2 min-h-10 hairline-b">
              <span className="w-8 text-[20px] leading-none text-center shrink-0">{g.char}</span>
              <NumberInput label={`Margem esquerda de ${g.char}`} value={g.lsb} onCommit={v => onGlyph({ ...g, lsb: v, locked: true })} className="field-sm !w-16" />
              <NumberInput label={`Margem direita de ${g.char}`} value={g.rsb} onCommit={v => onGlyph({ ...g, rsb: v, locked: true })} className="field-sm !w-16" />
              <span className="text-[12px] text-muted-foreground tabular flex-1 text-right">{advanceOf(g, m)}</span>
              <IconButton label={g.locked ? `Devolver ${g.char} ao automático` : `Travar margens de ${g.char}`} variant="plain" active={g.locked} onClick={() => onGlyph({ ...g, locked: !g.locked })}>
                {g.locked ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
              </IconButton>
            </div>
          ))}
        </div>
        {!glyphs.length && <p className="text-[14px] text-muted-foreground">Nenhum glifo ainda.</p>}
      </Card>
    </div>
  );
};
