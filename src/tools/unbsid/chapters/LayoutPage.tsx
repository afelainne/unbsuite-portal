import { BrandData } from '../types';
import PageSlide from '../components/PageSlide';
import EditableText from '../components/EditableText';

interface LayoutPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  slide: 'spacing' | 'grid';
}

const LayoutPage = ({ data, onChange, slide }: LayoutPageProps) => {
  if (slide === 'spacing') {
    const base = data.spacingBase;
    const tokens = [0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32].map((m) => ({
      mult: m,
      px: m * base,
      token: `${m * base}`,
    }));

    return (
      <PageSlide>
        <div className="h-full flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">06 — Layout & Grid</p>
            <h2 className="text-2xl font-bold mt-1">Sistema de Espaçamento</h2>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Base:</span>
            <div className="flex gap-1">
              {[4, 8].map((b) => (
                <button
                  key={b}
                  onClick={() => onChange({ spacingBase: b as 4 | 8 })}
                  className={`px-3 py-1 rounded border text-xs font-mono ${base === b ? 'border-primary bg-primary/10 text-primary' : 'border-foreground/20 text-muted-foreground'}`}
                >
                  {b}pt
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-2 items-end min-w-max pb-4">
              {tokens.map(({ mult, px, token }) => (
                <div key={mult} className="flex flex-col items-center gap-1">
                  <div
                    className="bg-primary/20 border border-primary/30 w-6 rounded-sm"
                    style={{ height: Math.min(px * 1.2, 180) }}
                  />
                  <span className="text-[9px] font-mono text-foreground/60 rotate-0">{token}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tokens table */}
          <div className="grid grid-cols-6 gap-1 text-[10px]">
            {tokens.slice(0, 12).map(({ token, px }) => (
              <div key={token} className="flex items-center gap-1 bg-muted/30 rounded px-2 py-1">
                <div className="bg-primary/40 rounded-sm w-3" style={{ height: Math.min(px / 4, 16) }} />
                <span className="font-mono text-muted-foreground">{token}px</span>
              </div>
            ))}
          </div>

          <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">06</div>
        </div>
      </PageSlide>
    );
  }

  // slide === 'grid'
  const breakpoints = [
    { label: 'Mobile', cols: 4, gutter: 16, margin: 16, width: '375px' },
    { label: 'Tablet', cols: 8, gutter: 20, margin: 24, width: '768px' },
    { label: 'Desktop', cols: 12, gutter: 24, margin: 48, width: '1440px' },
  ];

  return (
    <PageSlide>
      <div className="h-full flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">06.2 — Layout & Grid</p>
          <h2 className="text-2xl font-bold mt-1">Grid Responsivo</h2>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-5">
          {breakpoints.map((bp) => (
            <div key={bp.label} className="flex flex-col gap-2">
              <p className="text-xs font-semibold">{bp.label}</p>
              <p className="text-[10px] font-mono text-muted-foreground">{bp.width}</p>

              {/* Visual grid */}
              <div className="border border-foreground/10 rounded-lg overflow-hidden bg-muted/10 p-2 flex-1">
                <div
                  className="w-full h-full"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${bp.cols}, 1fr)`,
                    gap: 2,
                  }}
                >
                  {Array.from({ length: bp.cols }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-sm opacity-50"
                      style={{
                        backgroundColor: `hsl(var(--primary))`,
                        height: 80,
                        opacity: 0.15,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-0.5 text-[10px] text-muted-foreground">
                <p><span className="font-semibold text-foreground">{bp.cols}</span> colunas</p>
                <p><span className="font-semibold text-foreground">{bp.gutter}px</span> gutter</p>
                <p><span className="font-semibold text-foreground">{bp.margin}px</span> margin</p>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">06</div>
      </div>
    </PageSlide>
  );
};

export default LayoutPage;
