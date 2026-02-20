import { BrandData, ColorEntry, NeutralEntry } from '../types';
import PageSlide from '../components/PageSlide';
import { ColorEntryCard, AddColorButton } from '../components/ColorEntryCard';
import { contrastRatio } from '../../unbstype/constants';
import { hexToRgb } from '../../unbscolor/utils/colorMath';
import { ManualTheme } from '../themes';
import { Plus, Minus } from 'lucide-react';

interface ColorsPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  slide: 'palette' | 'neutrals' | 'a11y' | 'gradients';
  theme?: ManualTheme;
}

const ColorsPage = ({ data, onChange, slide, theme }: ColorsPageProps) => {
  const accent = theme?.accentColor || 'hsl(var(--primary))';

  if (slide === 'palette') {
    return (
      <PageSlide theme={theme}>
        <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">03 — Cores</p>
            <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Paleta Principal</h2>
          </div>
          <div className="flex-1 grid grid-cols-4 gap-3 content-start overflow-hidden">
            {data.palette.map((c) => (
              <ColorEntryCard
                key={c.id}
                entry={c}
                onChange={(updated) => onChange({ palette: data.palette.map((p) => (p.id === updated.id ? updated : p)) })}
                onRemove={() => onChange({ palette: data.palette.filter((p) => p.id !== c.id) })}
              />
            ))}
            <AddColorButton onAdd={(entry) => onChange({ palette: [...data.palette, entry] })} />
          </div>
          <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>03</div>
        </div>
      </PageSlide>
    );
  }

  if (slide === 'neutrals') {
    const addNeutral = () => {
      const newId = `n${Date.now()}`;
      const newNeutral: NeutralEntry = { id: newId, hex: '#888888', label: String(data.neutrals.length * 100) };
      onChange({ neutrals: [...data.neutrals, newNeutral] });
    };
    const removeNeutral = (id: string) => {
      if (data.neutrals.length <= 2) return;
      onChange({ neutrals: data.neutrals.filter((n) => n.id !== id) });
    };

    return (
      <PageSlide theme={theme}>
        <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">03.2 — Cores</p>
              <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Paleta de Neutros</h2>
            </div>
            <div className="flex gap-1">
              <button onClick={() => removeNeutral(data.neutrals[data.neutrals.length - 1]?.id)} className="p-1 rounded border border-foreground/15 hover:border-destructive hover:text-destructive transition-colors" title="Remover último tom">
                <Minus className="h-3 w-3" />
              </button>
              <button onClick={addNeutral} className="p-1 rounded border border-foreground/15 hover:border-primary hover:text-primary transition-colors" title="Adicionar tom">
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <div className="flex gap-1.5 flex-1">
              {data.neutrals.map((n) => {
                const rgb = hexToRgb(n.hex);
                const luminance = rgb ? (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255 : 0.5;
                const textColor = luminance > 0.5 ? '#1a1a1a' : '#ffffff';
                return (
                  <div key={n.id} className="flex-1 rounded flex flex-col justify-end p-2 cursor-pointer" style={{ backgroundColor: n.hex }}>
                    <label className="cursor-pointer">
                      <p className="text-[10px] font-mono" style={{ color: textColor }}>{n.label}</p>
                      <p className="text-[9px] font-mono" style={{ color: textColor, opacity: 0.5 }}>{n.hex}</p>
                      <input
                        type="color"
                        value={n.hex}
                        onChange={(e) => {
                          const updated = data.neutrals.map((x) => x.id === n.id ? { ...x, hex: e.target.value.toUpperCase() } : x);
                          onChange({ neutrals: updated });
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-4 text-[10px] opacity-40">
              <p>Tons escuros para texto principal e fundos dark. Tons médios para bordas.</p>
              <p>Tons claros para fundos e superfícies. Branco para máximo contraste.</p>
            </div>
          </div>
          <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>03</div>
        </div>
      </PageSlide>
    );
  }

  if (slide === 'a11y') {
    const getStatus = (ratio: number): { label: string; color: string } => {
      if (ratio >= 7) return { label: 'AAA', color: '#22c55e' };
      if (ratio >= 4.5) return { label: 'AA', color: '#84cc16' };
      if (ratio >= 3) return { label: 'AA Large', color: '#f59e0b' };
      return { label: 'Evitar', color: '#ef4444' };
    };

    const whites = data.neutrals.filter((n) => {
      const rgb = hexToRgb(n.hex);
      return rgb ? (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255 > 0.85 : false;
    });
    const darks = data.neutrals.filter((n) => {
      const rgb = hexToRgb(n.hex);
      return rgb ? (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255 < 0.2 : false;
    });

    const bgColors = [
      ...(whites.length ? [whites[whites.length - 1]] : [{ id: 'white', hex: '#FFFFFF', label: 'Branco' }]),
      ...(darks.length ? [darks[0]] : [{ id: 'black', hex: '#0F0F0F', label: 'Preto' }]),
    ];

    return (
      <PageSlide theme={theme}>
        <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">03.3 — Cores</p>
            <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Contraste & Acessibilidade</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-foreground/8">
                  <th className="text-left py-2 text-[9px] uppercase tracking-[0.2em] opacity-40 font-normal">Cor de texto</th>
                  {bgColors.map((bg) => (
                    <th key={bg.id} className="py-2 text-center text-[9px] uppercase tracking-[0.2em] opacity-40 font-normal">Fundo {bg.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.palette.map((c) => (
                  <tr key={c.id} className="border-b border-foreground/5">
                    <td className="py-2 flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-sm border border-foreground/10" style={{ backgroundColor: c.hex }} />
                      <span className="font-medium text-[11px]">{c.name}</span>
                      <span className="font-mono opacity-40 text-[10px]">{c.hex}</span>
                    </td>
                    {bgColors.map((bg) => {
                      const ratio = contrastRatio(c.hex, bg.hex);
                      const status = getStatus(ratio);
                      return (
                        <td key={bg.id} className="py-2 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold text-white" style={{ backgroundColor: status.color }}>{status.label}</span>
                            <span className="text-[9px] opacity-40">{ratio.toFixed(1)}:1</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-4 text-[9px] opacity-40">
            <span><strong className="opacity-80">AA</strong> ≥ 4.5:1</span>
            <span><strong className="opacity-80">AA Large</strong> ≥ 3:1</span>
            <span><strong className="opacity-80">AAA</strong> ≥ 7:1</span>
          </div>
          <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>03</div>
        </div>
      </PageSlide>
    );
  }

  // Gradientes
  return (
    <PageSlide theme={theme}>
      <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">03.4 — Cores</p>
          <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Gradientes</h2>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-3 content-start overflow-hidden">
          {data.gradients.map((g) => {
            const cssGrad = `linear-gradient(${g.angle}deg, ${g.stops.map((s) => `${s.hex} ${s.position}%`).join(', ')})`;
            return (
              <div key={g.id} className="rounded overflow-hidden border border-foreground/8">
                <div className="h-16" style={{ background: cssGrad }} />
                <div className="p-2.5 space-y-2">
                  <input
                    value={g.name}
                    onChange={(e) => onChange({ gradients: data.gradients.map((x) => x.id === g.id ? { ...x, name: e.target.value } : x) })}
                    className="font-semibold w-full bg-transparent border-b border-foreground/8 outline-none pb-0.5 text-[11px]"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] opacity-40 w-10">Ângulo</span>
                    <input
                      type="number" value={g.angle} min={0} max={360}
                      onChange={(e) => onChange({ gradients: data.gradients.map((x) => x.id === g.id ? { ...x, angle: Number(e.target.value) } : x) })}
                      className="w-14 bg-transparent border-b border-foreground/15 outline-none text-[10px] font-mono"
                    />
                    <span className="text-[9px] opacity-40">°</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {g.stops.map((s, si) => (
                      <div key={si} className="flex items-center gap-1">
                        <label className="cursor-pointer">
                          <div className="w-4 h-4 rounded border border-foreground/15" style={{ backgroundColor: s.hex }} />
                          <input type="color" value={s.hex}
                            onChange={(e) => {
                              const stops = g.stops.map((stop, idx) => idx === si ? { ...stop, hex: e.target.value.toUpperCase() } : stop);
                              onChange({ gradients: data.gradients.map((x) => x.id === g.id ? { ...x, stops } : x) });
                            }}
                            className="sr-only"
                          />
                        </label>
                        <input type="number" value={s.position} min={0} max={100}
                          onChange={(e) => {
                            const stops = g.stops.map((stop, idx) => idx === si ? { ...stop, position: Number(e.target.value) } : stop);
                            onChange({ gradients: data.gradients.map((x) => x.id === g.id ? { ...x, stops } : x) });
                          }}
                          className="w-9 bg-transparent border-b border-foreground/15 outline-none text-[9px] font-mono"
                        />
                        <span className="text-[8px] opacity-30">%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          <button
            onClick={() => {
              const id = `g${Date.now()}`;
              onChange({ gradients: [...data.gradients, { id, name: 'Novo Gradiente', angle: 90, stops: [{ hex: '#6366F1', position: 0 }, { hex: '#EC4899', position: 100 }] }] });
            }}
            className="rounded border-2 border-dashed border-foreground/15 flex items-center justify-center opacity-40 hover:opacity-70 transition-opacity text-xs h-full min-h-[120px]"
            style={{ color: accent }}
          >
            + Gradiente
          </button>
        </div>
        <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>03</div>
      </div>
    </PageSlide>
  );
};

export default ColorsPage;
