import { BrandData, ColorEntry, NeutralEntry, GradientEntry } from '../types';
import PageSlide from '../components/PageSlide';
import { ColorEntryCard, AddColorButton } from '../components/ColorEntryCard';
import { contrastRatio } from '../../unbstype/constants';
import { hexToRgb, rgbToHsl } from '../../unbscolor/utils/colorMath';
import { cn } from '@/lib/utils';

interface ColorsPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  slide: 'palette' | 'neutrals' | 'a11y' | 'gradients';
}

const ColorsPage = ({ data, onChange, slide }: ColorsPageProps) => {
  // ── Paleta principal ────────────────────────────────────────────
  if (slide === 'palette') {
    return (
      <PageSlide>
        <div className="h-full flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">03 — Cores</p>
            <h2 className="text-2xl font-bold mt-1">Paleta Principal</h2>
          </div>
          <div className="flex-1 grid grid-cols-4 gap-3 content-start">
            {data.palette.map((c) => (
              <ColorEntryCard
                key={c.id}
                entry={c}
                onChange={(updated) => onChange({ palette: data.palette.map((p) => (p.id === updated.id ? updated : p)) })}
                onRemove={() => onChange({ palette: data.palette.filter((p) => p.id !== c.id) })}
              />
            ))}
            <AddColorButton
              onAdd={(entry) => onChange({ palette: [...data.palette, entry] })}
            />
          </div>
          <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">03</div>
        </div>
      </PageSlide>
    );
  }

  // ── Neutros ─────────────────────────────────────────────────────
  if (slide === 'neutrals') {
    return (
      <PageSlide>
        <div className="h-full flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">03.2 — Cores</p>
            <h2 className="text-2xl font-bold mt-1">Paleta de Neutros</h2>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            {/* Escala de neutros */}
            <div className="flex gap-1 flex-1">
              {data.neutrals.map((n, i) => {
                const rgb = hexToRgb(n.hex);
                const luminance = rgb ? (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255 : 0.5;
                const textColor = luminance > 0.5 ? '#1a1a1a' : '#ffffff';
                return (
                  <div
                    key={n.id}
                    className="flex-1 rounded-lg flex flex-col justify-end p-2 cursor-pointer"
                    style={{ backgroundColor: n.hex, minHeight: 120 }}
                  >
                    <label className="cursor-pointer">
                      <p className="text-[10px] font-mono" style={{ color: textColor }}>{n.label}</p>
                      <p className="text-[9px] font-mono opacity-60" style={{ color: textColor }}>{n.hex}</p>
                      <input
                        type="color"
                        value={n.hex}
                        onChange={(e) => {
                          const updated = data.neutrals.map((x) =>
                            x.id === n.id ? { ...x, hex: e.target.value.toUpperCase() } : x
                          );
                          onChange({ neutrals: updated });
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <p>Use tons escuros para texto principal e fundos dark. Tons médios para bordas e divisores.</p>
              <p>Tons claros para fundos e superfícies. Branco para máximo contraste e espaço em branco.</p>
            </div>
          </div>
          <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">03</div>
        </div>
      </PageSlide>
    );
  }

  // ── A11y ────────────────────────────────────────────────────────
  if (slide === 'a11y') {
    const allColors = [...data.palette, ...data.neutrals.map((n) => ({ ...n, role: 'neutral' as const, name: `Neutro ${n.label}`, usageNote: '' }))];

    const getStatus = (ratio: number): { label: string; color: string } => {
      if (ratio >= 7) return { label: 'AAA', color: '#22c55e' };
      if (ratio >= 4.5) return { label: 'AA', color: '#84cc16' };
      if (ratio >= 3) return { label: 'AA Large', color: '#f59e0b' };
      return { label: 'Evitar', color: '#ef4444' };
    };

    // Pares relevantes da paleta vs neutros (branco e preto)
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
      <PageSlide>
        <div className="h-full flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">03.3 — Cores</p>
            <h2 className="text-2xl font-bold mt-1">Contraste & Acessibilidade</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="text-left py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-normal">Cor de texto</th>
                  {bgColors.map((bg) => (
                    <th key={bg.id} className="py-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-normal">
                      Fundo {bg.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.palette.map((c) => {
                  return (
                    <tr key={c.id} className="border-b border-foreground/5">
                      <td className="py-2 flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm border border-foreground/10" style={{ backgroundColor: c.hex }} />
                        <span className="font-medium">{c.name}</span>
                        <span className="font-mono text-muted-foreground">{c.hex}</span>
                      </td>
                      {bgColors.map((bg) => {
                        const ratio = contrastRatio(c.hex, bg.hex);
                        const status = getStatus(ratio);
                        return (
                          <td key={bg.id} className="py-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className="inline-block px-2 py-0.5 rounded text-[9px] font-bold text-white"
                                style={{ backgroundColor: status.color }}
                              >
                                {status.label}
                              </span>
                              <span className="text-[9px] text-muted-foreground">{ratio.toFixed(1)}:1</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-4 text-[10px] text-muted-foreground">
            <span><span className="font-bold text-foreground">AA</span> ≥ 4.5:1 (texto normal)</span>
            <span><span className="font-bold text-foreground">AA Large</span> ≥ 3:1 (texto grande)</span>
            <span><span className="font-bold text-foreground">AAA</span> ≥ 7:1 (ótimo)</span>
          </div>
          <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">03</div>
        </div>
      </PageSlide>
    );
  }

  // ── Gradientes ──────────────────────────────────────────────────
  return (
    <PageSlide>
      <div className="h-full flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">03.4 — Cores</p>
          <h2 className="text-2xl font-bold mt-1">Gradientes</h2>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-4">
          {data.gradients.map((g) => {
            const cssGrad = `linear-gradient(${g.angle}deg, ${g.stops.map((s) => `${s.hex} ${s.position}%`).join(', ')})`;
            return (
              <div key={g.id} className="rounded-lg overflow-hidden border border-foreground/10">
                <div className="h-24" style={{ background: cssGrad }} />
                <div className="p-3 space-y-1 text-xs">
                  <p className="font-semibold">{g.name}</p>
                  <p className="font-mono text-muted-foreground text-[10px]">{g.angle}°</p>
                  <div className="flex gap-2">
                    {g.stops.map((s, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm border border-foreground/10" style={{ backgroundColor: s.hex }} />
                        <span className="font-mono text-[9px] text-muted-foreground">{s.hex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {/* Add gradient */}
          <button
            onClick={() => {
              const id = `g${Date.now()}`;
              onChange({
                gradients: [...data.gradients, {
                  id, name: 'Novo Gradiente', angle: 90,
                  stops: [{ hex: '#6366F1', position: 0 }, { hex: '#EC4899', position: 100 }],
                }],
              });
            }}
            className="rounded-lg border-2 border-dashed border-foreground/20 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            + Gradiente
          </button>
        </div>
        <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">03</div>
      </div>
    </PageSlide>
  );
};

export default ColorsPage;
