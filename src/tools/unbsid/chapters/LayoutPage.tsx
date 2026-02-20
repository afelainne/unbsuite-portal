import { BrandData } from '../types';
import PageSlide from '../components/PageSlide';
import { ManualTheme } from '../themes';

interface LayoutPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  slide: 'spacing' | 'grid';
  theme?: ManualTheme;
}

const LayoutPage = ({ data, onChange, slide, theme }: LayoutPageProps) => {
  const accent = theme?.accentColor || 'hsl(var(--primary))';
  const base = data.spacingBase;

  if (slide === 'spacing') {
    const tokens = [0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32].map((m) => ({
      mult: m, px: m * base, token: `${m * base}`,
    }));

    return (
      <PageSlide theme={theme}>
        <div className="h-full flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">06 — Layout & Grid</p>
            <h2 className="text-2xl font-bold mt-1" style={{ fontFamily: theme?.headingFont }}>Sistema de Espaçamento</h2>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-50">Base:</span>
            <div className="flex gap-1">
              {[4, 8].map((b) => (
                <button key={b} onClick={() => onChange({ spacingBase: b as 4 | 8 })}
                  className="px-3 py-1 rounded border text-xs font-mono transition-colors"
                  style={base === b ? { borderColor: accent, backgroundColor: accent + '18', color: accent } : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                  {b}pt
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-2 items-end min-w-max pb-4">
              {tokens.map(({ mult, px, token }) => (
                <div key={mult} className="flex flex-col items-center gap-1">
                  <div className="w-6 rounded-sm" style={{ height: Math.min(px * 1.2, 180), backgroundColor: accent, opacity: 0.25, border: `1px solid ${accent}60` }} />
                  <span className="text-[9px] font-mono opacity-50">{token}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1 text-[10px]">
            {tokens.slice(0, 12).map(({ token, px }) => (
              <div key={token} className="flex items-center gap-1 bg-muted/30 rounded px-2 py-1">
                <div className="rounded-sm w-3" style={{ height: Math.min(px / 4, 16), backgroundColor: accent, opacity: 0.4 }} />
                <span className="font-mono opacity-50">{token}px</span>
              </div>
            ))}
          </div>

          <div className="absolute bottom-8 right-10 text-[80px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.04 }}>06</div>
        </div>
      </PageSlide>
    );
  }

  // slide === 'grid' — breakpoints editáveis
  const breakpoints = data.gridBreakpoints ?? [
    { label: 'Mobile', cols: 4, gutter: 16, margin: 16, width: '375px' },
    { label: 'Tablet', cols: 8, gutter: 20, margin: 24, width: '768px' },
    { label: 'Desktop', cols: 12, gutter: 24, margin: 48, width: '1440px' },
  ];

  const updateBp = (i: number, field: string, value: string | number) => {
    const updated = breakpoints.map((bp, idx) => idx === i ? { ...bp, [field]: value } : bp);
    onChange({ gridBreakpoints: updated });
  };

  return (
    <PageSlide theme={theme}>
      <div className="h-full flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">06.2 — Layout & Grid</p>
          <h2 className="text-2xl font-bold mt-1" style={{ fontFamily: theme?.headingFont }}>Grid Responsivo</h2>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-5">
          {breakpoints.map((bp, i) => (
            <div key={bp.label} className="flex flex-col gap-2">
              <input
                value={bp.label}
                onChange={(e) => updateBp(i, 'label', e.target.value)}
                className="text-xs font-semibold bg-transparent border-b border-transparent hover:border-foreground/20 focus:border-foreground/40 outline-none pb-0.5 w-full"
              />
              <input
                value={bp.width}
                onChange={(e) => updateBp(i, 'width', e.target.value)}
                className="text-[10px] font-mono opacity-50 bg-transparent border-b border-transparent hover:border-foreground/20 outline-none w-full"
              />

              {/* Visual grid */}
              <div className="border border-foreground/10 rounded-lg overflow-hidden bg-muted/10 p-2 flex-1">
                <div className="w-full h-full" style={{ display: 'grid', gridTemplateColumns: `repeat(${bp.cols}, 1fr)`, gap: 2 }}>
                  {Array.from({ length: bp.cols }).map((_, ci) => (
                    <div key={ci} className="rounded-sm" style={{ backgroundColor: accent, height: 80, opacity: 0.15 }} />
                  ))}
                </div>
              </div>

              {/* Editable stats */}
              <div className="space-y-1 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="opacity-50 w-16">Colunas</span>
                  <input type="number" value={bp.cols} min={1} max={24} onChange={(e) => updateBp(i, 'cols', Number(e.target.value))} className="w-12 bg-transparent border-b border-foreground/20 outline-none font-semibold text-xs" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="opacity-50 w-16">Gutter</span>
                  <input type="number" value={bp.gutter} onChange={(e) => updateBp(i, 'gutter', Number(e.target.value))} className="w-12 bg-transparent border-b border-foreground/20 outline-none font-semibold text-xs" />
                  <span className="opacity-40">px</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="opacity-50 w-16">Margem</span>
                  <input type="number" value={bp.margin} onChange={(e) => updateBp(i, 'margin', Number(e.target.value))} className="w-12 bg-transparent border-b border-foreground/20 outline-none font-semibold text-xs" />
                  <span className="opacity-40">px</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-8 right-10 text-[80px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.04 }}>06</div>
      </div>
    </PageSlide>
  );
};

export default LayoutPage;
