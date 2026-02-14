import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Trash2, Upload } from 'lucide-react';
import type { GeometryPreset } from '../lib/preset-engine';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presets: GeometryPreset[];
  activePresetId: string | null;
  onLoad: (preset: GeometryPreset) => void;
  onDelete: (id: string) => void;
}

const LoadPresetDialog: React.FC<Props> = ({ open, onOpenChange, presets, activePresetId, onLoad, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) setConfirmDelete(null); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Carregar Preset</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {presets.map(p => (
            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-md border transition-colors
              ${p.id === activePresetId ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate">{p.name}</span>
                  {p.isBuiltin && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Padrão</Badge>}
                  {p.id === activePresetId && <Badge className="text-[9px] px-1.5 py-0">Ativo</Badge>}
                </div>
                {p.description && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{p.description}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-[10px] px-2"
                  onClick={() => { onLoad(p); onOpenChange(false); }}>
                  <Upload className="h-3 w-3 mr-1" /> Carregar
                </Button>
                {!p.isBuiltin && (
                  confirmDelete === p.id ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="destructive" className="h-7 text-[10px] px-2"
                        onClick={() => { onDelete(p.id); setConfirmDelete(null); }}>Sim</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] px-2"
                        onClick={() => setConfirmDelete(null)}>Não</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmDelete(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )
                )}
              </div>
            </div>
          ))}
          {presets.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum preset disponível</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoadPresetDialog;
