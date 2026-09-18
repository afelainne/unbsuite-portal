import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { FontStyle, Glyph, Metrics, Project } from '../lib/types';
import { PRESETS, sequenceChars } from '../lib/charset';
import { PAPERS, cartelaSvg, cells, makeSpec, pageCount, type CartelaResult, type Paper } from '../lib/cartela';
import { cartelaPdf } from '../lib/cartelaPdf';
import { downloadBlob } from '../lib/project';
import { Field, Metric, Segmented, Sheet as Dialog } from './ui';
import { GlyphThumb } from './GlyphArt';
import { cx } from './cx';

type Notify = (message: string, tone?: 'ok' | 'error' | 'info') => void;

const fileBase = (project: Project, style: FontStyle) =>
  `${project.family.trim() || 'fonte'}-${style.name.trim() || 'Regular'}`.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '-');

/* ---------------------------------------------------------- baixar */

interface DownloadProps {
  open: boolean;
  onClose: () => void;
  project: Project;
  style: FontStyle;
  sequence: string;
  onSequence: (s: string) => void;
  notify: Notify;
}

/** Folha para baixar a cartela: a ordem de caracteres, o formato e o papel. */
export const CartelaDownload: React.FC<DownloadProps> = ({ open, onClose, project, style, sequence, onSequence, notify }) => {
  const [format, setFormat] = useState<'svg' | 'pdf'>('pdf');
  const [paper, setPaper] = useState<Paper>('a4');
  const spec = useMemo(
    () => makeSpec({ chars: sequenceChars(sequence), metrics: project.metrics, paper, family: project.family.trim() || undefined, style: style.name }),
    [sequence, project.metrics, project.family, style.name, paper],
  );
  const pages = pageCount(spec);

  const download = () => {
    if (!spec.chars.length) { notify('Escreva a ordem dos caracteres para montar a cartela.', 'error'); return; }
    const name = `${fileBase(project, style)}-cartela.${format}`;
    const blob = format === 'svg' ? new Blob([cartelaSvg(spec)], { type: 'image/svg+xml;charset=utf-8' }) : cartelaPdf(spec);
    downloadBlob(blob, name);
    notify(`${name}: ${spec.chars.length} células em ${pages} ${pages === 1 ? 'página' : 'páginas'}.`, 'ok');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Baixar cartela"
      description="Uma célula por caractere, com as guias das métricas atuais. Desenhe por cima, exporte e suba de volta: cada forma vai para o caractere da sua célula."
      size="max-w-lg"
      footer={
        <>
          <button type="button" className="ctl ctl-plain ctl-lg" onClick={onClose}>Cancelar</button>
          <button type="button" className="ctl ctl-filled ctl-lg" disabled={!spec.chars.length} onClick={download}>Baixar {format.toUpperCase()}</button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Ordem dos caracteres" hint="Espaços e quebras de linha não contam; repetidos entram uma vez só.">
          <textarea className="field text-[16px] tracking-normal" rows={4} value={sequence} onChange={e => onSequence(e.target.value)} spellCheck={false} />
        </Field>
        <span className="flex flex-wrap gap-1.5 -mt-3">
          {PRESETS.map(p => (
            <button key={p.id} type="button" className="ctl ctl-sm ctl-gray" onClick={() => onSequence(sequence.trim() ? `${sequence.trimEnd()}\n${p.chars}` : p.chars)}>
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />{p.label}
            </button>
          ))}
        </span>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-[12px] text-muted-foreground">Formato</span>
            <Segmented<'svg' | 'pdf'> ariaLabel="Formato da cartela" value={format} onChange={setFormat} items={[{ value: 'pdf', label: 'PDF' }, { value: 'svg', label: 'SVG' }]} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[12px] text-muted-foreground">Papel</span>
            <Segmented<Paper> ariaLabel="Papel" value={paper} onChange={setPaper} items={(Object.keys(PAPERS) as Paper[]).map(p => ({ value: p, label: PAPERS[p].label }))} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Metric size="sm" value={spec.chars.length} caption="células" />
          <Metric size="sm" value={spec.cols} caption="colunas" />
          <Metric size="sm" value={pages} caption={pages === 1 ? 'página' : 'páginas'} />
        </div>
        <p className="text-[13px] text-muted-foreground">
          Não mova nem apague as marcas de registro dos cantos: elas dizem onde está cada célula, mesmo que o arquivo seja redimensionado. Converta traços e textos em contornos antes de exportar.
        </p>
      </div>
    </Dialog>
  );
};

/* ---------------------------------------------------------- revisar */

interface ReviewProps {
  upload: { result: CartelaResult; format: 'svg' | 'pdf'; strokeOnly: number } | null;
  onClose: () => void;
  style: FontStyle;
  m: Metrics;
  onApply: (glyphs: Glyph[], srcCap: number) => void;
}

/** Resumo do que foi reconhecido, antes de aplicar. */
export const CartelaReview: React.FC<ReviewProps> = ({ upload, onClose, style, m, onApply }) => {
  const r = upload?.result;
  const grid = useMemo(() => (r ? cells(r.spec) : []), [r]);
  const byChar = useMemo(() => new Map((r?.glyphs ?? []).map(g => [g.char, g])), [r]);
  if (!upload || !r) return null;

  const existing = r.recognized.filter(c => style.glyphs[c]?.outline.length);
  const fresh = r.glyphs.filter(g => !existing.includes(g.char));
  const how = r.source === 'descritor'
    ? 'Cartela reconhecida pelo descritor do arquivo.'
    : 'Sem descritor no arquivo: a grade foi refeita pelas marcas de registro e pela ordem de caracteres atual.';
  const scaleNote = !r.noMarks && Math.abs(r.scale - 1) > 0.005 ? ` O arquivo estava em ${Math.round(r.scale * 100)}% do tamanho original.` : '';
  const apply = (glyphs: Glyph[]) => { onApply(glyphs, r.srcCap); onClose(); };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Cartela reconhecida"
      description={`${upload.format.toUpperCase()}. ${how}${scaleNote}`}
      size="max-w-3xl"
      footer={
        <>
          <button type="button" className="ctl ctl-plain ctl-lg" onClick={onClose}>Cancelar</button>
          {existing.length > 0 && (
            <button type="button" className="ctl ctl-outline ctl-lg" disabled={!fresh.length} onClick={() => apply(fresh)}>Só as novas ({fresh.length})</button>
          )}
          <button type="button" className="ctl ctl-filled ctl-lg" disabled={!r.glyphs.length} onClick={() => apply(r.glyphs)}>
            {existing.length ? 'Substituir e aplicar' : `Aplicar ${r.glyphs.length} glifos`}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-[15px] text-foreground" role="status">
          {r.recognized.length} {r.recognized.length === 1 ? 'glifo reconhecido' : 'glifos reconhecidos'}, {r.empty.length} {r.empty.length === 1 ? 'célula vazia' : 'células vazias'}, {r.outside} {r.outside === 1 ? 'forma fora de célula (ignorada)' : 'formas fora de célula (ignoradas)'}.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <Metric value={r.recognized.length} caption="reconhecidos" />
          <Metric value={r.empty.length} caption="células vazias" />
          <Metric value={r.outside} caption="fora de célula" />
        </div>
        {r.noMarks && <p className="text-[13px] text-foreground">As marcas de registro não foram encontradas: a grade ficou na posição em que foi gerada. Se o arquivo foi movido ou redimensionado, os glifos podem cair na célula errada.</p>}
        {upload.strokeOnly > 0 && <p className="text-[13px] text-foreground">{upload.strokeOnly} formas só com traço foram ignoradas: converta traços em contornos.</p>}
        {existing.length > 0 && (
          <p className="text-[13px] text-foreground">
            Substituir glifos existentes? {existing.length} {existing.length === 1 ? 'caractere já tem' : 'caracteres já têm'} desenho neste estilo: {existing.slice(0, 24).join(' ')}{existing.length > 24 ? ' …' : ''}
          </p>
        )}
        <div
          className="surface-inset p-2 grid gap-1 grid-cols-[repeat(auto-fill,minmax(44px,1fr))]"
          role="list"
          aria-label="Células da cartela"
        >
          {grid.map(cell => {
            const g = byChar.get(cell.char);
            return (
              <div
                key={cell.index}
                role="listitem"
                aria-label={`${cell.char}: ${g ? 'reconhecido' : 'vazio'}`}
                className={cx(
                  'relative aspect-square rounded-sm flex items-center justify-center p-1.5',
                  g ? 'bg-card ring-1 ring-foreground/60 text-foreground' : 'bg-fill text-muted-foreground/60',
                )}
              >
                {g ? <GlyphThumb glyph={g} m={m} className="w-full h-full" /> : <span className="text-[15px]">{cell.char}</span>}
                {g && <span className="absolute top-0.5 left-1 text-[9px] leading-none text-muted-foreground">{cell.char}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
};
