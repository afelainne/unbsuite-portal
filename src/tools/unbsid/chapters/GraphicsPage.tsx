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
        <div className="h-full flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">05 — Elementos Gráficos</p>
            <h2 className="text-2xl font-bold mt-1" style={{ fontFamily: theme?.headingFont }}>Linguagem Visual</h2>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-50 mb-3">Formas base</p>
              <div className="flex gap-3 items-end">
                {[Circle, Square, Triangle, Hexagon].map((Icon, i) => (
                  <Icon key={i} className="opacity-60" style={{ width: 24 + i * 8, height: 24 + i * 8, color: theme?.slideTextColor || undefined }} strokeWidth={data.strokeWidth} />
                ))}
              </div>
              <p className="text-[11px] opacity-50 mt-3">Formas geométricas simples como base do sistema visual.</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest opacity-50 mb-3">Corner Radius</p>
              <div className="flex gap-2 items-end">
                {[0, data.cornerRadius, data.cornerRadius * 2].map((r) => (
                  <div key={r} className="w-10 h-10 border-2 flex items-end justify-center pb-0.5" style={{ borderRadius: r, borderColor: 'currentColor', opacity: 0.4, backgroundColor: accent + '10' }}>
                    <span className="text-[8px] font-mono opacity-80">{r}px</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] opacity-50">Raio padrão:</span>
                <input type="number" value={data.cornerRadius} onChange={(e) => onChange({ cornerRadius: Number(e.target.value) })} className="w-14 text-xs border-b border-foreground/20 bg-transparent outline-none text-center" />
                <span className="text-[10px] opacity-50">px</span>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest opacity-50 mb-3">Espessura de Traço</p>
              <div className="flex flex-col gap-2">
                {[1, 1.5, 2, 3].map((w) => (
                  <div key={w} className="flex items-center gap-3">
                    <div className="w-12 rounded-full" style={{ height: w, backgroundColor: theme?.slideTextColor || '#111', opacity: 0.6 }} />
                    <span className={cn('text-[10px] font-mono', w === data.strokeWidth && 'font-bold')} style={w === data.strokeWidth ? { color: accent } : {}}>
                      {w}px {w === data.strokeWidth && '← padrão'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] opacity-50">Stroke padrão:</span>
                <input type="number" step="0.5" value={data.strokeWidth} onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })} className="w-14 text-xs border-b border-foreground/20 bg-transparent outline-none text-center" />
                <span className="text-[10px] opacity-50">px</span>
              </div>
            </div>

            <div className="col-span-3">
              <p className="text-xs uppercase tracking-widest opacity-50 mb-3">Sistema de Espaçamento (base {data.spacingBase}pt)</p>
              <div className="flex gap-1 items-end">
                {[1, 2, 3, 4, 6, 8, 12, 16, 24, 32].map((mult) => {
                  const px = mult * (data.spacingBase / 2);
                  return (
                    <div key={mult} className="flex flex-col items-center gap-1">
                      <div className="w-3 rounded-sm" style={{ height: px, backgroundColor: accent, opacity: 0.25 }} />
                      <span className="text-[8px] font-mono opacity-50">{px}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 right-10 text-[80px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.04 }}>05</div>
        </div>
      </PageSlide>
    );
  }

  const { iconStyle } = data;
  const styles: IconStyleType[] = ['line', 'filled', 'duotone'];

  return (
    <PageSlide theme={theme}>
      <div className="h-full flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">05.2 — Elementos Gráficos</p>
          <h2 className="text-2xl font-bold mt-1" style={{ fontFamily: theme?.headingFont }}>Sistema de Ícones</h2>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-50 mb-2">Estilo</p>
              <div className="flex gap-2">
                {styles.map((s) => (
                  <button key={s} onClick={() => onChange({ iconStyle: { ...iconStyle, style: s } })}
                    className="px-3 py-1.5 rounded border text-xs capitalize transition-colors"
                    style={iconStyle.style === s ? { borderColor: accent, backgroundColor: accent + '18', color: accent } : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
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
                  <p className="text-[10px] uppercase tracking-wider opacity-50 mb-1">{label}</p>
                  <div className="flex items-center gap-1">
                    <input type="number" step={step} value={(iconStyle as unknown as Record<string, number>)[field]} onChange={(e) => onChange({ iconStyle: { ...iconStyle, [field]: Number(e.target.value) } })} className="w-16 text-sm border-b border-foreground/20 bg-transparent outline-none text-center" />
                    <span className="text-[10px] opacity-50">{unit}</span>
                  </div>
                </div>
              ))}
              <div>
                <p className="text-[10px] uppercase tracking-wider opacity-50 mb-1">Canto</p>
                <select value={iconStyle.cornerStyle} onChange={(e) => onChange({ iconStyle: { ...iconStyle, cornerStyle: e.target.value as 'round' | 'square' | 'miter' } })} className="text-xs bg-transparent border border-foreground/20 rounded px-2 py-1">
                  <option value="round">Round</option>
                  <option value="square">Square</option>
                  <option value="miter">Miter</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider opacity-50 mb-3">Preview</p>
            <div className="flex flex-col gap-3">
              {[16, 20, 24, 32, 48].map((size) => (
                <div key={size} className="flex items-center gap-3">
                  <div className="border border-foreground/20 rounded" style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Circle style={{ width: size * 0.6, height: size * 0.6, opacity: 0.7 }} strokeWidth={iconStyle.strokeWidth} />
                  </div>
                  <span className="text-[10px] font-mono opacity-50">{size}px</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 right-10 text-[80px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.04 }}>05</div>
      </div>
    </PageSlide>
  );
};

export default GraphicsPage;
