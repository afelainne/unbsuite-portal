import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { PRESET_FAMILIES, type PresetFamily } from '../lib/preset-engine';
import { PILL_GROUP } from './chrome-classes';
import { useLanguage } from '../i18n';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingNames: string[];
  onSave: (name: string, description: string, family: PresetFamily) => void;
}

const SavePresetDialog: React.FC<Props> = ({ open, onOpenChange, existingNames, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [family, setFamily] = useState<PresetFamily>('logo');
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const reset = () => { setName(''); setDescription(''); setFamily('logo'); setError(''); };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError(t.presetsUi.nameRequired); return; }
    const lower = trimmed.toLocaleLowerCase();
    if (existingNames.some(n => n.trim().toLocaleLowerCase() === lower)) { setError(t.presetsUi.nameTaken); return; }
    onSave(trimmed, description.trim(), family);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-headline text-foreground">{t.presetsUi.saveTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="unbsgrid-preset-name" className="label block">{t.presetsUi.name}</label>
            <input
              id="unbsgrid-preset-name"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder={t.presetsUi.namePlaceholder}
              aria-invalid={error ? true : undefined}
              className="field"
            />
            {error && <p className="text-footnote text-destructive">{error}</p>}
          </div>
          <div className="space-y-1.5">
            <span className="label block" id="unbsgrid-preset-family-label">{t.presetsUi.family}</span>
            <div className={`${PILL_GROUP} w-full`} role="group" aria-labelledby="unbsgrid-preset-family-label">
              {PRESET_FAMILIES.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`segmented-item flex-1 min-w-0 truncate px-1.5 ${family === item.id ? 'is-active' : ''}`}
                  aria-pressed={family === item.id}
                  title={item.hint}
                  onClick={() => setFamily(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-footnote text-muted-foreground">
              {PRESET_FAMILIES.find(f => f.id === family)?.hint}
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="unbsgrid-preset-desc" className="label block">{t.presetsUi.description}</label>
            <textarea
              id="unbsgrid-preset-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t.presetsUi.descriptionPlaceholder}
              className="field min-h-[72px] resize-y"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <button type="button" className="ctl ctl-outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</button>
          <button type="button" className="ctl ctl-filled" onClick={handleSave}>{t.common.save}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SavePresetDialog;
