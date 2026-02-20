import { BrandData, VoiceTemplate } from '../types';
import PageSlide from '../components/PageSlide';
import EditableText from '../components/EditableText';
import { ManualTheme } from '../themes';
import { X, Plus } from 'lucide-react';

interface VoicePageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  theme?: ManualTheme;
}

const CONTEXT_LABELS: Record<string, string> = {
  error: 'Erro', onboarding: 'Onboarding', empty: 'Estado vazio', confirmation: 'Confirmação', cta: 'CTA',
};

const VoicePage = ({ data, onChange, theme }: VoicePageProps) => {
  const accent = theme?.accentColor || 'hsl(var(--primary))';

  const addDo = () => onChange({ voiceDos: [...data.voiceDos, 'Nova regra positiva'] });
  const addDont = () => onChange({ voiceDonts: [...data.voiceDonts, 'Evitar…'] });

  const editDo = (i: number, v: string) => {
    const arr = [...data.voiceDos]; arr[i] = v; onChange({ voiceDos: arr });
  };
  const editDont = (i: number, v: string) => {
    const arr = [...data.voiceDonts]; arr[i] = v; onChange({ voiceDonts: arr });
  };
  const editTemplate = (id: string, field: 'example' | 'context', val: string) => {
    onChange({ voiceTemplates: data.voiceTemplates.map((t) => t.id === id ? { ...t, [field]: val } : t) });
  };
  const addTemplate = () => {
    const id = `vt${Date.now()}`;
    const newT: VoiceTemplate = { id, context: 'novo', example: 'Exemplo de mensagem aqui.' };
    onChange({ voiceTemplates: [...data.voiceTemplates, newT] });
  };
  const removeTemplate = (id: string) => {
    onChange({ voiceTemplates: data.voiceTemplates.filter((t) => t.id !== id) });
  };

  return (
    <PageSlide theme={theme}>
      <div className="h-full flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">07 — Tom de Voz</p>
          <h2 className="text-2xl font-bold mt-1" style={{ fontFamily: theme?.headingFont }}>Personalidade & Templates</h2>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-6">
          {/* DOs */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: '#22c55e' }}>✓ Fazer</p>
            <div className="flex flex-col gap-2">
              {data.voiceDos.map((d, i) => (
                <div key={i} className="group flex items-start gap-1.5">
                  <span className="text-xs mt-0.5" style={{ color: '#22c55e' }}>—</span>
                  <EditableText value={d} onChange={(v) => editDo(i, v)} className="text-xs flex-1 opacity-80" />
                  <button onClick={() => onChange({ voiceDos: data.voiceDos.filter((_, idx) => idx !== i) })} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button onClick={addDo} className="flex items-center gap-1 text-xs opacity-40 hover:opacity-80 transition-opacity mt-1" style={{ color: '#22c55e' }}>
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>
          </div>

          {/* DON'Ts */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: '#ef4444' }}>✗ Evitar</p>
            <div className="flex flex-col gap-2">
              {data.voiceDonts.map((d, i) => (
                <div key={i} className="group flex items-start gap-1.5">
                  <span className="text-xs mt-0.5" style={{ color: '#ef4444' }}>—</span>
                  <EditableText value={d} onChange={(v) => editDont(i, v)} className="text-xs flex-1 opacity-80" />
                  <button onClick={() => onChange({ voiceDonts: data.voiceDonts.filter((_, idx) => idx !== i) })} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button onClick={addDont} className="flex items-center gap-1 text-xs opacity-40 hover:opacity-80 transition-opacity mt-1" style={{ color: '#ef4444' }}>
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>
          </div>

          {/* Templates */}
          <div className="flex flex-col gap-2 overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest opacity-50">Templates</p>
              <button onClick={addTemplate} className="flex items-center gap-1 text-[10px] opacity-40 hover:opacity-80 transition-opacity" style={{ color: accent }}>
                <Plus className="h-3 w-3" /> Template
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {data.voiceTemplates.map((t) => (
                <div key={t.id} className="border border-foreground/10 rounded-lg p-2 group relative" style={{ backgroundColor: theme?.cardBackground || undefined }}>
                  <input
                    value={CONTEXT_LABELS[t.context] || t.context}
                    onChange={(e) => editTemplate(t.id, 'context', e.target.value)}
                    className="text-[10px] uppercase tracking-wider opacity-50 bg-transparent outline-none w-full border-b border-transparent focus:border-foreground/20 mb-1 pb-0.5"
                  />
                  <EditableText value={t.example} onChange={(v) => editTemplate(t.id, 'example', v)} className="text-xs italic opacity-70 block" multiline />
                  <button onClick={() => removeTemplate(t.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-10 text-[80px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.04 }}>07</div>
      </div>
    </PageSlide>
  );
};

export default VoicePage;
