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
        <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">06 — Layout & Grid</p>
            <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Sistema de Espaçamento</h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[9px] opacity-40">Base:</span>
            <div className="flex gap-1">
              {[4, 8].map((b) => (
                <button key={b} onClick={() => onChange({ spacingBase: b as 4 | 8 })}
                  className="px-3 py-1 rounded border text-[10px] font-mono transition-colors"
                  style={base === b
                    ? { borderColor: accent, backgroundColor: accent + '15', color: accent }
                    : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                  {b}pt
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-2 items-end h-full pb-4">
              {tokens.map(({ mult, px, token }) => (
                <div key={mult} className="flex flex-col items-center gap-1">
                  <div className="w-5 rounded-sm" style={{ height: Math.min(px * 1.0, 140), backgroundColor: accent, opacity: 0.2, border: `1px solid ${accent}50` }} />
                  <span className="text-[8px] font-mono opacity-40">{token}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1">
            {tokens.slice(0, 12).map(({ token, px }) => (
              <div key={token} className="flex items-center gap-1 bg-muted/20 rounded px-1.5 py-1">
                <div className="rounded-sm w-2.5" style={{ height: Math.min(px / 4, 12), backgroundColor: accent, opacity: 0.35 }} />
                <span className="font-mono opacity-40 text-[9px]">{token}px</span>
              </div>
            ))}
          </div>

          <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>06</div>
        </div>
      </PageSlide>
    );
  }

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
      <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">06.2 — Layout & Grid</p>
          <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Grid Responsivo</h2>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-5">
          {breakpoints.map((bp, i) => (
            <div key={bp.label} className="flex flex-col gap-2">
              <input
                value={bp.label}
                onChange={(e) => updateBp(i, 'label', e.target.value)}
                className="text-[11px] font-semibold bg-transparent border-b border-transparent hover:border-foreground/15 focus:border-foreground/30 outline-none pb-0.5 w-full"
              />
              <input
                value={bp.width}
                onChange={(e) => updateBp(i, 'width', e.target.value)}
                className="text-[9px] font-mono opacity-40 bg-transparent border-b border-transparent hover:border-foreground/15 outline-none w-full"
              />

              {/* Visual grid */}
              <div className="border border-foreground/8 rounded overflow-hidden bg-muted/10 p-2 flex-1">
                <div className="w-full h-full" style={{ display: 'grid', gridTemplateColumns: `repeat(${bp.cols}, 1fr)`, gap: 2 }}>
                  {Array.from({ length: bp.cols }).map((_, ci) => (
                    <div key={ci} className="rounded-sm" style={{ backgroundColor: accent, height: 60, opacity: 0.12 }} />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                {[
                  { label: 'Colunas', field: 'cols', type: 'number', min: 1, max: 24 },
                  { label: 'Gutter', field: 'gutter', type: 'number', unit: 'px' },
                  { label: 'Margem', field: 'margin', type: 'number', unit: 'px' },
                ].map(({ label, field, unit, min, max }) => (
                  <div key={field} className="flex items-center gap-2 text-[9px]">
                    <span className="opacity-40 w-14">{label}</span>
                    <input
                      type="number"
                      value={(bp as Record<string, unknown>)[field] as number}
                      min={min}
                      max={max}
                      onChange={(e) => updateBp(i, field, Number(e.target.value))}
                      className="w-10 bg-transparent border-b border-foreground/15 outline-none font-semibold text-[10px]"
                    />
                    {unit && <span className="opacity-30">{unit}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>06</div>
      </div>
    </PageSlide>
  );
};

export default LayoutPage;
