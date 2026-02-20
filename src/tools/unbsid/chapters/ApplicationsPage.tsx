import { useState } from 'react';
import { BrandData, MockupRef } from '../types';
import PageSlide from '../components/PageSlide';
import { TEMPLATES } from '../../unbsmockup/templates';
import { Plus, X } from 'lucide-react';

interface ApplicationsPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
}

const ApplicationsPage = ({ data, onChange }: ApplicationsPageProps) => {
  const [showPicker, setShowPicker] = useState(false);

  const addMockup = (templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const ref: MockupRef = { templateId, label: tpl.name };
    onChange({ mockupRefs: [...data.mockupRefs, ref] });
    setShowPicker(false);
  };

  const removeMockup = (idx: number) => {
    onChange({ mockupRefs: data.mockupRefs.filter((_, i) => i !== idx) });
  };

  return (
    <PageSlide>
      <div className="h-full flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">08 — Aplicações</p>
            <h2 className="text-2xl font-bold mt-1">Mockups</h2>
          </div>
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-foreground/20 text-xs hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar mockup
          </button>
        </div>

        {/* Template picker dropdown */}
        {showPicker && (
          <div className="absolute top-16 right-8 z-50 bg-background border border-foreground/20 rounded-xl shadow-xl w-72 max-h-64 overflow-y-auto p-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => addMockup(tpl.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-lg text-left transition-colors"
              >
                <div
                  className="w-8 h-8 rounded border border-foreground/10 bg-muted flex-shrink-0 overflow-hidden"
                  dangerouslySetInnerHTML={{
                    __html: `<svg viewBox="${tpl.viewBox}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">${tpl.frameSvg}</svg>`,
                  }}
                />
                <div>
                  <p className="font-medium">{tpl.name}</p>
                  <p className="text-muted-foreground capitalize">{tpl.category}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mockup grid */}
        {data.mockupRefs.length === 0 ? (
          <div className="flex-1 border-2 border-dashed border-foreground/10 rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Plus className="h-8 w-8 opacity-30" />
            <p className="text-sm">Adicione mockups para mostrar a marca em contexto</p>
            <p className="text-xs opacity-60">Use os templates do UNBSMOCKUP</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-3 gap-4">
            {data.mockupRefs.map((ref, i) => {
              const tpl = TEMPLATES.find((t) => t.id === ref.templateId);
              if (!tpl) return null;
              return (
                <div key={i} className="relative group border border-foreground/10 rounded-lg overflow-hidden">
                  <div
                    className="w-full bg-muted/30"
                    style={{ aspectRatio: '4/3' }}
                    dangerouslySetInnerHTML={{
                      __html: `<svg viewBox="${tpl.viewBox}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">${tpl.frameSvg}${tpl.bgSvg || ''}</svg>`,
                    }}
                  />
                  <div className="p-2">
                    <p className="text-[11px] font-medium truncate">{ref.label || tpl.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{tpl.category}</p>
                  </div>
                  <button
                    onClick={() => removeMockup(i)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-background/80 rounded text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">08</div>
      </div>
    </PageSlide>
  );
};

export default ApplicationsPage;
