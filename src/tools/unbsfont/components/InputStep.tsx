import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, Combine, CopyPlus, FileDown, Lock, LockOpen, Plus, Split, Trash2, Unlink, Upload, X } from 'lucide-react';
import type { FontStyle, Glyph, Metrics, Project } from '../lib/types';
import {
  detectBaselines, measureGuides, mergeWithNext, pastedGlyph, setRowBaseline, sheetGroups, sheetToGlyphs,
  sourceCapHeight, splitGroup, type Sheet, type SheetGuides,
} from '../lib/sheet';
import { BASIC_PRESETS, DEFAULT_SEQUENCE, PRESETS, sequenceChars } from '../lib/charset';
import { caseSettings, copyMissing, copyToOtherCase, detachGlyph, nudgeAccent, otherCase, recomposeAll, setCaseSettings } from '../lib/derive';
import { CaseCard } from './CaseCard';
import { toPathData } from '../lib/geometry';
import { advanceOf } from '../lib/outline';
import { makeSpec, type Paper } from '../lib/cartela';
import { isPdfFile, readPdfUpload, readSvgUpload, type Upload as UploadResult, type UploadContext } from '../lib/upload';
import { Card, Field, IconButton, Metric, Sheet as Dialog, Spinner, Switch } from './ui';
import { CartelaDownload, CartelaReview } from './Cartela';
import { GlyphStage, GlyphThumb } from './GlyphArt';
import { NumberInput } from './Sidebar';
import { cx } from './cx';

type Notify = (message: string, tone?: 'ok' | 'error' | 'info') => void;

interface InputStepProps {
  project: Project;
  style: FontStyle;
  onAddGlyphs: (glyphs: Glyph[], srcCap: number, guides?: SheetGuides) => void;
  onGlyph: (glyph: Glyph) => void;
  onRemoveGlyph: (char: string) => void;
  /** Muda o estilo inteiro (unicase, acentos): a função recebe o estilo e as métricas atuais. */
  onUpdateStyle: (fn: (s: FontStyle, m: Metrics) => FontStyle) => void;
  notify: Notify;
}

const SEQUENCE_KEY = 'unbsfont:sequence';
const readSequence = () => {
  try { return localStorage.getItem(SEQUENCE_KEY) || DEFAULT_SEQUENCE; } catch { return DEFAULT_SEQUENCE; }
};

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

