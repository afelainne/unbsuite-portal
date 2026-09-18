import React, { useMemo } from 'react';
import { CopyPlus, RotateCcw } from 'lucide-react';
import type { CaseSettings, FontStyle, UnicaseMode } from '../lib/types';
import { caseSettings, deriveSummary, missingMarks } from '../lib/derive';
import { MARKS_BASIC } from '../lib/charset';
import { Card, Field, Metric, Switch } from './ui';
import { NumberInput } from './Sidebar';

interface CaseCardProps {
  style: FontStyle;
  /** Caracteres da ordem, para avisar dos sinais que faltam desenhar. */
  chars: string[];
  onCases: (patch: Partial<CaseSettings>) => void;
  onCopyMissing: (from: 'upper' | 'lower') => void;
  onRecompose: () => void;
}

const MODES: { value: UnicaseMode; label: string }[] = [
  { value: 'off', label: 'Normal' },
  { value: 'upper', label: 'Unicase: maiúsculas nas minúsculas' },
  { value: 'lower', label: 'Unicase: minúsculas nas maiúsculas' },
];

/**
 * Unicase e acentos do estilo: o que é derivado em vez de desenhado. O que o
 * designer desenhar sempre vence; os derivados aparecem marcados na grade.
 */
export const CaseCard: React.FC<CaseCardProps> = ({ style, chars, onCases, onCopyMissing, onRecompose }) => {
  const cs = caseSettings(style);
  const summary = useMemo(() => deriveSummary(style), [style]);
  const missing = useMemo(() => missingMarks(chars, style.glyphs), [chars, style.glyphs]);

  return (
    <Card label="Caixa e acentos">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4 min-w-0">
          <Field
            label="Caixa"
            hint={cs.unicase === 'off'
              ? 'Maiúsculas e minúsculas independentes.'
              : 'A caixa que faltar recebe o desenho da outra: mesmo contorno, mesmas margens, mesmo kerning. O que você desenhar vence.'}
          >
            <select className="field" value={cs.unicase} onChange={e => onCases({ unicase: e.target.value as UnicaseMode })}>
              {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>
          <div className="flex flex-col gap-1.5 items-start">
            <button type="button" className="ctl ctl-sm ctl-outline" onClick={() => onCopyMissing('upper')}>
              <CopyPlus className="w-3.5 h-3.5" aria-hidden="true" />Copiar maiúsculas → minúsculas faltantes
            </button>
            <button type="button" className="ctl ctl-sm ctl-outline" onClick={() => onCopyMissing('lower')}>
              <CopyPlus className="w-3.5 h-3.5" aria-hidden="true" />Copiar minúsculas → maiúsculas faltantes
            </button>
            <span className="text-[12px] text-muted-foreground">Só preenche o que não foi desenhado.</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <Switch
            checked={cs.compose}
            onChange={compose => onCases({ compose })}
            label="Compor acentos"
            description={`Letra-base + sinal desenhado (${Array.from(MARKS_BASIC).join(' ')}). O acentuado desenhado vence o composto.`}
          />
          <Switch
            checked={cs.composeExtended}
            disabled={!cs.compose}
            onChange={composeExtended => onCases({ composeExtended })}
            label="Incluir Latin Extended-A"
            description="Ă Č Ě Ő Ş Ž e os demais, além dos acentuados do Latin-1. Letras com vírgula embaixo (Ģ, ņ) ficam para desenhar."
          />
          <Field label="Altura do acento sobre maiúsculas" hint="Unidades somadas à folga do sinal sobre as maiúsculas. Negativo deixa o acento mais baixo.">
            <NumberInput label="Altura do acento sobre maiúsculas" value={cs.capAccentOffset} onCommit={v => onCases({ capAccentOffset: v })} />
          </Field>
          <button type="button" className="ctl ctl-sm ctl-outline self-start" disabled={!cs.compose} onClick={onRecompose}>
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />Recompor tudo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Metric size="sm" value={summary.unicase} caption="cópias unicase" />
        <Metric size="sm" value={summary.composite} caption="acentuados compostos" />
      </div>
      {cs.compose && missing.length > 0 && (
        <p className="text-[13px] text-foreground">
          Para compor os acentuados da ordem, desenhe os sinais {missing.join(' ')} (na cartela, com o preset Sinais de acento).
        </p>
      )}
      {summary.notes.map(n => <p key={n} className="text-[13px] text-foreground">{n}</p>)}
    </Card>
  );
};
