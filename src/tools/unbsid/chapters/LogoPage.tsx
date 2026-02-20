import { useRef, useState } from 'react';
import { BrandData, LogoVariant } from '../types';
import PageSlide from '../components/PageSlide';
import EditableText from '../components/EditableText';
import LogoGridCanvas from '../components/LogoGridCanvas';
import { ManualTheme } from '../themes';
import { getBuiltinPresets, type GeometryPreset } from '../../unbsgrid/lib/preset-engine';
import { Upload, Plus, X } from 'lucide-react';

interface LogoPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  slide: 'gallery' | 'grid' | 'clearspace' | 'minsize' | 'donts';
  theme?: ManualTheme;
}

const PRESETS = getBuiltinPresets();

const PRESET_CATEGORY_COLORS: Record<string, string> = {
  'builtin-quick-check':      'border-red-400/60 bg-red-50',
  'builtin-golden':           'border-amber-400/60 bg-amber-50',
  'builtin-structural':       'border-pink-400/60 bg-pink-50',
  'builtin-balance':          'border-fuchsia-400/60 bg-fuchsia-50',
  'builtin-grid-spacing':     'border-blue-400/60 bg-blue-50',
  'builtin-typography':       'border-green-400/60 bg-green-50',
  'builtin-brand-guidelines': 'border-teal-400/60 bg-teal-50',
  'builtin-mathematical':     'border-violet-400/60 bg-violet-50',
  'builtin-presentation':     'border-orange-400/60 bg-orange-50',
  'builtin-flow':             'border-cyan-400/60 bg-cyan-50',
  'builtin-circles':          'border-rose-400/60 bg-rose-50',
  'builtin-minimal':          'border-gray-400/60 bg-gray-50',
  'builtin-diagonal':         'border-indigo-400/60 bg-indigo-50',
  'builtin-skeleton':         'border-purple-400/60 bg-purple-50',
  'builtin-full-audit':       'border-foreground/30 bg-foreground/5',
};