export const InputStep: React.FC<InputStepProps> = ({ project, style, onAddGlyphs, onGlyph, onRemoveGlyph, onUpdateStyle, notify }) => {
  const m = project.metrics;
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [sequence, setSequence] = useState(readSequence);
  const [baselineEdits, setBaselineEdits] = useState<Record<number, number>>({});
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [extraChars, setExtraChars] = useState<string[]>([]);
  const [newChar, setNewChar] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [cartela, setCartela] = useState<Extract<UploadResult, { kind: 'cartela' }> | null>(null);
  const [reading, setReading] = useState(false);
  const sheetFile = useRef<HTMLInputElement>(null);
  const glyphFile = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { localStorage.setItem(SEQUENCE_KEY, sequence); } catch { /* sem armazenamento: segue só na memória */ }
  }, [sequence]);

  const chars = useMemo(() => sequenceChars(sequence), [sequence]);
  const detected = useMemo(() => {
    if (!sheet) return null;
    let s = detectBaselines(sheet, chars);
    for (const [row, y] of Object.entries(baselineEdits)) s = setRowBaseline(s, Number(row), y);
    return s;
  }, [sheet, chars, baselineEdits]);
  const groups = useMemo(() => (detected ? sheetGroups(detected) : []), [detected]);
  const guides = useMemo(() => (detected ? measureGuides(detected, chars) : null), [detected, chars]);

  /* ------------------------------------------------ entrada de SVG */

  // A cartela sem descritor é refeita com a ordem de caracteres e as métricas de agora.
  const uploadContext = useCallback((): UploadContext => ({
    fallback: (paper: Paper) => makeSpec({ chars, metrics: m, paper }),
    keep: style.glyphs,
  }), [chars, m, style.glyphs]);

  /** Decide o caminho: cartela (vai para a revisão) ou folha livre (ordem de leitura). */
  const takeUpload = useCallback((u: UploadResult) => {
    if (u.kind === 'cartela') {
      setCartela(u);
      setSelectedChar(null);
      return;
    }
    const s = u.sheet;
    const count = sheetGroups(s).length;
    if (!count) { notify(`Nenhuma forma preenchida no ${u.format.toUpperCase()}.`, 'error'); return; }
    setSheet(s);
    setBaselineEdits({});
    setSelectedGroup(null);
    setSelectedChar(null);
    const warn = s.strokeOnly ? ` ${s.strokeOnly} formas só com traço foram ignoradas: converta traços em contornos.` : '';
    notify(`Folha livre: ${count} glifos encontrados, lidos em ordem de leitura.${warn}`, s.strokeOnly ? 'info' : 'ok');
  }, [notify]);

  const loadSheet = useCallback((text: string) => {
    try {
      takeUpload(readSvgUpload(text, uploadContext()));
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Não foi possível ler o SVG.', 'error');
    }
  }, [notify, takeUpload, uploadContext]);

  const loadPdf = useCallback(async (file: File) => {
    setReading(true);
    try {
      takeUpload(await readPdfUpload(await file.arrayBuffer(), uploadContext()));
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      notify(/vetorial|forma|grande/.test(msg) ? msg : 'Não foi possível ler o PDF. Ele pode estar protegido ou corrompido.', 'error');
    } finally {
      setReading(false);
    }
  }, [notify, takeUpload, uploadContext]);

  const pasteIntoGlyph = useCallback((char: string, text: string) => {
    try {
      const { glyph, srcCap } = pastedGlyph(text, char, m, style.srcCap);
      const old = style.glyphs[char];
      onAddGlyphs([old ? { ...glyph, lsb: old.lsb, rsb: old.rsb, locked: old.locked } : glyph], srcCap);
      notify(`Desenho de ${char} colado.`, 'ok');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Não foi possível ler o SVG.', 'error');
    }
  }, [m, style.srcCap, style.glyphs, onAddGlyphs, notify]);

  const route = useCallback((text: string) => {
    if (selectedChar) pasteIntoGlyph(selectedChar, text);
    else loadSheet(text);
  }, [selectedChar, pasteIntoGlyph, loadSheet]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isEditable(e.target)) return;
      const text = e.clipboardData?.getData('image/svg+xml') || e.clipboardData?.getData('text/plain') || '';
      if (!/<svg|<path|^\s*[Mm][\s\d.,-]/.test(text)) return;
      e.preventDefault();
      route(text);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [route]);

  const readClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) { route(text); return; }
    } catch { /* sem permissão: abre o campo para colar */ }
    setPasteText('');
    setPasteOpen(true);
  };

  const readFile = (file: File | undefined, into: 'sheet' | 'glyph') => {
    if (!file) return;
    if (into === 'sheet' && isPdfFile(file)) { void loadPdf(file); return; }
    file.text().then(text => {
      if (into === 'sheet') loadSheet(text);
      else if (selectedChar) pasteIntoGlyph(selectedChar, text);
    }).catch(() => notify('Não foi possível abrir o arquivo.', 'error'));
  };

  /* ------------------------------------------------ criar glifos */

  const createGlyphs = () => {
    if (!detected || !guides) return;
    const srcCap = sourceCapHeight(guides, detected);
    const made = sheetToGlyphs(detected, chars, srcCap);
    if (!made.length) { notify('Escreva a ordem dos caracteres para criar os glifos.', 'error'); return; }
    onAddGlyphs(made, srcCap, guides);
    notify(`${made.length} glifos criados em ${style.name}, com espaço e kerning automáticos.`, 'ok');
    setSheet(null);
    setSelectedGroup(null);
  };

  const mismatch = groups.length - chars.length;
  const selected = groups.findIndex(g => g.id === selectedGroup);
  const selectedRow = selected >= 0 ? groups[selected].row : null;
  const duplicates = useMemo(() => chars.filter((c, i) => chars.indexOf(c) !== i), [chars]);

  /* ------------------------------------------------ slots */

  // Grade: o básico (A–Z, a–z, 0–9, pontuação), o que estiver na ordem, o que já existe e o que foi acrescentado.
  const slots = useMemo(() => {
    const base = Array.from(new Set([...BASIC_PRESETS.flatMap(p => Array.from(p.chars)), ...chars]));
    const set = new Set(base);
    const extra = [...Object.keys(style.glyphs), ...extraChars]
      .filter(c => !set.has(c) && c !== ' ')
      .sort((a, b) => (a.codePointAt(0) || 0) - (b.codePointAt(0) || 0));
    return [...base, ...Array.from(new Set(extra))];
  }, [style.glyphs, extraChars, chars]);
  const drawn = Object.values(style.glyphs).filter(g => g.outline.length && !g.derived).length;
  const derivedCount = Object.values(style.glyphs).filter(g => g.derived).length;
  const glyph = selectedChar ? style.glyphs[selectedChar] : undefined;
  const cs = caseSettings(style);
  const nudge = selectedChar ? cs.nudges[selectedChar] ?? { dx: 0, dy: 0 } : { dx: 0, dy: 0 };
  const other = selectedChar ? otherCase(selectedChar) : null;

  /* ------------------------------------------------ unicase e acentos */

  const copyOther = () => {
    if (!selectedChar || !other) return;
    const target = style.glyphs[other];
    if (target && !target.derived && !window.confirm(`${other} já tem desenho. Trocar pelo desenho de ${selectedChar}?`)) return;
    onUpdateStyle((s, mm) => copyToOtherCase(s, selectedChar, mm, true));
    notify(`${other} agora usa o desenho de ${selectedChar}.`, 'ok');
  };
  const fillMissing = (from: 'upper' | 'lower') => {
    const { count } = copyMissing(style, from, m);
    if (!count) { notify(from === 'upper' ? 'Nenhuma minúscula faltando com maiúscula correspondente.' : 'Nenhuma maiúscula faltando com minúscula correspondente.', 'info'); return; }
    onUpdateStyle((s, mm) => copyMissing(s, from, mm).style);
    notify(`${count} ${from === 'upper' ? 'minúsculas' : 'maiúsculas'} preenchidas com a outra caixa.`, 'ok');
  };
  const detach = () => {
    if (!selectedChar) return;
    onUpdateStyle((s, mm) => detachGlyph(s, selectedChar, mm));
    notify(`${selectedChar} deixou de ser derivado. Desenhe ou copie para preencher.`, 'info');
  };

  const addChar = () => {
    const c = Array.from(newChar.trim())[0];
    if (!c) return;
    setExtraChars(prev => (prev.includes(c) ? prev : [...prev, c]));
    setSelectedChar(c);
    setNewChar('');
  };

  const setMargins = (lsb: number, rsb: number) => glyph && onGlyph({ ...glyph, lsb, rsb, locked: true });

  return (
    <div className="flex flex-col gap-5">
      <input ref={sheetFile} type="file" accept=".svg,image/svg+xml,.pdf,application/pdf" className="hidden" onChange={e => { readFile(e.target.files?.[0], 'sheet'); e.target.value = ''; }} />
      <input ref={glyphFile} type="file" accept=".svg,image/svg+xml" className="hidden" onChange={e => { readFile(e.target.files?.[0], 'glyph'); e.target.value = ''; }} />

      <Card
        label="Folha ou cartela"
        actions={
          <>
            <IconButton label="Baixar cartela" onClick={() => setDownloadOpen(true)}><FileDown aria-hidden="true" /></IconButton>
            <IconButton label="Enviar folha ou cartela (SVG ou PDF)" disabled={reading} aria-busy={reading} onClick={() => sheetFile.current?.click()}>
              {reading ? <Spinner /> : <Upload aria-hidden="true" />}
            </IconButton>
            <IconButton label="Colar folha SVG" onClick={() => { setSelectedChar(null); readClipboard(); }}><ClipboardPaste aria-hidden="true" /></IconButton>
            {sheet && <IconButton label="Descartar folha" onClick={() => setSheet(null)}><X aria-hidden="true" /></IconButton>}
          </>
        }
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); readFile(e.dataTransfer.files?.[0], 'sheet'); }}
      >
        {!detected ? (
          <>
            <button
              type="button"
              onClick={() => sheetFile.current?.click()}
              disabled={reading}
              aria-busy={reading}
              className="surface-inset flex flex-col items-center justify-center gap-2 text-center px-6 py-10 hover:bg-fill-2 transition-colors duration-fast ease-out"
            >
              <span className="text-[16px] text-foreground">{reading ? 'Lendo o PDF…' : 'A cartela preenchida ou uma folha com os caracteres'}</span>
              <span className="text-[14px] text-muted-foreground max-w-[50ch]">
                SVG ou PDF vetorial. Solte o arquivo aqui, clique para escolher ou cole um SVG com Ctrl+V. Na cartela, cada forma vai para o caractere da sua célula; numa folha livre, os glifos são lidos em ordem de leitura. O desenho entra na fonte sem nenhuma alteração.
              </span>
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <p className="text-[14px] text-muted-foreground max-w-[56ch]">
                Sem folha pronta? Baixe a cartela com os {new Set(chars).size} caracteres da ordem, desenhe cada glifo na sua célula e suba de volta.
              </p>
              <button type="button" className="ctl ctl-outline shrink-0 self-start sm:self-auto" onClick={() => setDownloadOpen(true)}>
                <FileDown className="w-4 h-4" aria-hidden="true" />
                Baixar cartela
              </button>
            </div>
          </>
        ) : (
          <>
            <SheetView sheet={detected} chars={chars} selected={selectedGroup} onSelect={id => setSelectedGroup(id === selectedGroup ? null : id)} />
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
              <Field
                label="Ordem dos caracteres"
                hint="Na mesma ordem da folha, linha por linha. Espaços e quebras de linha não contam."
              >
                <textarea className="field text-[16px] tracking-normal" rows={4} value={sequence} onChange={e => setSequence(e.target.value)} spellCheck={false} />
                <span className="flex flex-wrap gap-1.5 pt-1">
                  {PRESETS.map(p => (
                    <button key={p.id} type="button" className="ctl ctl-sm ctl-gray" onClick={() => setSequence(s => (s.trim() ? `${s.trimEnd()}\n${p.chars}` : p.chars))}>
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />{p.label}
                    </button>
                  ))}
                  <button type="button" className="ctl ctl-sm ctl-plain" onClick={() => setSequence('')}>Limpar</button>
                </span>
              </Field>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Metric value={groups.length} caption="glifos na folha" />
                  <Metric value={chars.length} caption="caracteres na ordem" />
                </div>
                {mismatch !== 0 && (
                  <p className="text-[13px] text-foreground">
                    {mismatch > 0 ? `Faltam ${mismatch} caracteres na ordem: os últimos glifos ficam de fora.` : `Sobram ${-mismatch} caracteres na ordem.`}
                    {' '}Se uma letra saiu em duas partes, selecione e junte.
                  </p>
                )}
                {duplicates.length > 0 && <p className="text-[13px] text-foreground">Repetidos na ordem: {Array.from(new Set(duplicates)).join(' ')}. Vale o último.</p>}
                {selected >= 0 && selectedRow !== null && (
                  <div className="card-quiet !p-4 flex flex-col gap-3">
                    <span className="text-[14px]">Glifo {selected + 1}{chars[selected] ? ` · ${chars[selected]}` : ''}</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" className="ctl ctl-sm ctl-outline" onClick={() => setSheet(s => (s ? mergeWithNext(s, selectedGroup!) : s))}>
                        <Combine className="w-3.5 h-3.5" aria-hidden="true" />Juntar com o próximo
                      </button>
                      <button type="button" className="ctl ctl-sm ctl-outline" disabled={groups[selected].components.length < 2} onClick={() => setSheet(s => (s ? splitGroup(s, selectedGroup!) : s))}>
                        <Split className="w-3.5 h-3.5" aria-hidden="true" />Separar
                      </button>
                    </div>
                    <Field label={`Linha de base da linha ${selectedRow + 1} (unidades do SVG)`}>
                      <NumberInput
                        label="Linha de base"
                        value={Math.round(detected.rows[selectedRow].baseline)}
                        onCommit={v => setBaselineEdits(prev => ({ ...prev, [selectedRow]: v }))}
                      />
                    </Field>
                  </div>
                )}
                <button type="button" className="ctl ctl-filled ctl-lg" disabled={!chars.length} onClick={createGlyphs}>
                  Criar {Math.min(groups.length, chars.length)} glifos
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      <CaseCard
        style={style}
        chars={chars}
        onCases={patch => onUpdateStyle((s, mm) => setCaseSettings(s, patch, mm))}
        onCopyMissing={fillMissing}
        onRecompose={() => { onUpdateStyle((s, mm) => recomposeAll(s, mm)); notify('Acentos recompostos, sem os ajustes finos.', 'ok'); }}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] items-start">
        <Card
          label={`Glifos · ${style.name}`}
          actions={<span className="text-[12px] text-muted-foreground tabular">{drawn} desenhados{derivedCount ? ` · ${derivedCount} derivados` : ''}</span>}
        >
          <div className="grid gap-1.5 grid-cols-[repeat(auto-fill,minmax(52px,1fr))]" role="listbox" aria-label="Caracteres">
            {slots.map(c => {
              const g = style.glyphs[c];
              const on = c === selectedChar;
              const d = g?.derived;
              const tag = d ? (d.kind === 'unicase' ? `de ${d.from}` : 'comp.') : null;
              const about = d ? (d.kind === 'unicase' ? `derivado de ${d.from}` : `composto de ${d.from} e ${d.mark}`) : '';
              return (
                <button
                  key={c}
                  type="button"
                  role="option"
                  aria-selected={on}
                  aria-label={`${c}${!g ? ', sem desenho' : about ? `, ${about}` : ''}`}
                  title={about ? `${c}: ${about}` : undefined}
                  onClick={() => setSelectedChar(on ? null : c)}
                  className={cx(
                    'relative aspect-square rounded-sm flex items-center justify-center p-1.5 transition-colors duration-fast ease-out',
                    on ? 'bg-primary text-primary-foreground' : d ? 'bg-fill hover:bg-fill-2 text-muted-foreground' : 'bg-fill hover:bg-fill-2 text-foreground',
                  )}
                >
                  {g ? <GlyphThumb glyph={g} m={m} className={cx('w-full h-full', tag && 'pb-2')} /> : <span className={cx('text-[18px]', on ? 'opacity-70' : 'text-muted-foreground/60')}>{c}</span>}
                  {tag && <span aria-hidden="true" className={cx('absolute bottom-0.5 inset-x-0 text-center text-[9px] leading-none', on ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{tag}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5 max-w-[240px]">
            <input className="field" value={newChar} maxLength={2} placeholder="Outro caractere" aria-label="Adicionar caractere" onChange={e => setNewChar(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addChar(); }} />
            <IconButton label="Adicionar caractere" onClick={addChar}><Plus aria-hidden="true" /></IconButton>
          </div>
        </Card>

        {selectedChar && (
          <Card
            label={`Glifo ${selectedChar}`}
            actions={
              <>
                <IconButton label="Colar SVG neste glifo" onClick={readClipboard}><ClipboardPaste aria-hidden="true" /></IconButton>
                <IconButton label="Enviar SVG para este glifo" onClick={() => glyphFile.current?.click()}><Upload aria-hidden="true" /></IconButton>
                {glyph && !glyph.derived && (
                  <IconButton label="Apagar o desenho" variant="danger" onClick={() => onRemoveGlyph(selectedChar)}><Trash2 aria-hidden="true" /></IconButton>
                )}
                {glyph?.derived && (
                  <IconButton label="Desfazer derivação" onClick={detach}><Unlink aria-hidden="true" /></IconButton>
                )}
              </>
            }
            className="xl:sticky xl:top-0"
          >
            {glyph?.derived ? (
              <>
                <div className="surface-inset h-[300px] md:h-[360px] w-full p-2"><GlyphStage glyph={glyph} m={m} /></div>
                <div className="flex flex-col gap-1">
                  <span className="text-[14px] text-foreground">
                    {glyph.derived.kind === 'unicase' ? `Derivado de ${glyph.derived.from} (unicase)` : `Composto: ${glyph.derived.from} + ${glyph.derived.mark}`}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    Margens e kerning seguem {glyph.derived.from}. Um desenho colado ou enviado para {selectedChar} substitui o derivado.
                  </span>
                  {glyph.derived.note && <span className="text-[12px] text-foreground">{glyph.derived.note}</span>}
                </div>
                {glyph.derived.kind === 'composite' && (
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Acento, horizontal">
                      <NumberInput label="Ajuste horizontal do acento" value={nudge.dx} onCommit={v => onUpdateStyle((s, mm) => nudgeAccent(s, selectedChar, v, nudge.dy, mm))} />
                    </Field>
                    <Field label="Acento, vertical">
                      <NumberInput label="Ajuste vertical do acento" value={nudge.dy} onCommit={v => onUpdateStyle((s, mm) => nudgeAccent(s, selectedChar, nudge.dx, v, mm))} />
                    </Field>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-4 justify-between">
                  <Metric size="sm" value={advanceOf(glyph, m)} caption="avanço" />
                  <button type="button" className="ctl ctl-sm ctl-outline" onClick={detach}>
                    <Unlink className="w-3.5 h-3.5" aria-hidden="true" />Desfazer derivação
                  </button>
                </div>
              </>
            ) : glyph ? (
              <>
                <div className="surface-inset h-[300px] md:h-[360px] w-full p-2"><GlyphStage glyph={glyph} m={m} onMargins={setMargins} /></div>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Margem esq."><NumberInput label="Margem esquerda" value={glyph.lsb} onCommit={v => setMargins(v, glyph.rsb)} /></Field>
                  <Field label="Margem dir."><NumberInput label="Margem direita" value={glyph.rsb} onCommit={v => setMargins(glyph.lsb, v)} /></Field>
                  <Metric size="sm" value={advanceOf(glyph, m)} caption="avanço" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Deslocamento vertical">
                    <NumberInput label="Deslocamento vertical" value={glyph.yOffset} onCommit={v => onGlyph({ ...glyph, yOffset: v })} />
                  </Field>
                  <Field label="Escala do glifo (%)">
                    <NumberInput label="Escala do glifo" min={10} max={1000} value={Math.round(glyph.scale * 100)} onCommit={v => onGlyph({ ...glyph, scale: v / 100 })} />
                  </Field>
                </div>
                <Switch
                  checked={glyph.locked}
                  onChange={locked => onGlyph({ ...glyph, locked })}
                  label={<span className="inline-flex items-center gap-1.5">{glyph.locked ? <Lock className="w-3.5 h-3.5" aria-hidden="true" /> : <LockOpen className="w-3.5 h-3.5" aria-hidden="true" />}Margens à mão</span>}
                  description="Ligado, o espaçamento automático não mexe neste glifo."
                />
                {other && (
                  <button type="button" className="ctl ctl-sm ctl-outline self-start" onClick={copyOther}>
                    <CopyPlus className="w-3.5 h-3.5" aria-hidden="true" />Copiar para a outra caixa ({other})
                  </button>
                )}
              </>
            ) : (
              <p className="text-[14px] text-muted-foreground">
                Sem desenho. Com o glifo selecionado, cole um SVG (Ctrl+V) ou envie um arquivo: ele entra na linha de base, na escala da folha.
              </p>
            )}
          </Card>
        )}
      </div>

      <Dialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        title="Colar SVG"
        description={selectedChar ? `O desenho vai para o glifo ${selectedChar}.` : 'O SVG vira a folha de caracteres.'}
        footer={
          <>
            <button type="button" className="ctl ctl-plain ctl-lg" onClick={() => setPasteOpen(false)}>Cancelar</button>
            <button type="button" className="ctl ctl-filled ctl-lg" disabled={!pasteText.trim()} onClick={() => { setPasteOpen(false); route(pasteText); }}>Usar este SVG</button>
          </>
        }
      >
        <textarea className="field field-mono text-[12px] w-full" rows={10} value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="<svg …>…</svg>" aria-label="SVG" />
      </Dialog>

      <CartelaDownload
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        project={project}
        style={style}
        sequence={sequence}
        onSequence={setSequence}
        notify={notify}
      />
      <CartelaReview
        upload={cartela}
        onClose={() => setCartela(null)}
        style={style}
        m={m}
        onApply={(glyphs, srcCap) => {
          onAddGlyphs(glyphs, srcCap);
          notify(`${glyphs.length} glifos da cartela em ${style.name}, com espaço e kerning automáticos.`, 'ok');
        }}
      />
    </div>
  );
};

/* ---------------------------------------------------------- folha */

const SheetView: React.FC<{ sheet: Sheet; chars: string[]; selected: number | null; onSelect: (id: number) => void }> = ({ sheet, chars, selected, onSelect }) => {
  const groups = useMemo(() => sheetGroups(sheet), [sheet]);
  const paths = useMemo(() => groups.map(g => toPathData(g.components.flatMap(c => c.contours.flat()))), [groups]);
  const b = sheet.box;
  const pad = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.03;
  const w = b.x1 - b.x0 + pad * 2;
  const h = b.y1 - b.y0 + pad * 2;
  const font = Math.max(w, h) * 0.018;
  return (
    <div className="surface-inset p-3 overflow-auto max-h-[60vh]">
      <svg viewBox={`${b.x0 - pad} ${b.y0 - pad} ${w} ${h}`} className="w-full h-auto min-w-[480px]" role="group" aria-label="Glifos detectados na folha">
        {sheet.rows.map((r, i) => (
          <line key={i} x1={b.x0 - pad} x2={b.x1 + pad} y1={r.baseline} y2={r.baseline} className="stroke-muted-foreground" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="6 4" />
        ))}
        {groups.map((g, i) => {
          const on = g.id === selected;
          const missing = !chars[i];
          return (
            <g
              key={g.id}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={`Glifo ${i + 1}${chars[i] ? `, ${chars[i]}` : ', sem caractere'}`}
              onClick={() => onSelect(g.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(g.id); } }}
              className="cursor-pointer focus:outline-none"
            >
              <rect
                x={g.box.x0 - pad * 0.25}
                y={g.box.y0 - pad * 0.25}
                width={g.box.x1 - g.box.x0 + pad * 0.5}
                height={g.box.y1 - g.box.y0 + pad * 0.5}
                className={on ? 'fill-foreground/10 stroke-foreground' : 'fill-transparent stroke-separator-strong'}
                strokeWidth={on ? 2 : 1}
                vectorEffect="non-scaling-stroke"
                rx={pad * 0.15}
              />
              <path d={paths[i]} className={missing ? 'fill-muted-foreground/40' : 'fill-foreground'} />
              <text x={g.box.x0} y={g.box.y0 - pad * 0.4} fontSize={font} className={missing ? 'fill-muted-foreground' : 'fill-foreground'}>
                {chars[i] ?? '?'}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
