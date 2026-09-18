import React, { useRef, useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { useLanguage } from '../i18n';
import {
  exportLibraryDocument,
  importLibraryFile,
  removeLibrary,
  setLibraryEnabled,
  useReferenceLibraries
} from '../libraries/store';
import { ACCEPTED_LIBRARY_FILES } from '../libraries/importFile';
import type { LibraryEntry } from '../libraries/types';
import { describeLibraryError } from '../libraries/errorMessage';
import { downloadBlob } from '../utils/browser';
import { toSafeFileName } from '../utils/escape';
import { IconButton } from './ui';

const Switch: React.FC<{ on: boolean; label: string; onToggle: () => void }> = ({ on, label, onToggle }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    title={label}
    onClick={onToggle}
    className={`w-10 h-[22px] p-0.5 rounded-pill flex items-center shrink-0 transition-colors duration-fast ease-out ${on ? 'bg-primary justify-end' : 'bg-fill-3 justify-start'}`}
  >
    <span className={`w-[18px] h-[18px] rounded-pill ${on ? 'bg-primary-foreground' : 'bg-card'}`} aria-hidden="true" />
  </button>
);

type Status = { kind: 'ok' | 'error' | 'busy'; text: string } | null;

/**
 * The Libraries section of the settings sheet: the open palettes that ship
 * with the tool, the libraries imported on this device, and the import.
 */
export const LibrariesPanel: React.FC = () => {
  const { t, language } = useLanguage();
  const { entries, ready, persistent } = useReferenceLibraries();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);

  const number = (value: number) => new Intl.NumberFormat(language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR').format(value);

  const openLibraries = entries.filter((entry) => entry.source === 'builtin');
  const imported = entries.filter((entry) => entry.source === 'imported');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setStatus({ kind: 'busy', text: t.libraryImporting });
    try {
      const outcome = await importLibraryFile(file);
      const head = outcome.replaced ? t.libraryReplaced : t.libraryImported;
      const tail = outcome.persisted ? '' : ` ${t.libraryNotPersisted}`;
      setStatus({ kind: 'ok', text: `${head}: ${outcome.entry.name}.${tail}` });
    } catch (err) {
      setStatus({ kind: 'error', text: describeLibraryError(t, err) });
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleExport = (entry: LibraryEntry) => {
    const document = exportLibraryDocument(entry.id);
    if (!document) return;
    const blob = new Blob([JSON.stringify(document)], { type: 'application/json' });
    downloadBlob(blob, `${toSafeFileName(entry.name, 'library')}.json`);
  };

  const handleRemove = async (entry: LibraryEntry) => {
    await removeLibrary(entry.id);
    setStatus({ kind: 'ok', text: `${t.libraryRemoved}: ${entry.name}.` });
  };

  const meta = (entry: LibraryEntry) => {
    const parts: string[] = [];
    if (entry.books.length > 1) parts.push(`${number(entry.books.length)} ${t.libraryBooksUnit}`);
    parts.push(`${number(entry.colorCount)} ${t.libraryColorsUnit}`);
    if (entry.finishes.length) parts.push(entry.finishes.join(', '));
    if (entry.licence) parts.push(`${t.libraryLicence} ${entry.licence}`);
    return parts.join(' · ');
  };

  const row = (entry: LibraryEntry, index: number, all: LibraryEntry[]) => (
    <li key={entry.id} className={`flex items-center gap-3 min-h-14 py-2 ${index < all.length - 1 ? 'hairline-b' : ''}`}>
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <span className="text-[14px] text-foreground truncate" title={entry.name}>{entry.name}</span>
        <span className="text-[12px] text-muted-foreground tabular truncate">{meta(entry)}</span>
      </div>
      {entry.source === 'imported' && (
        <>
          <IconButton label={`${t.libraryExport}: ${entry.name}`} onClick={() => handleExport(entry)}>
            <Download aria-hidden="true" />
          </IconButton>
          <IconButton label={`${t.libraryRemove}: ${entry.name}`} onClick={() => void handleRemove(entry)}>
            <Trash2 aria-hidden="true" />
          </IconButton>
        </>
      )}
      <Switch
        on={entry.enabled}
        label={`${t.libraryUseInSearch}: ${entry.name}`}
        onToggle={() => void setLibraryEnabled(entry.id, !entry.enabled)}
      />
    </li>
  );

  return (
    <section className="flex flex-col gap-4" aria-labelledby="unbscolor-libraries-title">
      <div className="flex flex-col gap-2">
        <h3 id="unbscolor-libraries-title" className="label">{t.librariesTitle}</h3>
        <p className="text-[13px] text-muted-foreground">{t.librariesHint}</p>
      </div>

      <div className="flex flex-col gap-1">
        <h4 className="text-[13px] text-muted-foreground">{t.librariesOpen}</h4>
        <ul className="flex flex-col">{openLibraries.map(row)}</ul>
      </div>

      <div className="flex flex-col gap-1">
        <h4 className="text-[13px] text-muted-foreground">{t.librariesImported}</h4>
        {imported.length ? (
          <ul className="flex flex-col">{imported.map(row)}</ul>
        ) : (
          <p className="text-[14px] text-muted-foreground min-h-11 flex items-center">{ready ? t.librariesNoneImported : t.libraryImporting}</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_LIBRARY_FILES}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        {/* The one committing action of the sheet. */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status?.kind === 'busy'}
          className="ctl ctl-tinted h-10 px-4 self-start"
        >
          <Upload aria-hidden="true" />
          {status?.kind === 'busy' ? t.libraryImporting : t.libraryImport}
        </button>
        <p className="text-[12px] text-muted-foreground">{t.libraryImportHint}</p>
        {ready && !persistent && <p className="text-[12px] text-muted-foreground">{t.libraryMemoryOnly}</p>}
        <p role="status" aria-live="polite" className={`text-[13px] ${status?.kind === 'error' ? 'text-destructive' : 'text-foreground'} ${status && status.kind !== 'busy' ? '' : 'sr-only'}`}>
          {status && status.kind !== 'busy' ? status.text : ''}
        </p>
      </div>
    </section>
  );
};
