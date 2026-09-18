import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, Combine, Lock, LockOpen, Plus, Split, Trash2, Upload, X } from 'lucide-react';
import type { FontStyle, Glyph, Project } from '../lib/types';
import {
  detectBaselines, measureGuides, mergeWithNext, pastedGlyph, readSheet, setRowBaseline, sheetGroups, sheetToGlyphs,
  sourceCapHeight, splitGroup, type Sheet, type SheetGuides,
} from '../lib/sheet';
import { DEFAULT_SEQUENCE, PRESETS, sequenceChars } from '../lib/charset';
import { toPathData } from '../lib/geometry';
import { advanceOf } from '../lib/outline';
import { Card, Field, IconButton, Metric, Sheet as Dialog, Switch } from './ui';
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
  notify: Notify;
}

const SEQUENCE_KEY = 'unbsfont:sequence';
const readSequence = () => {
  try { return localStorage.getItem(SEQUENCE_KEY) || DEFAULT_SEQUENCE; } catch { return DEFAULT_SEQUENCE; }
};

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

export const InputStep: React.FC<InputStepProps> = ({ project, style, onAddGlyphs, onGlyph, onRemoveGlyph, notify }) => {
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

  const loadSheet = useCallback((text: string) => {
    try {
      const s = readSheet(text);
      const count = sheetGroups(s).length;
      if (!count) { notify('Nenhuma forma preenchida no SVG.', 'error'); return; }
      setSheet(s);
      setBaselineEdits({});
      setSelectedGroup(null);
      setSelectedChar(null);
      const warn = s.strokeOnly ? ` ${s.strokeOnly} formas só com traço foram ignoradas: converta traços em contornos.` : '';
      notify(`${count} glifos encontrados na folha.${warn}`, s.strokeOnly ? 'info' : 'ok');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Não foi possível ler o SVG.', 'error');
    }
  }, [notify]);

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

  const slots = useMemo(() => {
    const base = PRESETS.flatMap(p => Array.from(p.chars));
    const set = new Set(base);
    const extra = [...Object.keys(style.glyphs), ...extraChars]
      .filter(c => !set.has(c) && c !== ' ')
      .sort((a, b) => (a.codePointAt(0) || 0) - (b.codePointAt(0) || 0));
    return [...base, ...Array.from(new Set(extra))];
  }, [style.glyphs, extraChars]);
  const drawn = Object.values(style.glyphs).filter(g => g.outline.length).length;
  const glyph = selectedChar ? style.glyphs[selectedChar] : undefined;

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
      <input ref={sheetFile} type="file" accept=".svg,image/svg+xml" className="hidden" onChange={e => { readFile(e.target.files?.[0], 'sheet'); e.target.value = ''; }} />
      <input ref={glyphFile} type="file" accept=".svg,image/svg+xml" className="hidden" onChange={e => { readFile(e.target.files?.[0], 'glyph'); e.target.value = ''; }} />

      <Card
        label="Folha SVG"
        actions={
          <>
            <IconButton label="Enviar folha SVG" onClick={() => sheetFile.current?.click()}><Upload aria-hidden="true" /></IconButton>
            <IconButton label="Colar folha SVG" onClick={() => { setSelectedChar(null); readClipboard(); }}><ClipboardPaste aria-hidden="true" /></IconButton>
            {sheet && <IconButton label="Descartar folha" onClick={() => setSheet(null)}><X aria-hidden="true" /></IconButton>}
          </>
        }
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); readFile(e.dataTransfer.files?.[0], 'sheet'); }}
      >
        {!detected ? (
          <button
            type="button"
            onClick={() => sheetFile.current?.click()}
            className="surface-inset flex flex-col items-center justify-center gap-2 text-center px-6 py-10 hover:bg-fill-2 transition-colors duration-fast ease-out"
          >
            <span className="text-[16px] text-foreground">Um SVG com todos os caracteres desenhados</span>
            <span className="text-[14px] text-muted-foreground max-w-[46ch]">
              Solte o arquivo aqui, clique para escolher ou cole com Ctrl+V. Os glifos são lidos em ordem de leitura, linha por linha, e o desenho entra na fonte sem nenhuma alteração.
            </span>
          </button>
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] items-start">
        <Card label={`Glifos · ${style.name}`} actions={<span className="text-[12px] text-muted-foreground tabular">{drawn} desenhados</span>}>
          <div className="grid gap-1.5 grid-cols-[repeat(auto-fill,minmax(52px,1fr))]" role="listbox" aria-label="Caracteres">
            {slots.map(c => {
              const g = style.glyphs[c];
              const on = c === selectedChar;
              return (
                <button
                  key={c}
                  type="button"
                  role="option"
                  aria-selected={on}
                  aria-label={`${c}${g ? '' : ', sem desenho'}`}
                  onClick={() => setSelectedChar(on ? null : c)}
                  className={cx(
                    'aspect-square rounded-sm flex items-center justify-center p-1.5 transition-colors duration-fast ease-out',
                    on ? 'bg-primary text-primary-foreground' : 'bg-fill hover:bg-fill-2 text-foreground',
                  )}
                >
                  {g ? <GlyphThumb glyph={g} m={m} className="w-full h-full" /> : <span className={cx('text-[18px]', on ? 'opacity-70' : 'text-muted-foreground/60')}>{c}</span>}
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
                {glyph && (
                  <IconButton label="Apagar o desenho" variant="danger" onClick={() => onRemoveGlyph(selectedChar)}><Trash2 aria-hidden="true" /></IconButton>
                )}
              </>
            }
            className="xl:sticky xl:top-0"
          >
            {glyph ? (
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
