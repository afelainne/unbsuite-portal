import { useRef, useState } from 'react';
import { BrandData, LogoVariant } from '../types';
import PageSlide from '../components/PageSlide';
import EditableText from '../components/EditableText';
import LogoGridCanvas from '../components/LogoGridCanvas';
import { getBuiltinPresets, type GeometryPreset } from '../../unbsgrid/lib/preset-engine';
import { Upload } from 'lucide-react';

interface LogoPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  slide: 'gallery' | 'grid' | 'clearspace' | 'minsize' | 'donts';
}

const PRESETS = getBuiltinPresets();

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
        // For SVG, also read as text for svgContent
        const textReader = new FileReader();
        textReader.onload = (te) => {
          const svgText = te.target?.result as string;
          onUpload({ ...variant, svgContent: svgText, dataUrl: url, fileName: file.name });
        };
        textReader.readAsText(file);
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

// ── Preset Selector ────────────────────────────────────────────────────────────
const PRESET_CATEGORY_COLORS: Record<string, string> = {
  'builtin-quick-check':    'border-red-400/60 bg-red-50',
  'builtin-golden':         'border-amber-400/60 bg-amber-50',
  'builtin-structural':     'border-pink-400/60 bg-pink-50',
  'builtin-balance':        'border-fuchsia-400/60 bg-fuchsia-50',
  'builtin-grid-spacing':   'border-blue-400/60 bg-blue-50',
  'builtin-typography':     'border-green-400/60 bg-green-50',
  'builtin-brand-guidelines': 'border-teal-400/60 bg-teal-50',
  'builtin-mathematical':   'border-violet-400/60 bg-violet-50',
  'builtin-presentation':   'border-orange-400/60 bg-orange-50',
  'builtin-flow':           'border-cyan-400/60 bg-cyan-50',
  'builtin-circles':        'border-rose-400/60 bg-rose-50',
  'builtin-minimal':        'border-gray-400/60 bg-gray-50',
  'builtin-contrast-weight':'border-yellow-400/60 bg-yellow-50',
  'builtin-diagonal':       'border-indigo-400/60 bg-indigo-50',
  'builtin-skeleton':       'border-purple-400/60 bg-purple-50',
  'builtin-full-audit':     'border-foreground/30 bg-foreground/5',
};

const LogoPage = ({ data, onChange, slide }: LogoPageProps) => {
  const [activePresetId, setActivePresetId] = useState<string>(PRESETS[0].id);
  const activePreset: GeometryPreset = PRESETS.find(p => p.id === activePresetId) ?? PRESETS[0];

  const updateVariant = (updated: LogoVariant) => {
    const variants = data.logoVariants.map((v) => (v.id === updated.id ? updated : v));
    onChange({ logoVariants: variants });
  };

  // Find the primary SVG variant for the grid canvas
  const primaryVariant = data.logoVariants.find(v => v.type === 'primary') ?? data.logoVariants[0];
  const logoSvgContent = data.logoVariants.find(v => v.svgContent)?.svgContent ?? '';

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
        <div className="h-full flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">02.2 — Logo</p>
            <h2 className="text-xl font-bold mt-0.5">Construção & Grid</h2>
          </div>

          <div className="flex-1 flex gap-4 min-h-0">
            {/* ── Canvas de análise geométrica ── */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <div className="flex-1 rounded-lg border border-foreground/10 bg-white overflow-hidden shadow-sm relative min-h-0">
                {logoSvgContent ? (
                  <LogoGridCanvas svgContent={logoSvgContent} preset={activePreset} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    {primaryVariant?.dataUrl ? (
                      <img src={primaryVariant.dataUrl} alt="Logo" className="max-h-24 max-w-full object-contain opacity-50" />
                    ) : null}
                    <p className="text-xs">Faça upload de um SVG na galeria para ativar a análise geométrica</p>
                  </div>
                )}
                {/* Active preset badge */}
                {logoSvgContent && (
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded font-mono">
                    {activePreset.name}
                  </div>
                )}
              </div>

              {/* Grid params row */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Tipo</span>
                  <select
                    value={gr.gridType}
                    onChange={(e) => onChange({ gridRules: { ...gr, gridType: e.target.value as typeof gr.gridType } })}
                    className="text-xs bg-transparent border border-foreground/20 rounded px-1.5 py-0.5"
                  >
                    {['modular', 'baseline', 'circular', 'custom'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Unidades</span>
                  <input
                    type="number" value={gr.gridUnits} min={2} max={24}
                    onChange={(e) => onChange({ gridRules: { ...gr, gridUnits: Number(e.target.value) } })}
                    className="text-xs bg-transparent border border-foreground/20 rounded px-1.5 py-0.5 w-14"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Proporções</span>
                  <span className="text-xs font-mono">{gr.keyRatios.join(' · ')}</span>
                </div>
              </div>
            </div>

            {/* ── Seletor de presets UNBSGRID ── */}
            <div className="w-44 flex flex-col gap-1.5 overflow-y-auto pr-0.5">
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground shrink-0">Presets UNBSGRID</p>
              <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
                {PRESETS.map((preset) => {
                  const isActive = preset.id === activePresetId;
                  const catColor = PRESET_CATEGORY_COLORS[preset.id] ?? 'border-foreground/20 bg-background';
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setActivePresetId(preset.id)}
                      className={`text-left px-2 py-1.5 rounded-md border text-[9px] leading-tight transition-all ${
                        isActive
                          ? `${catColor} shadow-sm font-semibold ring-1 ring-primary/40`
                          : 'border-foreground/10 bg-background/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="font-semibold text-[9px]">{preset.name}</div>
                      {preset.description && (
                        <div className="text-[8px] opacity-70 mt-0.5 line-clamp-2">{preset.description}</div>
                      )}
                    </button>
                  );
                })}
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
                <div className="border-2 border-dashed border-primary/40 p-8 flex items-center justify-center">
                  <div className="border border-foreground/20 w-24 h-12 flex items-center justify-center bg-muted/30">
                    {data.logoVariants[0]?.dataUrl ? (
                      <img src={data.logoVariants[0].dataUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">LOGO</span>
                    )}
                  </div>
                </div>
                <p className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-primary/70">x</p>
                <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-primary/70">x</p>
                <p className="absolute top-1/2 -left-5 -translate-y-1/2 text-[10px] font-mono text-primary/70">x</p>
                <p className="absolute top-1/2 -right-5 -translate-y-1/2 text-[10px] font-mono text-primary/70">x</p>
              </div>
            </div>

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
                      type="number" value={data.minSizeDigital}
                      onChange={(e) => onChange({ minSizeDigital: Number(e.target.value) })}
                      className="w-16 text-sm font-bold bg-transparent border-b border-foreground/20 outline-none"
                    />
                    <span className="text-xs text-muted-foreground">px</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">largura mínima</p>
                </div>
              </div>
            </div>

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
                      type="number" value={data.minSizePrint}
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
