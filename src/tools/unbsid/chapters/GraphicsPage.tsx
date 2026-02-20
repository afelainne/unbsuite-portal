import { BrandData, IconStyleType } from '../types';
import PageSlide from '../components/PageSlide';
import { Circle, Square, Hexagon, Triangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GraphicsPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  slide: 'visual' | 'icons';
}

const GraphicsPage = ({ data, onChange, slide }: GraphicsPageProps) => {
  if (slide === 'visual') {
    const radii = [0, 4, 8, 12, 16, 24, 999];
    return (
      <PageSlide>
        <div className="h-full flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">05 — Elementos Gráficos</p>
            <h2 className="text-2xl font-bold mt-1">Linguagem Visual</h2>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-6">
            {/* Formas base */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Formas base</p>
              <div className="flex gap-3 items-end">
                {[Circle, Square, Triangle, Hexagon].map((Icon, i) => (
                  <Icon key={i} className="text-foreground/60" style={{ width: 24 + i * 8, height: 24 + i * 8 }} strokeWidth={data.strokeWidth} />
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">Formas geométricas simples como base do sistema visual.</p>
            </div>

            {/* Corner radius */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Corner Radius</p>
              <div className="flex gap-2 items-end">
                {[0, data.cornerRadius, data.cornerRadius * 2].map((r) => (
                  <div
                    key={r}
                    className="w-10 h-10 border-2 border-foreground/40 bg-foreground/5 flex items-end justify-center pb-0.5"
                    style={{ borderRadius: r }}
                  >
                    <span className="text-[8px] font-mono text-muted-foreground">{r}px</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] text-muted-foreground">Raio padrão:</span>
                <input
                  type="number"
                  value={data.cornerRadius}
                  onChange={(e) => onChange({ cornerRadius: Number(e.target.value) })}
                  className="w-14 text-xs border-b border-foreground/20 bg-transparent outline-none text-center"
                />
                <span className="text-[10px] text-muted-foreground">px</span>
              </div>
            </div>

            {/* Stroke */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Espessura de Traço</p>
              <div className="flex flex-col gap-2">
                {[1, 1.5, 2, 3].map((w) => (
                  <div key={w} className="flex items-center gap-3">
                    <div className="w-12 bg-foreground/60 rounded-full" style={{ height: w }} />
                    <span className={cn('text-[10px] font-mono', w === data.strokeWidth && 'text-primary font-bold')}>
                      {w}px {w === data.strokeWidth && '← padrão'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-muted-foreground">Stroke padrão:</span>
                <input
                  type="number"
                  step="0.5"
                  value={data.strokeWidth}
                  onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })}
                  className="w-14 text-xs border-b border-foreground/20 bg-transparent outline-none text-center"
                />
                <span className="text-[10px] text-muted-foreground">px</span>
              </div>
            </div>

            {/* Espaçamento base */}
            <div className="col-span-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Sistema de Espaçamento (base {data.spacingBase}pt)</p>
              <div className="flex gap-1 items-end">
                {[1, 2, 3, 4, 6, 8, 12, 16, 24, 32].map((mult) => {
                  const px = mult * (data.spacingBase / 2);
                  return (
                    <div key={mult} className="flex flex-col items-center gap-1">
                      <div className="bg-primary/20 border border-primary/30 w-3" style={{ height: px }} />
                      <span className="text-[8px] font-mono text-muted-foreground">{px}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">05</div>
        </div>
      </PageSlide>
    );
  }

  // slide === 'icons'
  const { iconStyle } = data;
  const styles: IconStyleType[] = ['line', 'filled', 'duotone'];

  return (
    <PageSlide>
      <div className="h-full flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">05.2 — Elementos Gráficos</p>
          <h2 className="text-2xl font-bold mt-1">Sistema de Ícones</h2>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-8">
          {/* Configuração */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Estilo</p>
              <div className="flex gap-2">
                {styles.map((s) => (
                  <button
                    key={s}
                    onClick={() => onChange({ iconStyle: { ...iconStyle, style: s } })}
                    className={cn(
                      'px-3 py-1.5 rounded border text-xs capitalize transition-colors',
                      iconStyle.style === s
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-foreground/20 text-muted-foreground hover:border-foreground/40'
                    )}
                  >
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
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step={step}
                      value={(iconStyle as unknown as Record<string, number>)[field]}
                      onChange={(e) => onChange({ iconStyle: { ...iconStyle, [field]: Number(e.target.value) } })}
                      className="w-16 text-sm border-b border-foreground/20 bg-transparent outline-none text-center"
                    />
                    <span className="text-[10px] text-muted-foreground">{unit}</span>
                  </div>
                </div>
              ))}

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Canto</p>
                <select
                  value={iconStyle.cornerStyle}
                  onChange={(e) => onChange({ iconStyle: { ...iconStyle, cornerStyle: e.target.value as 'round' | 'square' | 'miter' } })}
                  className="text-xs bg-transparent border border-foreground/20 rounded px-2 py-1"
                >
                  <option value="round">Round</option>
                  <option value="square">Square</option>
                  <option value="miter">Miter</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preview de ícones em diferentes tamanhos */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Preview</p>
            <div className="flex flex-col gap-3">
              {[16, 20, 24, 32, 48].map((size) => (
                <div key={size} className="flex items-center gap-3">
                  <div
                    className="border border-foreground/20 rounded"
                    style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Circle
                      style={{ width: size * 0.6, height: size * 0.6 }}
                      strokeWidth={iconStyle.strokeWidth}
                      className="text-foreground/70"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{size}px</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">05</div>
      </div>
    </PageSlide>
  );
};

export default GraphicsPage;
