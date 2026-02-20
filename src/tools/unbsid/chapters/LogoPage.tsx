import { useRef } from 'react';
import { BrandData, LogoVariant, LogoVariantType } from '../types';
import PageSlide from '../components/PageSlide';
import EditableText from '../components/EditableText';
import { Upload } from 'lucide-react';

interface LogoPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  slide: 'gallery' | 'grid' | 'clearspace' | 'minsize' | 'donts';
}

// ── Galeria de variações ───────────────────────────────────────────────────────
const VariantCard = ({
  variant,
  onUpload,
}: {
  variant: LogoVariant;
  onUpload: (v: LogoVariant) => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const isDark = variant.type === 'negative';

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (file.name.endsWith('.svg')) {
        onUpload({ ...variant, svgContent: url, dataUrl: url, fileName: file.name });
      } else {
        onUpload({ ...variant, dataUrl: url, fileName: file.name });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="rounded-lg border border-foreground/10 overflow-hidden group cursor-pointer"
      style={{ background: isDark ? '#111' : '#fafafa' }}
      onClick={() => ref.current?.click()}
      title="Clique para fazer upload"
    >
      <div className="h-20 flex items-center justify-center p-4 relative">
        {variant.dataUrl ? (
          <img
            src={variant.dataUrl}
            alt={variant.label}
            className="max-h-full max-w-full object-contain"
            style={{ filter: variant.type === 'mono' ? 'grayscale(100%)' : undefined }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-20 group-hover:opacity-50 transition-opacity" style={{ color: isDark ? '#fff' : '#000' }}>
            <Upload className="h-4 w-4" />
            <span className="text-[9px]">Upload</span>
          </div>
        )}
        <input ref={ref} type="file" accept="image/svg+xml,image/png,image/jpeg" className="sr-only" onChange={handleFile} />
      </div>
      <div className="px-2 pb-2">
        <p className="text-[10px] font-medium truncate" style={{ color: isDark ? '#aaa' : '#555' }}>
          {variant.label}
        </p>
      </div>
    </div>
  );
};

const LogoPage = ({ data, onChange, slide }: LogoPageProps) => {
  const updateVariant = (updated: LogoVariant) => {
    const variants = data.logoVariants.map((v) => (v.id === updated.id ? updated : v));
    onChange({ logoVariants: variants });
  };

  if (slide === 'gallery') {
    return (
      <PageSlide>
        <div className="h-full flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">02 — Logo</p>
            <h2 className="text-2xl font-bold mt-1">Variações do Logo</h2>
          </div>
          <div className="grid grid-cols-5 gap-3 flex-1">
            {data.logoVariants.map((v) => (
              <VariantCard key={v.id} variant={v} onUpload={updateVariant} />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Cada variação deve ser entregue em SVG e PNG com fundo transparente.
          </p>
          <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">02</div>
        </div>
      </PageSlide>
    );
  }

  if (slide === 'grid') {
    const gr = data.gridRules;
    return (
      <PageSlide>
        <div className="h-full flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">02.2 — Logo</p>
            <h2 className="text-2xl font-bold mt-1">Construção & Grid</h2>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-8">
            {/* Preview do logo com grid overlay */}
            <div className="rounded-lg border border-foreground/10 bg-muted/30 flex items-center justify-center relative overflow-hidden">
              {data.logoVariants[0]?.dataUrl ? (
                <img src={data.logoVariants[0].dataUrl} alt="Logo" className="max-h-32 max-w-full object-contain" />
              ) : (
                <p className="text-xs text-muted-foreground">Faça upload do logo na galeria</p>
              )}
              {/* Grid overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
                  backgroundSize: `${100 / gr.gridUnits}% ${100 / gr.gridUnits}%`,
                }}
              />
            </div>

            {/* Parâmetros editáveis */}
            <div className="flex flex-col gap-4 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Tipo de grid</p>
                <select
                  value={gr.gridType}
                  onChange={(e) => onChange({ gridRules: { ...gr, gridType: e.target.value as typeof gr.gridType } })}
                  className="text-sm bg-transparent border border-foreground/20 rounded px-2 py-1"
                >
                  {['modular', 'baseline', 'circular', 'custom'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Unidades</p>
                <input
                  type="number"
                  value={gr.gridUnits}
                  min={2} max={24}
                  onChange={(e) => onChange({ gridRules: { ...gr, gridUnits: Number(e.target.value) } })}
                  className="text-sm bg-transparent border border-foreground/20 rounded px-2 py-1 w-20"
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Proporções-chave</p>
                <p className="text-sm font-mono">{gr.keyRatios.join(' · ')}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Regras de canto</p>
                <EditableText
                  value={gr.cornerRadiusRules || '—'}
                  onChange={(v) => onChange({ gridRules: { ...gr, cornerRadiusRules: v } })}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">02</div>
        </div>
      </PageSlide>
    );
  }

  if (slide === 'clearspace') {
    return (
      <PageSlide>
        <div className="h-full flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">02.3 — Logo</p>
            <h2 className="text-2xl font-bold mt-1">Área de Proteção</h2>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-8 items-center">
            {/* Visual de clear space */}
            <div className="flex items-center justify-center">
              <div className="relative">
                {/* Clear space zone */}
                <div
                  className="border-2 border-dashed border-primary/40 p-8 flex items-center justify-center"
                >
                  {/* Logo box */}
                  <div className="border border-foreground/20 w-24 h-12 flex items-center justify-center bg-muted/30">
                    {data.logoVariants[0]?.dataUrl ? (
                      <img src={data.logoVariants[0].dataUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">LOGO</span>
                    )}
                  </div>
                </div>
                {/* Labels */}
                <p className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-primary/70">x</p>
                <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-primary/70">x</p>
                <p className="absolute top-1/2 -left-5 -translate-y-1/2 text-[10px] font-mono text-primary/70">x</p>
                <p className="absolute top-1/2 -right-5 -translate-y-1/2 text-[10px] font-mono text-primary/70">x</p>
              </div>
            </div>

            {/* Regras */}
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Regra de espaço mínimo</p>
                <p className="text-sm">Mantenha sempre <strong>x</strong> de espaço livre ao redor do logo.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  onde <strong>x =</strong>{' '}
                  <EditableText
                    value={data.clearSpaceRule}
                    onChange={(v) => onChange({ clearSpaceRule: v })}
                    className="inline text-xs text-primary"
                  />
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-green-500/30 rounded p-3">
                  <p className="text-[10px] text-green-600 font-semibold mb-1">✓ Correto</p>
                  <p className="text-[10px] text-muted-foreground">Logo com espaço de respiro adequado ao redor.</p>
                </div>
                <div className="border border-red-500/30 rounded p-3">
                  <p className="text-[10px] text-red-500 font-semibold mb-1">✗ Incorreto</p>
                  <p className="text-[10px] text-muted-foreground">Elementos muito próximos comprometem a leitura.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">02</div>
        </div>
      </PageSlide>
    );
  }

  if (slide === 'minsize') {
    return (
      <PageSlide>
        <div className="h-full flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">02.4 — Logo</p>
            <h2 className="text-2xl font-bold mt-1">Tamanho Mínimo</h2>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-8 items-center">
            {/* Digital */}
            <div className="flex flex-col gap-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Digital</p>
              <div className="flex items-end gap-3">
                <div
                  className="border border-foreground/20 flex items-center justify-center bg-muted/20"
                  style={{ width: data.minSizeDigital, height: Math.round(data.minSizeDigital * 0.4) }}
                >
                  <span className="text-[8px] font-mono text-muted-foreground">Logo</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={data.minSizeDigital}
                      onChange={(e) => onChange({ minSizeDigital: Number(e.target.value) })}
                      className="w-16 text-sm font-bold bg-transparent border-b border-foreground/20 outline-none"
                    />
                    <span className="text-xs text-muted-foreground">px</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">largura mínima</p>
                </div>
              </div>
            </div>

            {/* Impressão */}
            <div className="flex flex-col gap-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Impressão</p>
              <div className="flex items-end gap-3">
                <div
                  className="border border-foreground/20 flex items-center justify-center bg-muted/20"
                  style={{ width: data.minSizePrint * 3, height: Math.round(data.minSizePrint * 1.2) }}
                >
                  <span className="text-[8px] font-mono text-muted-foreground">Logo</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={data.minSizePrint}
                      onChange={(e) => onChange({ minSizePrint: Number(e.target.value) })}
                      className="w-16 text-sm font-bold bg-transparent border-b border-foreground/20 outline-none"
                    />
                    <span className="text-xs text-muted-foreground">mm</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">largura mínima</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">02</div>
        </div>
      </PageSlide>
    );
  }

  // slide === 'donts'
  const donts = [
    { label: 'Deformar', desc: 'Não esticar ou compactar as proporções do logo' },
    { label: 'Inclinar', desc: 'Não rotacionar o logo em nenhum ângulo' },
    { label: 'Trocar cores', desc: 'Usar apenas as cores oficiais da paleta' },
    { label: 'Adicionar sombra', desc: 'Sem drop shadow ou efeitos de brilho' },
    { label: 'Contorno', desc: 'Não adicionar outline ou stroke externo' },
    { label: 'Baixa resolução', desc: 'Nunca usar versão pixelada ou bitmap de baixa qualidade' },
  ];

  return (
    <PageSlide>
      <div className="h-full flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">02.5 — Logo</p>
          <h2 className="text-2xl font-bold mt-1">Usos Incorretos</h2>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-3">
          {donts.map((d) => (
            <div key={d.label} className="border border-red-500/20 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-red-500 text-xs font-bold">✗</span>
                <p className="text-xs font-semibold">{d.label}</p>
              </div>
              <p className="text-[11px] text-muted-foreground">{d.desc}</p>
              {/* Placeholder visual */}
              <div className="flex-1 min-h-[40px] bg-red-500/5 border border-red-500/10 rounded flex items-center justify-center">
                <span className="text-[9px] text-muted-foreground font-mono">exemplo visual</span>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">02</div>
      </div>
    </PageSlide>
  );
};

export default LogoPage;
