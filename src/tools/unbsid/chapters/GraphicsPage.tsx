import { BrandData, IconStyleType } from '../types';
import PageSlide from '../components/PageSlide';
import { ManualTheme } from '../themes';
import { Circle, Square, Hexagon, Triangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GraphicsPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  slide: 'visual' | 'icons';
  theme?: ManualTheme;
}

const GraphicsPage = ({ data, onChange, slide, theme }: GraphicsPageProps) => {
  const accent = theme?.accentColor || 'hsl(var(--primary))';

  if (slide === 'visual') {
    return (
      <PageSlide theme={theme}>
        <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">05 — Elementos Gráficos</p>
            <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Linguagem Visual</h2>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-6">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-3">Formas base</p>
              <div className="flex gap-3 items-end">
                {[Circle, Square, Triangle, Hexagon].map((Icon, i) => (
                  <Icon key={i} className="opacity-50" style={{ width: 20 + i * 6, height: 20 + i * 6 }} strokeWidth={data.strokeWidth} />
                ))}
              </div>
              <p className="text-[10px] opacity-40 mt-3">Formas geométricas simples como base do sistema visual.</p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-3">Corner Radius</p>
              <div className="flex gap-2 items-end">
                {[0, data.cornerRadius, data.cornerRadius * 2].map((r) => (
                  <div key={r} className="w-9 h-9 border-2 flex items-end justify-center pb-0.5" style={{ borderRadius: r, borderColor: accent, opacity: 0.35, backgroundColor: accent + '10' }}>
                    <span className="text-[7px] font-mono">{r}px</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[9px] opacity-40">Raio padrão:</span>
                <input type="number" value={data.cornerRadius} onChange={(e) => onChange({ cornerRadius: Number(e.target.value) })} className="w-12 text-[10px] border-b border-foreground/15 bg-transparent outline-none text-center" />
                <span className="text-[9px] opacity-40">px</span>
              </div>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-3">Espessura de Traço</p>
              <div className="flex flex-col gap-2">
                {[1, 1.5, 2, 3].map((w) => (
                  <div key={w} className="flex items-center gap-3">
                    <div className="w-10 rounded-full" style={{ height: w, backgroundColor: 'currentColor', opacity: 0.5 }} />
                    <span className={cn('text-[9px] font-mono', w === data.strokeWidth && 'font-bold')} style={w === data.strokeWidth ? { color: accent } : { opacity: 0.5 }}>
                      {w}px {w === data.strokeWidth && '← padrão'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] opacity-40">Padrão:</span>
                <input type="number" step="0.5" value={data.strokeWidth} onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })} className="w-12 text-[10px] border-b border-foreground/15 bg-transparent outline-none text-center" />
                <span className="text-[9px] opacity-40">px</span>
              </div>
            </div>

            <div className="col-span-3">
              <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-3">Sistema de Espaçamento (base {data.spacingBase}pt)</p>
              <div className="flex gap-1 items-end">
                {[1, 2, 3, 4, 6, 8, 12, 16, 24, 32].map((mult) => {
                  const px = mult * (data.spacingBase / 2);
                  return (
                    <div key={mult} className="flex flex-col items-center gap-1">
                      <div className="w-3 rounded-sm" style={{ height: Math.min(px * 0.8, 80), backgroundColor: accent, opacity: 0.2 }} />
                      <span className="text-[8px] font-mono opacity-40">{px}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>05</div>
        </div>
      </PageSlide>
    );
  }

  const { iconStyle } = data;
  const styles: IconStyleType[] = ['line', 'filled', 'duotone'];

  return (
    <PageSlide theme={theme}>
      <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">05.2 — Elementos Gráficos</p>
          <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Sistema de Ícones</h2>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-2">Estilo</p>
              <div className="flex gap-2">
                {styles.map((s) => (
                  <button key={s} onClick={() => onChange({ iconStyle: { ...iconStyle, style: s } })}
                    className="px-3 py-1 rounded border text-[10px] capitalize transition-colors"
                    style={iconStyle.style === s
                      ? { borderColor: accent, backgroundColor: accent + '15', color: accent }
                      : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Tamanho padrão', field: 'defaultSize', unit: 'px', step: 4 },
                { label: 'Stroke', field: 'strokeWidth', unit: 'px', step: 0.5 },
                { label: 'Grid base', field: 'gridSize', unit: 'px', step: 4 },
              ].map(({ label, field, unit, step }) => (
                <div key={field}>
                  <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-1">{label}</p>
                  <div className="flex items-center gap-1">
                    <input type="number" step={step} value={(iconStyle as unknown as Record<string, number>)[field]} onChange={(e) => onChange({ iconStyle: { ...iconStyle, [field]: Number(e.target.value) } })} className="w-14 text-sm border-b border-foreground/15 bg-transparent outline-none text-center" />
                    <span className="text-[9px] opacity-40">{unit}</span>
                  </div>
                </div>
              ))}
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-1">Canto</p>
                <select value={iconStyle.cornerStyle} onChange={(e) => onChange({ iconStyle: { ...iconStyle, cornerStyle: e.target.value as 'round' | 'square' | 'miter' } })} className="text-[10px] bg-transparent border border-foreground/15 rounded px-1.5 py-1">
                  <option value="round">Round</option>
                  <option value="square">Square</option>
                  <option value="miter">Miter</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-3">Preview</p>
            <div className="flex flex-col gap-3">
              {[16, 20, 24, 32, 48].map((size) => (
                <div key={size} className="flex items-center gap-3">
                  <div className="border border-foreground/15 rounded" style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Circle style={{ width: size * 0.6, height: size * 0.6, opacity: 0.6 }} strokeWidth={iconStyle.strokeWidth} />
                  </div>
                  <span className="text-[9px] font-mono opacity-40">{size}px</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>05</div>
      </div>
    </PageSlide>
  );
};

export default GraphicsPage;
