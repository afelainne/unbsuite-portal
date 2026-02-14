import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingNames: string[];
  onSave: (name: string, description: string) => void;
}

const SavePresetDialog: React.FC<Props> = ({ open, onOpenChange, existingNames, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Nome é obrigatório'); return; }
    if (existingNames.includes(trimmed)) { setError('Já existe um preset com este nome'); return; }
    onSave(trimmed, description.trim());
    setName(''); setDescription(''); setError('');
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { setName(''); setDescription(''); setError(''); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Salvar Preset</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nome *</Label>
            <Input value={name} onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="Ex: Meu Estilo Corporativo" className="h-8 text-xs mt-1" />
            {error && <p className="text-[10px] text-destructive mt-1">{error}</p>}
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Descrição opcional..." className="text-xs mt-1 min-h-[60px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SavePresetDialog;
