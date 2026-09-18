/**
 * SvgInputPanel — the one place a logo gets into the tool.
 *
 * Self-contained: it owns its tabs, its recents list and its paste listener,
 * and hands the parent a single `SvgInputResult` whose `svg` is already
 * sanitized. Errors are reported here (toast); warnings travel in the result
 * so the parent can show them next to the parse result.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, ClipboardPaste, Shapes, Clock, Trash2, X, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  isSvgInputError,
  readSvgFile,
  svgFromClipboard,
  svgFromDrop,
  svgFromText,
  validateSvgInput,
  isTextEntryTarget,
  type SvgInputOutcome,
  type SvgInputResult,
} from '../lib/svg-input';
import { SAMPLE_LOGOS, loadSample } from '../lib/samples';
import { QUIET_TABLIST, quietTab } from './chrome-classes';
import { useLanguage, fill, type Translations } from '../i18n';
import { sanitizeSVG } from '../lib/svg-sanitize';
import {
  loadRecents,
  rememberRecent,
  removeRecent,
  saveRecents,
  clearRecents,
  formatRecentDate,
  type RecentEntry,
} from '../lib/session-history';

export type SvgInputTab = 'upload' | 'paste' | 'samples';

export interface SvgInputPanelProps {
  /** Called with sanitized markup every time a logo is accepted. */
  onLoad: (result: SvgInputResult) => void;
  /** Name of the file currently open, highlighted in the recents list. */
  activeName?: string | null;
  /** Which tab opens first (default "upload"). */
  defaultTab?: SvgInputTab;
  /** Listen for Ctrl+V on the whole page (default true). */
  pasteShortcut?: boolean;
  /** Show the recents list (default true). */
  showRecents?: boolean;
  className?: string;
}

const TABS: Array<{ id: SvgInputTab; key: keyof Translations['input']; icon: LucideIcon }> = [
  { id: 'upload', key: 'tabUpload', icon: Upload },
  { id: 'paste', key: 'tabPaste', icon: ClipboardPaste },
  { id: 'samples', key: 'tabSamples', icon: Shapes },
];

/** Sanitize once more before injecting a preview into the page. */
function inlinePreview(svg: string | null): string | null {
  if (!svg) return null;
  try {
    return sanitizeSVG(svg).svg;
  } catch {
    return null;
  }
}