const VariantCard = ({ variant, onUpload }: { variant: LogoVariant; onUpload: (v: LogoVariant) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const isDark = variant.type === 'negative';

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (file.name.endsWith('.svg')) {
        const textReader = new FileReader();
        textReader.onload = (te) => onUpload({ ...variant, svgContent: te.target?.result as string, dataUrl: url, fileName: file.name });
        textReader.readAsText(file);
      } else {
        onUpload({ ...variant, dataUrl: url, fileName: file.name });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-lg border border-foreground/10 overflow-hidden group cursor-pointer" style={{ background: isDark ? '#111' : '#fafafa' }} onClick={() => ref.current?.click()}>
      <div className="h-20 flex items-center justify-center p-4 relative">
        {variant.dataUrl ? (
          <img src={variant.dataUrl} alt={variant.label} className="max-h-full max-w-full object-contain" style={{ filter: variant.type === 'mono' ? 'grayscale(100%)' : undefined }} />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-20 group-hover:opacity-50 transition-opacity" style={{ color: isDark ? '#fff' : '#000' }}>
            <Upload className="h-4 w-4" /><span className="text-[9px]">Upload</span>
          </div>
        )}
        <input ref={ref} type="file" accept="image/svg+xml,image/png,image/jpeg" className="sr-only" onChange={handleFile} />
      </div>
      <div className="px-2 pb-2">
        <p className="text-[10px] font-medium truncate" style={{ color: isDark ? '#aaa' : '#555' }}>{variant.label}</p>
      </div>
    </div>
  );
};

const LogoPage = ({ data, onChange, slide, theme }: LogoPageProps) => {
  const [activePresetId, setActivePresetId] = useState<string>(PRESETS[0].id);
  const activePreset: GeometryPreset = PRESETS.find(p => p.id === activePresetId) ?? PRESETS[0];

  const updateVariant = (updated: LogoVariant) => {
    onChange({ logoVariants: data.logoVariants.map((v) => (v.id === updated.id ? updated : v)) });
  };

  const primaryVariant = data.logoVariants.find(v => v.type === 'primary') ?? data.logoVariants[0];
  const logoSvgContent = data.logoVariants.find(v => v.svgContent)?.svgContent ?? '';
  const accent = theme?.accentColor || 'hsl(var(--primary))';

  if (slide === 'gallery') {
    return (
      <PageSlide theme={theme}>
        <div className="h-full flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">02 — Logo</p>
            <h2 className="text-2xl font-bold mt-1" style={{ fontFamily: theme?.headingFont }}>Variações do Logo</h2>
          </div>
          <div className="grid grid-cols-5 gap-3 flex-1">
            {data.logoVariants.map((v) => <VariantCard key={v.id} variant={v} onUpload={updateVariant} />)}
          </div>
          <p className="text-[10px] opacity-50">Cada variação deve ser entregue em SVG e PNG com fundo transparente.</p>
          <div className="absolute bottom-8 right-10 text-[80px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.04 }}>02</div>
        </div>
      </PageSlide>
    );
  }

  if (slide === 'grid') {
    const gr = data.gridRules;
    return (
      <PageSlide theme={theme}>
        <div className="h-full flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">02.2 — Logo</p>
            <h2 className="text-xl font-bold mt-0.5" style={{ fontFamily: theme?.headingFont }}>Construção & Grid</h2>
          </div>
          <div className="flex-1 flex gap-4 min-h-0">
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <div className="flex-1 rounded-lg border border-foreground/10 bg-white overflow-hidden shadow-sm relative min-h-0">
                {logoSvgContent ? (
                  <LogoGridCanvas svgContent={logoSvgContent} preset={activePreset} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    {primaryVariant?.dataUrl && <img src={primaryVariant.dataUrl} alt="Logo" className="max-h-24 max-w-full object-contain opacity-50" />}
                    <p className="text-xs">Faça upload de um SVG na galeria para ativar a análise geométrica</p>
                  </div>
                )}
                {logoSvgContent && (
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded font-mono">{activePreset.name}</div>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider opacity-50">Tipo</span>
                  <select value={gr.gridType} onChange={(e) => onChange({ gridRules: { ...gr, gridType: e.target.value as typeof gr.gridType } })} className="text-xs bg-transparent border border-foreground/20 rounded px-1.5 py-0.5">
                    {['modular', 'baseline', 'circular', 'custom'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider opacity-50">Unidades</span>
                  <input type="number" value={gr.gridUnits} min={2} max={24} onChange={(e) => onChange({ gridRules: { ...gr, gridUnits: Number(e.target.value) } })} className="text-xs bg-transparent border border-foreground/20 rounded px-1.5 py-0.5 w-14" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider opacity-50">Proporções</span>
                  <span className="text-xs font-mono">{gr.keyRatios.join(' · ')}</span>
                </div>
              </div>
            </div>
            <div className="w-44 flex flex-col gap-1.5 overflow-y-auto pr-0.5">
              <p className="text-[9px] font-mono uppercase tracking-widest opacity-50 shrink-0">Presets UNBSGRID</p>
              <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
                {PRESETS.map((preset) => {
                  const isActive = preset.id === activePresetId;
                  const catColor = PRESET_CATEGORY_COLORS[preset.id] ?? 'border-foreground/20 bg-background';
                  return (
                    <button key={preset.id} onClick={() => setActivePresetId(preset.id)}
                      className={`text-left px-2 py-1.5 rounded-md border text-[9px] leading-tight transition-all ${isActive ? `${catColor} shadow-sm font-semibold ring-1 ring-primary/40` : 'border-foreground/10 bg-background/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground'}`}>
                      <div className="font-semibold text-[9px]">{preset.name}</div>
                      {preset.description && <div className="text-[8px] opacity-70 mt-0.5 line-clamp-2">{preset.description}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 right-10 text-[80px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.04 }}>02</div>
        </div>
      </PageSlide>
    );
  }

  if (slide === 'clearspace') {
    return (
      <PageSlide theme={theme}>
        <div className="h-full flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">02.3 — Logo</p>
            <h2 className="text-2xl font-bold mt-1" style={{ fontFamily: theme?.headingFont }}>Área de Proteção</h2>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-8 items-center">
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="border-2 border-dashed p-8 flex items-center justify-center" style={{ borderColor: accent + '60' }}>
                  <div className="border border-foreground/20 w-24 h-12 flex items-center justify-center bg-muted/30">
                    {data.logoVariants[0]?.dataUrl ? (
                      <img src={data.logoVariants[0].dataUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs opacity-40 font-mono">LOGO</span>
                    )}
                  </div>
                </div>
                {['top', 'bottom', 'left', 'right'].map((pos) => (
                  <p key={pos} className="absolute text-[10px] font-mono" style={{ color: accent, opacity: 0.7, ...(pos === 'top' ? { top: -20, left: '50%', transform: 'translateX(-50%)' } : pos === 'bottom' ? { bottom: -20, left: '50%', transform: 'translateX(-50%)' } : pos === 'left' ? { top: '50%', left: -20, transform: 'translateY(-50%)' } : { top: '50%', right: -20, transform: 'translateY(-50%)' }) }}>x</p>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest opacity-50 mb-2">Regra de espaço mínimo</p>
                <p className="text-sm">Mantenha sempre <strong>x</strong> de espaço livre ao redor do logo.</p>
                <p className="text-xs opacity-50 mt-1">onde <strong>x =</strong>{' '}<EditableText value={data.clearSpaceRule} onChange={(v) => onChange({ clearSpaceRule: v })} className="inline text-xs" style={{ color: accent }} /></p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-green-500/30 rounded p-3">
                  <p className="text-[10px] text-green-600 font-semibold mb-1">✓ Correto</p>
                  <p className="text-[10px] opacity-50">Logo com espaço de respiro adequado ao redor.</p>
                </div>
                <div className="border border-red-500/30 rounded p-3">
                  <p className="text-[10px] text-red-500 font-semibold mb-1">✗ Incorreto</p>
                  <p className="text-[10px] opacity-50">Elementos muito próximos comprometem a leitura.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 right-10 text-[80px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.04 }}>02</div>
        </div>
      </PageSlide>
    );
  }

  if (slide === 'minsize') {
    return (
      <PageSlide theme={theme}>
        <div className="h-full flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">02.4 — Logo</p>
            <h2 className="text-2xl font-bold mt-1" style={{ fontFamily: theme?.headingFont }}>Tamanho Mínimo</h2>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-8 items-center">
            <div className="flex flex-col gap-4">
              <p className="text-xs uppercase tracking-widest opacity-50">Digital</p>
              <div className="flex items-end gap-3">
                <div className="border border-foreground/20 flex items-center justify-center bg-muted/20" style={{ width: data.minSizeDigital, height: Math.round(data.minSizeDigital * 0.4) }}>
                  <span className="text-[8px] font-mono opacity-50">Logo</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={data.minSizeDigital} onChange={(e) => onChange({ minSizeDigital: Number(e.target.value) })} className="w-16 text-sm font-bold bg-transparent border-b border-foreground/20 outline-none" />
                    <span className="text-xs opacity-50">px</span>
                  </div>
                  <p className="text-[10px] opacity-50 mt-0.5">largura mínima</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <p className="text-xs uppercase tracking-widest opacity-50">Impressão</p>
              <div className="flex items-end gap-3">
                <div className="border border-foreground/20 flex items-center justify-center bg-muted/20" style={{ width: data.minSizePrint * 3, height: Math.round(data.minSizePrint * 1.2) }}>
                  <span className="text-[8px] font-mono opacity-50">Logo</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={data.minSizePrint} onChange={(e) => onChange({ minSizePrint: Number(e.target.value) })} className="w-16 text-sm font-bold bg-transparent border-b border-foreground/20 outline-none" />
                    <span className="text-xs opacity-50">mm</span>
                  </div>
                  <p className="text-[10px] opacity-50 mt-0.5">largura mínima</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 right-10 text-[80px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.04 }}>02</div>
        </div>
      </PageSlide>
    );
  }

  // slide === 'donts' — editável com logoDonts do BrandData
  const donts = data.logoDonts ?? [
    'Não distorça ou deforme o logo',
    'Não aplique sombras ou efeitos',
    'Não altere as proporções',
    'Não use cores fora do sistema',
    'Não aplique sobre fundos conflitantes',
    'Não adicione elementos extras ao logo',
  ];

  const updateDont = (i: number, val: string) => {
    const arr = [...donts];
    arr[i] = val;
    onChange({ logoDonts: arr });
  };
  const addDont = () => onChange({ logoDonts: [...donts, 'Não…'] });
  const removeDont = (i: number) => onChange({ logoDonts: donts.filter((_, idx) => idx !== i) });

  return (
    <PageSlide theme={theme}>
      <div className="h-full flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">02.5 — Logo</p>
            <h2 className="text-2xl font-bold mt-1" style={{ fontFamily: theme?.headingFont }}>Usos Incorretos</h2>
          </div>
          <button onClick={addDont} className="flex items-center gap-1 text-xs opacity-40 hover:opacity-80 transition-opacity" style={{ color: accent }}>
            <Plus className="h-3 w-3" /> Adicionar
          </button>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-3">
          {donts.map((d, i) => (
            <div key={i} className="group border border-red-500/20 rounded-lg p-3 flex flex-col gap-2 relative bg-red-50/30">
              <div className="w-full h-14 border border-foreground/10 rounded bg-muted/20 flex items-center justify-center">
                {data.logoVariants[0]?.dataUrl ? (
                  <img src={data.logoVariants[0].dataUrl} alt="Logo" className="max-h-10 max-w-full object-contain opacity-60" />
                ) : (
                  <span className="text-[10px] font-mono opacity-30">LOGO</span>
                )}
              </div>
              <div className="flex items-start gap-1">
                <span className="text-red-500 text-[10px] mt-0.5 flex-shrink-0">✗</span>
                <EditableText value={d} onChange={(v) => updateDont(i, v)} className="text-[10px] flex-1 leading-snug" />
              </div>
              <button onClick={() => removeDont(i)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100">
                <X className="h-2.5 w-2.5 text-red-400" />
              </button>
            </div>
          ))}
        </div>
        <div className="absolute bottom-8 right-10 text-[80px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.04 }}>02</div>
      </div>
    </PageSlide>
  );
};

export default LogoPage;
