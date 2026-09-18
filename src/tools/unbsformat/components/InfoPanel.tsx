import React, { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { GridConfig, GridResult } from '../lib/grid';
import { diagnose, referencePage } from '../lib/grid';
import { figmaText, indesignText } from '../lib/exports';
import { nearestClassicRatio } from '../lib/formats';
import { gerstnerDivisions } from '../lib/methods';
import { fmt, toUnit, Unit, UNIT_DIGITS } from '../lib/units';
import { Metric, Segmented } from './controls';

interface Props {
  config: GridConfig;
  result: GridResult;
  unit: Unit;
  onClose: () => void;
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copiados`);
    return true;
  } catch {
    toast.error('Não foi possível copiar. Selecione o texto e copie à mão.');
    return false;
  }
}

export const InfoPanel: React.FC<Props> = ({ config, result, unit, onClose }) => {
  const d = UNIT_DIGITS[unit];
  const u = (mm: number) => fmt(toUnit(mm, unit), d);
  const diag = useMemo(() => diagnose(config, result), [config, result]);
  const [target, setTarget] = useState<'indesign' | 'figma'>(config.docUnit === 'px' ? 'figma' : 'indesign');
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => (target === 'indesign' ? indesignText(config, result) : figmaText(config, result)), [target, config, result]);
  const ref = referencePage(result);
  const moduleRatio = diag.module ? nearestClassicRatio(diag.module.w, diag.module.h) : null;
  const pageRatio = nearestClassicRatio(config.width, config.height);
  const tbRatio = nearestClassicRatio(diag.textBlock.w, diag.textBlock.h);
  const measureNote = diag.measureVerdict === 'boa' ? 'dentro de 45 a 75' : diag.measureVerdict === 'curta' ? 'curta, abaixo de 45' : 'longa, acima de 75';

  return (
    <div className="flex flex-col gap-5">
      {/* Módulo */}
      <section className="material-card flex flex-col gap-5">
        <h2 className="label">Módulo</h2>
        {diag.module ? (
          <Metric
            size="lg"
            value={<>{u(diag.module.w)}<span className="text-muted-foreground"> × </span>{u(diag.module.h)}</>}
            caption={`${unit}, largura × altura${moduleRatio ? ` · perto de ${moduleRatio.ratio.label}` : ''}`}
          />
        ) : (
          <p className="text-subhead text-muted-foreground">Sem módulo: a mancha não comporta essa grade.</p>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Metric size="sm" value={`${u(diag.columnWidth)} ${unit}`} caption="Coluna" />
          <Metric size="sm" value={`${u(result.rowHeight)} ${unit}`} caption={result.lines ? `Linha, ${result.lines.perRow} linhas de texto` : 'Linha'} />
          <Metric size="sm" value={`${u(result.columnGutter)} ${unit}`} caption="Medianiz horizontal" />
          <Metric size="sm" value={`${u(result.rowGutter)} ${unit}`} caption="Medianiz vertical" />
        </div>
      </section>

      {/* Medida */}
      <section className="material-card flex flex-col gap-4">
        <h2 className="label">Medida</h2>
        <Metric value={Math.round(diag.measure)} caption={`caracteres por linha numa coluna, ${measureNote}`} />
        <p className="text-footnote text-muted-foreground">
          Estimativa com {fmt(toUnit(config.fontSize, config.docUnit === 'px' ? 'px' : 'pt'), 1)} {config.docUnit === 'px' ? 'px' : 'pt'} e meio eme por caractere.
          Na mancha inteira: {Math.round(diag.measureFull)}. Bringhurst recomenda de 45 a 75, com 66 como ideal.
        </p>
      </section>

      {/* Fechamento */}
      <section className="material-card flex flex-col gap-3">
        <div className="card-head">
          <h2 className="label">Linha de base</h2>
          <span className={`chip ${result.closes ? 'chip-accent' : 'chip-outline'}`}>
            {!config.baseline.enabled ? 'Desligada' : result.closes ? 'Fecha' : 'Não fecha'}
          </span>
        </div>
        {config.baseline.enabled && result.lines ? (
          <>
            <p className="text-subhead">
              {result.lines.used} de {result.lines.available} linhas de {fmt(toUnit(config.baseline.leading, config.docUnit === 'px' ? 'px' : 'pt'), 2)} {config.docUnit === 'px' ? 'px' : 'pt'}.
              {result.closes ? ' Campos e medianizes somam exatamente a altura da mancha.' : ` Sobram ${u(result.leftover)} ${unit} no pé.`}
            </p>
            {!result.closes && (
              <button type="button" className="ctl ctl-filled w-full" onClick={onClose}>
                Ajustar margens para fechar a grade
              </button>
            )}
          </>
        ) : (
          <p className="text-footnote text-muted-foreground">Ligue a linha de base para as linhas da grade serem linhas de texto reais.</p>
        )}
        {config.docUnit === 'px' && (
          <p className="text-footnote text-muted-foreground">
            {diag.integerPx ? 'Colunas com largura inteira em px.' : 'Colunas com fração de px.'}
            {!diag.integerPx && (
              <button type="button" className="underline ml-1 text-foreground" onClick={onClose}>Arredondar</button>
            )}
          </p>
        )}
      </section>

      {/* Proporções */}
      <section className="material-card flex flex-col gap-3">
        <h2 className="label">Proporções</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-subhead">
          <dt className="text-muted-foreground">Página</dt>
          <dd className="text-right">{pageRatio ? `${pageRatio.ratio.label} · ${pageRatio.ratio.name.toLowerCase()}` : '—'}</dd>
          <dt className="text-muted-foreground">Mancha</dt>
          <dd className="text-right">{u(diag.textBlock.w)} × {u(diag.textBlock.h)} {unit}</dd>
          <dt className="text-muted-foreground">Proporção da mancha</dt>
          <dd className="text-right">{diag.sameProportion ? 'igual à da página' : tbRatio ? `perto de ${tbRatio.ratio.label}` : '—'}</dd>
          <dt className="text-muted-foreground">Ocupação</dt>
          <dd className="text-right text-value">{fmt(diag.coverage, 1)}% da página</dd>
        </dl>
      </section>

      {config.method === 'gerstner' && ref.textBlock.w > 0 && (
        <section className="material-card flex flex-col gap-3">
          <h2 className="label">58 unidades</h2>
          <p className="text-footnote text-muted-foreground">A mesma mancha, dividida em 1 a 6 colunas. Todas caem sobre as unidades.</p>
          <svg viewBox="0 0 58 44" className="w-full h-auto" role="img" aria-label="Divisões de Gerstner de 1 a 6 colunas">
            {gerstnerDivisions(58).map((g, i) =>
              Array.from({ length: g.columns }, (_, k) => (
                <rect key={`${g.columns}-${k}`} x={k * (g.columnUnits + 2)} y={i * 7.4} width={g.columnUnits} height={5.6} rx={0.6} fill="currentColor" opacity={g.columns === ref.columns.length ? 0.9 : 0.18} />
              )),
            )}
          </svg>
          <p className="text-footnote text-muted-foreground tabular">
            1 unidade = {u(ref.textBlock.w / 58)} {unit}
          </p>
        </section>
      )}

      {result.warnings.length > 0 && (
        <section className="material-card flex flex-col gap-2" aria-live="polite">
          <h2 className="label">Atenção</h2>
          <ul className="flex flex-col gap-1.5 text-subhead">
            {result.warnings.map(w => <li key={w}>{w}</li>)}
          </ul>
        </section>
      )}

      {/* Valores para outros programas */}
      <section className="material-card flex flex-col gap-3">
        <div className="card-head">
          <h2 className="label">Levar para</h2>
          <button
            type="button"
            className="ctl ctl-plain ctl-icon"
            aria-label={`Copiar valores para ${target === 'indesign' ? 'o InDesign' : 'o Figma'}`}
            onClick={async () => {
              if (await copy(text, target === 'indesign' ? 'Valores do InDesign' : 'Valores do Figma')) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            }}
          >
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
        <Segmented
          label="Programa"
          value={target}
          onChange={setTarget}
          options={[{ value: 'indesign', label: 'InDesign' }, { value: 'figma', label: 'Figma' }]}
        />
        <pre className="surface-inset p-3 text-footnote whitespace-pre-wrap break-words tabular leading-relaxed select-all" aria-label="Valores para copiar">{text}</pre>
      </section>
    </div>
  );
};
