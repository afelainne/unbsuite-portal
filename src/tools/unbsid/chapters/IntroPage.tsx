import { BrandData } from '../types';
import PageSlide from '../components/PageSlide';
import EditableText from '../components/EditableText';
import { X, Plus } from 'lucide-react';

interface IntroPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  slide: 'objective' | 'personality';
}

const IntroPage = ({ data, onChange, slide }: IntroPageProps) => {
  if (slide === 'objective') {
    return (
      <PageSlide>
        <div className="h-full flex flex-col gap-6">
          {/* Header */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              01 — Introdução
            </p>
            <h2 className="text-2xl font-bold mt-1">Objetivo do Manual</h2>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 grid grid-cols-2 gap-8">
            {/* Objetivo editável */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Sobre este manual</p>
              <EditableText
                value={data.objective}
                onChange={(v) => onChange({ objective: v })}
                as="p"
                multiline
                className="text-sm leading-relaxed text-foreground/80 block"
              />
            </div>

            {/* Benefícios fixos */}
            <div className="flex flex-col gap-4">
              {[
                { icon: '●', label: 'Consistência visual', desc: 'Garante que a marca seja reconhecível em todos os pontos de contato.' },
                { icon: '●', label: 'Agilidade criativa', desc: 'Elimina decisões repetitivas, permitindo focar no que importa.' },
                { icon: '●', label: 'Escalabilidade', desc: 'Facilita a integração de novos membros e parceiros à marca.' },
              ].map((item) => (
                <div key={item.label} className="flex gap-3">
                  <span className="text-primary mt-0.5 text-xs">{item.icon}</span>
                  <div>
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Marca d'água do capítulo */}
          <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">
            01
          </div>
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

  return (
    <PageSlide>
      <div className="h-full flex flex-col gap-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            01 — Introdução
          </p>
          <h2 className="text-2xl font-bold mt-1">Personalidade da Marca</h2>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-6">
          {/* Arquétipo */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Arquétipo</p>
            <div className="flex flex-wrap gap-2">
              {data.archetype.map((adj, i) => (
                <div key={i} className="group flex items-center gap-1 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                  <EditableText
                    value={adj}
                    onChange={(v) => editChip('archetype', i, v)}
                    className="inline text-xs"
                  />
                  <button onClick={() => removeChip('archetype', i)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              <button onClick={() => addChip('archetype')} className="flex items-center gap-1 border border-dashed border-foreground/30 rounded-full px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>

          {/* Valores */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Valores</p>
            <div className="flex flex-col gap-2">
              {data.values.map((v, i) => (
                <div key={i} className="group flex items-center gap-2">
                  <span className="text-primary text-xs">—</span>
                  <EditableText
                    value={v}
                    onChange={(val) => editChip('values', i, val)}
                    className="text-sm flex-1"
                  />
                  <button onClick={() => removeChip('values', i)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
              <button onClick={() => addChip('values')} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Plus className="h-3 w-3" />
                Adicionar valor
              </button>
            </div>
          </div>

          {/* Tom e Vibe */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Tom de comunicação</p>
              <EditableText
                value={data.tone}
                onChange={(v) => onChange({ tone: v })}
                className="text-sm text-foreground/80 block"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Vibe</p>
              <EditableText
                value={data.vibe}
                onChange={(v) => onChange({ vibe: v })}
                as="p"
                className="text-sm italic text-foreground/70 block"
              />
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">
          01
        </div>
      </div>
    </PageSlide>
  );
};

export default IntroPage;
