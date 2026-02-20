import { useEffect, useRef, useState } from 'react';
import { BrandData, MockupRef } from '../types';
import PageSlide from '../components/PageSlide';
import { ManualTheme } from '../themes';
import { TEMPLATES } from '../../unbsmockup/templates';
import { Plus, X } from 'lucide-react';

interface ApplicationsPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  theme?: ManualTheme;
}

const TEMPLATE_GROUPS = TEMPLATES.reduce<Record<string, typeof TEMPLATES>>((acc, tpl) => {
  const cat = tpl.category || 'Other';
  if (!acc[cat]) acc[cat] = [];
  acc[cat].push(tpl);
  return acc;
}, {});

const ApplicationsPage = ({ data, onChange, theme }: ApplicationsPageProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const accent = theme?.accentColor || 'hsl(var(--primary))';

  useEffect(() => {
    if (!showPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPicker]);

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
    <PageSlide theme={theme}>
      <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">08 — Aplicações</p>
            <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Mockups</h2>
          </div>
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-foreground/15 text-[10px] hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="h-3 w-3" /> Adicionar mockup
          </button>
        </div>

        {showPicker && (
          <div ref={pickerRef} className="absolute top-16 right-8 z-50 bg-background border border-foreground/15 rounded-xl shadow-xl w-72 max-h-64 overflow-y-auto p-2">
            {Object.entries(TEMPLATE_GROUPS).map(([category, templates]) => (
              <div key={category} className="mb-2">
                <p className="text-[8px] uppercase tracking-[0.2em] font-bold opacity-30 px-2 py-1 sticky top-0 bg-background">{category}</p>
                {templates.map((tpl) => (
                  <button key={tpl.id} onClick={() => addMockup(tpl.id)} className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-muted rounded-lg text-left transition-colors">
                    <div className="w-7 h-7 rounded border border-foreground/10 bg-muted flex-shrink-0 overflow-hidden" dangerouslySetInnerHTML={{ __html: `<svg viewBox="${tpl.viewBox}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">${tpl.frameSvg}</svg>` }} />
                    <div>
                      <p className="font-medium">{tpl.name}</p>
                      <p className="opacity-40 capitalize text-[9px]">{tpl.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {data.mockupRefs.length === 0 ? (
          <div className="flex-1 border-2 border-dashed border-foreground/8 rounded-xl flex flex-col items-center justify-center gap-2 opacity-40">
            <Plus className="h-6 w-6 opacity-30" />
            <p className="text-[11px]">Adicione mockups para mostrar a marca em contexto</p>
            <p className="text-[10px] opacity-60">Use os templates do UNBSMOCKUP</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-3 gap-3 overflow-hidden">
            {data.mockupRefs.map((ref, i) => {
              const tpl = TEMPLATES.find((t) => t.id === ref.templateId);
              if (!tpl) return null;
              return (
                <div key={i} className="relative group border border-foreground/8 rounded overflow-hidden">
                  <div className="w-full bg-muted/20" style={{ aspectRatio: '4/3' }} dangerouslySetInnerHTML={{ __html: `<svg viewBox="${tpl.viewBox}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">${tpl.frameSvg}${tpl.bgSvg || ''}</svg>` }} />
                  <div className="p-2">
                    <p className="text-[10px] font-medium truncate">{ref.label || tpl.name}</p>
                    <p className="text-[9px] opacity-40 capitalize">{tpl.category}</p>
                  </div>
                  <button onClick={() => removeMockup(i)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-background/80 rounded hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>08</div>
      </div>
    </PageSlide>
  );
};

export default ApplicationsPage;
