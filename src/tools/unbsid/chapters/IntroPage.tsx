import { BrandData } from '../types';
import PageSlide from '../components/PageSlide';
import EditableText from '../components/EditableText';
import { ManualTheme } from '../themes';
import { X, Plus } from 'lucide-react';

interface IntroPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  slide: 'objective' | 'personality';
  theme?: ManualTheme;
}

const DEFAULT_BENEFITS = [
  { icon: '●', label: 'Consistência visual', desc: 'Garante que a marca seja reconhecível em todos os pontos de contato.' },
  { icon: '●', label: 'Agilidade criativa', desc: 'Elimina decisões repetitivas, permitindo focar no que importa.' },
  { icon: '●', label: 'Escalabilidade', desc: 'Facilita a integração de novos membros e parceiros à marca.' },
];

const IntroPage = ({ data, onChange, slide, theme }: IntroPageProps) => {
  if (slide === 'objective') {
    return (
      <PageSlide theme={theme}>
        <div className="absolute inset-0 px-10 py-8 flex flex-col gap-5 overflow-hidden">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">01 — Introdução</p>
            <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Objetivo do Manual</h2>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-8 min-h-0">
            <div>
              <p className="text-[9px] uppercase tracking-widest opacity-40 mb-3">Sobre este manual</p>
              <EditableText
                value={data.objective}
                onChange={(v) => onChange({ objective: v })}
                as="p"
                multiline
                className="text-[11px] leading-relaxed opacity-75 block"
              />
            </div>

            <div className="flex flex-col gap-4">
              {DEFAULT_BENEFITS.map((item) => (
                <div key={item.label} className="flex gap-3">
                  <span className="mt-0.5 text-[10px]" style={{ color: theme?.accentColor || 'hsl(var(--primary))' }}>{item.icon}</span>
                  <div>
                    <p className="text-[11px] font-semibold">{item.label}</p>
                    <p className="text-[10px] opacity-40 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>01</div>
        </div>
      </PageSlide>
    );
  }

  // slide === 'personality'
  const addChip = (field: 'archetype' | 'values') => {
    onChange({ [field]: [...data[field], 'Novo'] });
  };
  const removeChip = (field: 'archetype' | 'values', idx: number) => {
    onChange({ [field]: data[field].filter((_, i) => i !== idx) });
  };
  const editChip = (field: 'archetype' | 'values', idx: number, val: string) => {
    const arr = [...data[field]];
    arr[idx] = val;
    onChange({ [field]: arr });
  };

  const accent = theme?.accentColor || 'hsl(var(--primary))';

  return (
    <PageSlide theme={theme}>
      <div className="absolute inset-0 px-10 py-8 flex flex-col gap-5 overflow-hidden">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">01 — Introdução</p>
          <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Personalidade da Marca</h2>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
          {/* Arquétipo */}
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-3">Arquétipo</p>
            <div className="flex flex-wrap gap-2">
              {data.archetype.map((adj, i) => (
                <div key={i} className="group flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: accent + '15', color: accent }}>
                  <EditableText value={adj} onChange={(v) => editChip('archetype', i, v)} className="inline text-xs" />
                  <button onClick={() => removeChip('archetype', i)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              <button onClick={() => addChip('archetype')} className="flex items-center gap-1 border border-dashed rounded-full px-3 py-1 text-xs opacity-30 hover:opacity-70 transition-opacity" style={{ borderColor: accent, color: accent }}>
                <Plus className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>

          {/* Valores */}
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-3">Valores</p>
            <div className="flex flex-col gap-2">
              {data.values.map((v, i) => (
                <div key={i} className="group flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: accent }}>—</span>
                  <EditableText value={v} onChange={(val) => editChip('values', i, val)} className="text-[11px] flex-1" />
                  <button onClick={() => removeChip('values', i)} className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button onClick={() => addChip('values')} className="flex items-center gap-2 text-xs opacity-30 hover:opacity-70 transition-opacity mt-1" style={{ color: accent }}>
                <Plus className="h-3 w-3" /> Adicionar valor
              </button>
            </div>
          </div>

          {/* Tom e Vibe */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-2">Tom de comunicação</p>
              <EditableText value={data.tone} onChange={(v) => onChange({ tone: v })} className="text-[11px] opacity-75 block" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-2">Vibe</p>
              <EditableText value={data.vibe} onChange={(v) => onChange({ vibe: v })} as="p" className="text-[11px] italic opacity-60 block" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>01</div>
      </div>
    </PageSlide>
  );
};

export default IntroPage;
