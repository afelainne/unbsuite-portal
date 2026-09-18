import React, { useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Trash2, Upload, FileDown, FileUp } from 'lucide-react';
import { PRESET_FAMILIES, presetDisplayName, presetDisplayDescription, type GeometryPreset } from '../lib/preset-engine';
import { useLanguage, fill } from '../i18n';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presets: GeometryPreset[];
  activePresetId: string | null;
  onLoad: (preset: GeometryPreset) => void;
  onDelete: (id: string) => void;
  /** Download the user presets as a .json file. */
  onExport?: () => void;
  /** Import presets from a .json file chosen by the user. */
  onImportFile?: (file: File) => void;
}

const LoadPresetDialog: React.FC<Props> = ({ open, onOpenChange, presets, activePresetId, onLoad, onDelete, onExport, onImportFile }) => {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const u = t.presetsUi;
  const userPresetCount = presets.filter(p => !p.isBuiltin).length;

  /** Yours first, then the ready-made ones grouped by family. */
  const sections = useMemo(() => {
    const mine = presets.filter(p => !p.isBuiltin);
    const ready = presets.filter(p => p.isBuiltin);
    const groups: Array<{ key: string; label: string; list: GeometryPreset[] }> = [];
    if (mine.length) groups.push({ key: 'mine', label: u.yours, list: mine });
    for (const family of PRESET_FAMILIES) {
      const list = ready.filter(p => p.family === family.id);
      if (list.length) groups.push({ key: family.id, label: fill(u.readyMade, { family: family.label }), list });
    }
    return groups;
    // The section labels follow the language.
  }, [presets, u]);

  const renderPreset = (p: GeometryPreset) => {
    const isActive = p.id === activePresetId;
    return (
      <div
        key={p.id}
        data-active={isActive ? 'true' : undefined}
        className={`row gap-3 py-2 rounded-md ${isActive ? 'is-active' : ''}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-callout font-medium truncate">{presetDisplayName(p)}</span>
            {p.isBuiltin
              ? <span className={`chip shrink-0 ${isActive ? 'chip-outline text-primary-foreground' : ''}`}>{u.ready}</span>
              : <span className={`chip shrink-0 ${isActive ? 'chip-outline text-primary-foreground' : 'chip-outline'}`}>{u.mine}</span>}
            {isActive && <span className="chip chip-outline shrink-0 text-primary-foreground">{u.active}</span>}
          </div>
          {presetDisplayDescription(p) && (
            <p className={`text-footnote mt-0.5 truncate ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{presetDisplayDescription(p)}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            className="ctl ctl-outline ctl-sm"
            onClick={() => { onLoad(p); onOpenChange(false); }}
          >
            <Upload className="h-3.5 w-3.5" /> {t.common.load}
          </button>
          {!p.isBuiltin && (
            confirmDelete === p.id ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  className="ctl ctl-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => { onDelete(p.id); setConfirmDelete(null); }}
                >{t.common.yes}</button>
                <button
                  type="button"
                  className="ctl ctl-outline ctl-sm"
                  onClick={() => setConfirmDelete(null)}
                >{t.common.no}</button>
              </div>
            ) : (
              <button
                type="button"
                aria-label={fill(u.deletePreset, { name: presetDisplayName(p) })}
                title={u.deletePresetTitle}
                className="ctl ctl-danger ctl-icon ctl-sm"
                onClick={() => setConfirmDelete(p.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) setConfirmDelete(null); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-y-auto overflow-x-hidden grid-cols-[minmax(0,1fr)]">
        <DialogHeader>
          <DialogTitle className="text-headline text-foreground">{u.loadTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {sections.map(section => (
            <div key={section.key} className="space-y-1">
              <span className="label block px-1">{section.label}</span>
              {section.list.map(renderPreset)}
            </div>
          ))}
          {presets.length === 0 && <p className="text-footnote text-muted-foreground text-center py-4">{u.noneAvailable}</p>}
        </div>
        {(onExport || onImportFile) && (
          <DialogFooter className="hairline-t pt-3 gap-2 sm:justify-start">
            {onExport && (
              <button
                type="button"
                className="ctl ctl-outline ctl-sm"
                onClick={onExport}
                disabled={userPresetCount === 0}
                title={userPresetCount === 0 ? u.nothingToExport : fill(u.exportCount, { n: userPresetCount })}
              >
                <FileDown className="h-3.5 w-3.5" /> {u.exportPresets}
              </button>
            )}
            {onImportFile && (
              <>
                <button type="button" className="ctl ctl-outline ctl-sm" onClick={() => fileInputRef.current?.click()}>
                  <FileUp className="h-3.5 w-3.5" /> {u.importPresets}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) onImportFile(file);
                  }}
                />
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoadPresetDialog;
