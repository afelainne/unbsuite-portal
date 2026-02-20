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
      <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">07 — Tom de Voz</p>
          <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Personalidade & Templates</h2>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-5 min-h-0 overflow-hidden">
          {/* DOs */}
          <div className="flex flex-col gap-2 overflow-hidden">
            <p className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{ color: '#22c55e' }}>✓ Fazer</p>
            <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
              {data.voiceDos.map((d, i) => (
                <div key={i} className="group flex items-start gap-1.5">
                  <span className="text-[10px] mt-0.5 flex-shrink-0" style={{ color: '#22c55e' }}>—</span>
                  <EditableText value={d} onChange={(v) => editDo(i, v)} className="text-[10px] flex-1 opacity-70" />
                  <button onClick={() => onChange({ voiceDos: data.voiceDos.filter((_, idx) => idx !== i) })} className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity flex-shrink-0">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              <button onClick={addDo} className="flex items-center gap-1 text-[10px] opacity-30 hover:opacity-70 transition-opacity mt-1" style={{ color: '#22c55e' }}>
                <Plus className="h-2.5 w-2.5" /> Adicionar
              </button>
            </div>
          </div>

          {/* DON'Ts */}
          <div className="flex flex-col gap-2 overflow-hidden">
            <p className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{ color: '#ef4444' }}>✗ Evitar</p>
            <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
              {data.voiceDonts.map((d, i) => (
                <div key={i} className="group flex items-start gap-1.5">
                  <span className="text-[10px] mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }}>—</span>
                  <EditableText value={d} onChange={(v) => editDont(i, v)} className="text-[10px] flex-1 opacity-70" />
                  <button onClick={() => onChange({ voiceDonts: data.voiceDonts.filter((_, idx) => idx !== i) })} className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity flex-shrink-0">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              <button onClick={addDont} className="flex items-center gap-1 text-[10px] opacity-30 hover:opacity-70 transition-opacity mt-1" style={{ color: '#ef4444' }}>
                <Plus className="h-2.5 w-2.5" /> Adicionar
              </button>
            </div>
          </div>

          {/* Templates */}
          <div className="flex flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-[9px] uppercase tracking-[0.2em] opacity-40">Templates</p>
              <button onClick={addTemplate} className="flex items-center gap-1 text-[9px] opacity-30 hover:opacity-70 transition-opacity" style={{ color: accent }}>
                <Plus className="h-2.5 w-2.5" /> Template
              </button>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto flex-1">
              {data.voiceTemplates.map((t) => (
                <div key={t.id} className="border border-foreground/8 rounded p-2 group relative" style={{ backgroundColor: theme?.cardBackground || undefined }}>
                  <input
                    value={t.context}
                    onChange={(e) => editTemplate(t.id, 'context', e.target.value)}
                    className="text-[9px] uppercase tracking-[0.15em] opacity-40 bg-transparent outline-none w-full border-b border-transparent focus:border-foreground/15 mb-1 pb-0.5"
                  />
                  <EditableText value={t.example} onChange={(v) => editTemplate(t.id, 'example', v)} className="text-[10px] italic opacity-60 block" multiline />
                  <button onClick={() => removeTemplate(t.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>07</div>
      </div>
    </PageSlide>
  );
};

export default VoicePage;