const SvgInputPanel: React.FC<SvgInputPanelProps> = ({
  onLoad,
  activeName = null,
  defaultTab = 'upload',
  pasteShortcut = true,
  showRecents = true,
  className = '',
}) => {
  const [tab, setTab] = useState<SvgInputTab>(defaultTab);
  const { t } = useLanguage();
  const i = t.input;
  const [isDragging, setIsDragging] = useState(false);
  const [draft, setDraft] = useState('');
  const [recents, setRecents] = useState<RecentEntry[]>(() => (showRecents ? loadRecents() : []));
  const storageWarned = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  const handleOutcome = useCallback((outcome: SvgInputOutcome) => {
    if (isSvgInputError(outcome)) {
      toast.error(outcome.title, { description: outcome.description });
      return false;
    }
    if (showRecents) {
      const { list, stored } = rememberRecent({ name: outcome.name, svg: outcome.svg, bytes: outcome.bytes });
      setRecents(list);
      if (!stored && !storageWarned.current) {
        storageWarned.current = true;
        toast.warning(i.recentsNotSaved, {
          description: i.recentsNotSavedDescription,
        });
      }
    }
    onLoadRef.current(outcome);
    return true;
  }, [showRecents, i]);

  // --- file picker / drop -------------------------------------------------

  const openPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFiles = useCallback(async (file: File | null | undefined) => {
    handleOutcome(await readSvgFile(file));
  }, [handleOutcome]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleOutcome(await svgFromDrop(e.dataTransfer));
  }, [handleOutcome]);

  // --- Ctrl+V anywhere on the page ---------------------------------------

  useEffect(() => {
    if (!pasteShortcut || typeof document === 'undefined') return;
    const onPaste = (event: Event) => {
      const e = event as ClipboardEvent;
      if (e.defaultPrevented || isTextEntryTarget(e.target)) return;
      const data = e.clipboardData;
      if (!data) return;
      void svgFromClipboard(data).then(outcome => {
        // Nothing SVG-ish in the clipboard: stay quiet, the person was
        // probably copying something else entirely.
        if (isSvgInputError(outcome) && outcome.code === 'no-svg-in-clipboard') return;
        handleOutcome(outcome);
      });
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [pasteShortcut, handleOutcome]);

  // --- pasted markup ------------------------------------------------------

  const submitDraft = useCallback(() => {
    if (handleOutcome(svgFromText(draft))) setDraft('');
  }, [draft, handleOutcome]);

  // --- samples ------------------------------------------------------------

  // Only the previews are memoized: name and description are read from the
  // sample at render time, in the active language.
  const samplePreviews = useMemo(
    () => new Map(SAMPLE_LOGOS.map(s => [s.id, inlinePreview(s.svg)])),
    [],
  );

  // --- recents ------------------------------------------------------------

  const openRecent = useCallback((entry: RecentEntry) => {
    if (!entry.thumbnail) {
      toast.error(i.noCopyKept, {
        description: i.noCopyKeptDescription,
      });
      return;
    }
    handleOutcome(validateSvgInput(entry.thumbnail, { source: 'recent', name: entry.name }));
  }, [handleOutcome, i]);

  const dropRecent = useCallback((id: string) => {
    setRecents(prev => {
      const next = removeRecent(prev, id);
      saveRecents(next);
      return next;
    });
  }, []);

  const dropAllRecents = useCallback(() => {
    clearRecents();
    setRecents([]);
  }, []);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className={QUIET_TABLIST} role="tablist" aria-label={i.howToLoad}>
        {TABS.map(({ id, key, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={quietTab(tab === id)}
            onClick={() => setTab(id)}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            {i[key]}
          </button>
        ))}
      </div>

      {/* Enviar arquivo */}
      {tab === 'upload' && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="sr-only"
            onChange={e => {
              void handleFiles(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <div
            role="button"
            tabIndex={0}
            aria-label={i.dropAria}
            onClick={openPicker}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPicker();
              }
            }}
            onDrop={e => void handleDrop(e)}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center cursor-pointer select-none press transition-colors duration-fast ease-out outline-none focus-visible:shadow-focus ${
              isDragging ? 'border-tint bg-fill-2' : 'border-separator-strong bg-fill hover:bg-fill-2'
            }`}
          >
            <Upload
              className={`h-5 w-5 flex-shrink-0 transition-colors duration-fast ease-out ${isDragging ? 'text-tint' : 'text-muted-foreground'}`}
              strokeWidth={2}
            />
            <span className="text-headline text-foreground">{i.dropTitle}</span>
            <span className="text-footnote text-muted-foreground">{i.dropHint}</span>
          </div>
          <p className="text-callout text-muted-foreground mt-1.5 px-1">
            {i.pasteHint}
          </p>
        </div>
      )}

      {/* Colar código */}
      {tab === 'paste' && (
        <div className="flex flex-col gap-2">
          <label className="label" htmlFor="unbsgrid-svg-draft">{i.pasteLabel}</label>
          <textarea
            id="unbsgrid-svg-draft"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                submitDraft();
              }
            }}
            rows={6}
            spellCheck={false}
            placeholder={'<svg viewBox="0 0 100 100">…</svg>'}
            className="field field-mono w-full resize-y text-[11px]"
          />
          <div className="flex items-center gap-2">
            <button type="button" className="ctl ctl-filled ctl-sm" onClick={submitDraft} disabled={!draft.trim()}>
              {t.common.load}
            </button>
            <button
              type="button"
              className="ctl ctl-plain ctl-sm"
              onClick={() => setDraft('')}
              disabled={!draft}
            >
              {t.common.clear}
            </button>
            <span className="text-caption text-muted-foreground ml-auto">{i.pasteRun}</span>
          </div>
        </div>
      )}

      {/* Exemplos */}
      {tab === 'samples' && (
        <div className="flex flex-col gap-2">
          <p className="text-callout text-muted-foreground px-1">
            {i.samplesHint}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {SAMPLE_LOGOS.map(sample => {
              const preview = samplePreviews.get(sample.id) ?? null;
              return (
              <button
                key={sample.id}
                type="button"
                title={`${sample.name} — ${sample.demonstrates}`}
                onClick={() => handleOutcome(loadSample(sample.id))}
                className="group flex flex-col items-center gap-1 rounded-lg p-2 press transition-colors duration-fast ease-out hover:bg-fill focus-visible:shadow-focus outline-none"
              >
                <span
                  aria-hidden="true"
                  className="block h-10 w-full [&_svg]:h-full [&_svg]:w-full text-foreground dark:invert"
                  dangerouslySetInnerHTML={preview ? { __html: preview } : undefined}
                />
                <span className="text-caption text-muted-foreground group-hover:text-foreground leading-tight">
                  {sample.name}
                </span>
              </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recentes */}
      {showRecents && recents.length > 0 && (
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex items-center gap-2 px-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
            <span className="label">{i.recents}</span>
            <button
              type="button"
              className="ctl ctl-plain ctl-sm ml-auto"
              onClick={dropAllRecents}
              aria-label={i.clearRecents}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
          <ul className="flex flex-col gap-0.5">
            {recents.map(entry => {
              const preview = inlinePreview(entry.thumbnail);
              return (
                <li key={entry.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openRecent(entry)}
                    data-active={entry.name === activeName ? 'true' : undefined}
                    className="row flex-1 min-w-0"
                    title={fill(i.recentOpenHint, { name: entry.name })}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm bg-fill [&_svg]:h-full [&_svg]:w-full dark:invert"
                      dangerouslySetInnerHTML={preview ? { __html: preview } : undefined}
                    />
                    <span className="truncate flex-1 text-left">{entry.name}</span>
                    <span className="text-caption text-muted-foreground tabular-nums flex-shrink-0">
                      {formatRecentDate(entry.at)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ctl ctl-plain ctl-sm ctl-icon flex-shrink-0"
                    onClick={() => dropRecent(entry.id)}
                    aria-label={fill(i.removeRecent, { name: entry.name })}
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-callout text-muted-foreground px-1">
            {i.recentsNote}
          </p>
        </div>
      )}
    </div>
  );
};

export default SvgInputPanel;
