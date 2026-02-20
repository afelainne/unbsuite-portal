import { BrandData, VoiceTemplate } from '../types';
import PageSlide from '../components/PageSlide';
import EditableText from '../components/EditableText';
import { X, Plus } from 'lucide-react';

interface VoicePageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
}

const CONTEXT_LABELS: Record<string, string> = {
  error: 'Erro',
  onboarding: 'Onboarding',
  empty: 'Estado vazio',
  confirmation: 'Confirmação',
  cta: 'Call to Action',
};

const VoicePage = ({ data, onChange }: VoicePageProps) => {
  const addDo = () => onChange({ voiceDos: [...data.voiceDos, 'Nova regra positiva'] });
  const addDont = () => onChange({ voiceDonts: [...data.voiceDonts, 'Evitar…'] });

  const editDo = (i: number, v: string) => {
    const arr = [...data.voiceDos];
    arr[i] = v;
    onChange({ voiceDos: arr });
  };
  const editDont = (i: number, v: string) => {
    const arr = [...data.voiceDonts];
    arr[i] = v;
    onChange({ voiceDonts: arr });
  };

  const editTemplate = (id: string, example: string) => {
    onChange({
      voiceTemplates: data.voiceTemplates.map((t) => t.id === id ? { ...t, example } : t),
    });
  };

  return (
    <PageSlide>
      <div className="h-full flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">07 — Tom de Voz</p>
          <h2 className="text-2xl font-bold mt-1">Personalidade & Templates</h2>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-6">
          {/* DOs */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 text-green-600">✓ Fazer</p>
            <div className="flex flex-col gap-2">
              {data.voiceDos.map((d, i) => (
                <div key={i} className="group flex items-start gap-1.5">
                  <span className="text-green-600 text-xs mt-0.5">—</span>
                  <EditableText
                    value={d}
                    onChange={(v) => editDo(i, v)}
                    className="text-xs flex-1 text-foreground/80"
                  />
                  <button
                    onClick={() => onChange({ voiceDos: data.voiceDos.filter((_, idx) => idx !== i) })}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button onClick={addDo} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-1">
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>
          </div>

          {/* DON'Ts */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 text-red-500">✗ Evitar</p>
            <div className="flex flex-col gap-2">
              {data.voiceDonts.map((d, i) => (
                <div key={i} className="group flex items-start gap-1.5">
                  <span className="text-red-500 text-xs mt-0.5">—</span>
                  <EditableText
                    value={d}
                    onChange={(v) => editDont(i, v)}
                    className="text-xs flex-1 text-foreground/80"
                  />
                  <button
                    onClick={() => onChange({ voiceDonts: data.voiceDonts.filter((_, idx) => idx !== i) })}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button onClick={addDont} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-1">
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>
          </div>

          {/* Templates */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Templates de mensagem</p>
            <div className="flex flex-col gap-2">
              {data.voiceTemplates.map((t) => (
                <div key={t.id} className="border border-foreground/10 rounded-lg p-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    {CONTEXT_LABELS[t.context] || t.context}
                  </p>
                  <EditableText
                    value={t.example}
                    onChange={(v) => editTemplate(t.id, v)}
                    className="text-xs italic text-foreground/70 block"
                    multiline
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">07</div>
      </div>
    </PageSlide>
  );
};

export default VoicePage;
