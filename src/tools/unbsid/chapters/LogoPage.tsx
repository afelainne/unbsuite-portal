import { useRef } from 'react';
import { BrandData, LogoVariant } from '../types';
import PageSlide from '../components/PageSlide';
import EditableText from '../components/EditableText';
import LogoGridCanvas from '../components/LogoGridCanvas';
import { ManualTheme } from '../themes';
import { getBuiltinPresets, type GeometryPreset } from '../../unbsgrid/lib/preset-engine';
import { Upload, Plus, X } from 'lucide-react';
import { useState } from 'react';

interface LogoPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  slide: 'gallery' | 'grid' | 'clearspace' | 'minsize' | 'donts';
  theme?: ManualTheme;
}

const PRESETS = getBuiltinPresets();

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
    <div className="rounded border border-foreground/10 overflow-hidden group cursor-pointer" style={{ background: isDark ? '#111' : '#fafafa' }} onClick={() => ref.current?.click()}>
      <div className="h-16 flex items-center justify-center p-3 relative">
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
        <p className="text-[9px] font-medium truncate opacity-50" style={{ color: isDark ? '#aaa' : undefined }}>{variant.label}</p>
      </div>
    </div>
  );
};

/** Upload zone compacta para SVG — usada no slide Grid */
const SvgUploadZone = ({ onSvgLoaded }: { onSvgLoaded: (svg: string, dataUrl: string) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const textReader = new FileReader();
      textReader.onload = (te) => onSvgLoaded(te.target?.result as string, dataUrl);
      textReader.readAsText(file);
    };
    reader.readAsDataURL(file);
  };
  return (
    <button
      onClick={() => ref.current?.click()}
      className="flex items-center gap-2 px-3 py-1.5 rounded border border-dashed border-foreground/20 text-[10px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
    >
      <Upload className="h-3 w-3" /> Upload SVG para análise
      <input ref={ref} type="file" accept="image/svg+xml" className="sr-only" onChange={handleFile} />
    </button>
  );
};

const LogoPage = ({ data, onChange, slide, theme }: LogoPageProps) => {
  const [activePresetId, setActivePresetId] = useState<string>(PRESETS[0].id);
  const activePreset: GeometryPreset = PRESETS.find(p => p.id === activePresetId) ?? PRESETS[0];
  const clearspaceFileRef = useRef<HTMLInputElement>(null);

  const updateVariant = (updated: LogoVariant) => {
    onChange({ logoVariants: data.logoVariants.map((v) => (v.id === updated.id ? updated : v)) });
  };

  const primaryVariant = data.logoVariants.find(v => v.type === 'primary') ?? data.logoVariants[0];
  const logoSvgContent = data.logoVariants.find(v => v.svgContent)?.svgContent ?? '';
  const accent = theme?.accentColor || 'hsl(var(--primary))';

  if (slide === 'gallery') {
    return (
      <PageSlide theme={theme}>
        <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">02 — Logo</p>
            <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Variações do Logo</h2>
          </div>
          <div className="grid grid-cols-5 gap-3 flex-1">
            {data.logoVariants.map((v) => <VariantCard key={v.id} variant={v} onUpload={updateVariant} />)}
          </div>
          <p className="text-[9px] opacity-40">Clique em cada card para fazer upload. SVG e PNG com fundo transparente.</p>
          <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>02</div>
        </div>
      </PageSlide>
    );
  }

  if (slide === 'grid') {
    const gr = data.gridRules;
    const handleSvgUpload = (svg: string, dataUrl: string) => {
      const updated = data.logoVariants.map((v, i) =>
        i === 0 ? { ...v, svgContent: svg, dataUrl, fileName: 'logo.svg' } : v
      );
      onChange({ logoVariants: updated });
    };

    return (
      <PageSlide theme={theme}>
        <div className="absolute inset-0 px-10 py-8 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">02.2 — Logo</p>
              <h2 className="text-lg font-semibold mt-0.5" style={{ fontFamily: theme?.headingFont }}>Construção & Grid</h2>
            </div>
            {!logoSvgContent && (
              <SvgUploadZone onSvgLoaded={handleSvgUpload} />
            )}
          </div>
          <div className="flex-1 flex gap-4 min-h-0">
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <div className="flex-1 rounded border border-foreground/10 bg-white overflow-hidden relative min-h-0">
                {logoSvgContent ? (
                  <LogoGridCanvas svgContent={logoSvgContent} preset={activePreset} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    {primaryVariant?.dataUrl && <img src={primaryVariant.dataUrl} alt="Logo" className="max-h-20 max-w-full object-contain opacity-30" />}
                    <p className="text-[10px] opacity-50 text-center px-8">Faça upload de um SVG acima para ativar a análise geométrica</p>
                    <SvgUploadZone onSvgLoaded={handleSvgUpload} />
                  </div>
                )}
                {logoSvgContent && (
                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    <div className="bg-black/60 text-white text-[9px] px-2 py-0.5 rounded font-mono">{activePreset.name}</div>
                    <button onClick={() => { onChange({ logoVariants: data.logoVariants.map((v, i) => i === 0 ? { ...v, svgContent: undefined } : v) }); }}
                      className="bg-black/40 hover:bg-black/70 text-white text-[9px] px-2 py-0.5 rounded transition-colors">
                      Trocar SVG
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider opacity-40">Tipo</span>
                  <select value={gr.gridType} onChange={(e) => onChange({ gridRules: { ...gr, gridType: e.target.value as typeof gr.gridType } })} className="text-[10px] bg-transparent border border-foreground/20 rounded px-1.5 py-0.5">
                    {['modular', 'baseline', 'circular', 'custom'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider opacity-40">Unidades</span>
                  <input type="number" value={gr.gridUnits} min={2} max={24} onChange={(e) => onChange({ gridRules: { ...gr, gridUnits: Number(e.target.value) } })} className="text-[10px] bg-transparent border border-foreground/20 rounded px-1.5 py-0.5 w-12" />
                </div>
              </div>
            </div>
            {/* Presets — lista minimalista */}
            <div className="w-40 flex flex-col gap-1 overflow-y-auto">
              <p className="text-[9px] font-mono uppercase tracking-[0.15em] opacity-40 shrink-0 mb-1">Presets</p>
              {PRESETS.map((preset) => {
                const isActive = preset.id === activePresetId;
                return (
                  <button key={preset.id} onClick={() => setActivePresetId(preset.id)}
                    className="text-left px-2 py-1 text-[9px] leading-tight transition-all rounded"
                    style={isActive
                      ? { color: accent, fontWeight: 600, borderBottom: `1px solid ${accent}` }
                      : { color: 'hsl(var(--muted-foreground))', opacity: 0.6 }
                    }>
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>02</div>
        </div>
      </PageSlide>
    );
  }

  const handleClearspaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (file.name.endsWith('.svg')) {
        const tr = new FileReader();
        tr.onload = (te) => updateVariant({ ...data.logoVariants[0], svgContent: te.target?.result as string, dataUrl: url, fileName: file.name });
        tr.readAsText(file);
      } else {
        updateVariant({ ...data.logoVariants[0], dataUrl: url, fileName: file.name });
      }
    };
    reader.readAsDataURL(file);
  };

  if (slide === 'clearspace') {
    const logoSrc = data.logoVariants[0]?.dataUrl;
    return (
      <PageSlide theme={theme}>
        <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">02.3 — Logo</p>
            <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Área de Proteção</h2>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-8 items-center min-h-0">
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="border-2 border-dashed p-8 flex items-center justify-center" style={{ borderColor: accent + '50' }}>
                  <div className="border border-foreground/15 w-24 h-12 flex items-center justify-center bg-muted/20 cursor-pointer" onClick={() => clearspaceFileRef.current?.click()}>
                    {logoSrc ? (
                      <img src={logoSrc} alt="Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-0.5 opacity-20">
                        <Upload className="h-3 w-3" />
                        <span className="text-[8px]">Logo</span>
                      </div>
                    )}
                  </div>
                </div>
                {['top', 'bottom', 'left', 'right'].map((pos) => (
                  <p key={pos} className="absolute text-[10px] font-mono" style={{ color: accent, opacity: 0.6, ...(pos === 'top' ? { top: -18, left: '50%', transform: 'translateX(-50%)' } : pos === 'bottom' ? { bottom: -18, left: '50%', transform: 'translateX(-50%)' } : pos === 'left' ? { top: '50%', left: -16, transform: 'translateY(-50%)' } : { top: '50%', right: -16, transform: 'translateY(-50%)' }) }}>x</p>
                ))}
                <input ref={clearspaceFileRef} type="file" accept="image/*,.svg" className="sr-only" onChange={handleClearspaceUpload} />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-2">Regra de espaço mínimo</p>
                <p className="text-[11px]">Mantenha sempre <strong>x</strong> de espaço livre ao redor do logo.</p>
                <p className="text-[10px] opacity-50 mt-1">onde <strong>x =</strong>{' '}<EditableText value={data.clearSpaceRule} onChange={(v) => onChange({ clearSpaceRule: v })} className="inline text-[10px]" style={{ color: accent }} /></p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="border border-green-500/20 rounded p-2.5">
                  <p className="text-[9px] text-green-600 font-semibold mb-1">✓ Correto</p>
                  <p className="text-[9px] opacity-40">Logo com espaço de respiro adequado.</p>
                </div>
                <div className="border border-red-500/20 rounded p-2.5">
                  <p className="text-[9px] text-red-500 font-semibold mb-1">✗ Incorreto</p>
                  <p className="text-[9px] opacity-40">Elementos muito próximos comprometem a leitura.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>02</div>
        </div>
      </PageSlide>
    );
  }

  if (slide === 'minsize') {
    return (
      <PageSlide theme={theme}>
        <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">02.4 — Logo</p>
            <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Tamanho Mínimo</h2>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-8 items-center min-h-0">
            <div className="flex flex-col gap-5">
              <p className="text-[9px] uppercase tracking-[0.2em] opacity-40">Digital</p>
              <div className="flex items-end gap-3">
                <div className="border border-foreground/15 flex items-center justify-center bg-muted/20" style={{ width: data.minSizeDigital, height: Math.round(data.minSizeDigital * 0.4) }}>
                  <span className="text-[7px] font-mono opacity-40">Logo</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={data.minSizeDigital} onChange={(e) => onChange({ minSizeDigital: Number(e.target.value) })} className="w-16 text-sm font-bold bg-transparent border-b border-foreground/20 outline-none" />
                    <span className="text-[10px] opacity-40">px</span>
                  </div>
                  <p className="text-[9px] opacity-40 mt-0.5">largura mínima</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-5">
              <p className="text-[9px] uppercase tracking-[0.2em] opacity-40">Impressão</p>
              <div className="flex items-end gap-3">
                <div className="border border-foreground/15 flex items-center justify-center bg-muted/20" style={{ width: data.minSizePrint * 3, height: Math.round(data.minSizePrint * 1.2) }}>
                  <span className="text-[7px] font-mono opacity-40">Logo</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={data.minSizePrint} onChange={(e) => onChange({ minSizePrint: Number(e.target.value) })} className="w-16 text-sm font-bold bg-transparent border-b border-foreground/20 outline-none" />
                    <span className="text-[10px] opacity-40">mm</span>
                  </div>
                  <p className="text-[9px] opacity-40 mt-0.5">largura mínima</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>02</div>
        </div>
      </PageSlide>
    );
  }

  // slide === 'donts'
  const donts = data.logoDonts ?? [
    'Não distorça ou deforme o logo',
    'Não aplique sombras ou efeitos',
    'Não altere as proporções',
    'Não use cores fora do sistema',
    'Não aplique sobre fundos conflitantes',
    'Não adicione elementos extras ao logo',
  ];

  const updateDont = (i: number, val: string) => {
    const arr = [...donts]; arr[i] = val; onChange({ logoDonts: arr });
  };
  const addDont = () => onChange({ logoDonts: [...donts, 'Não…'] });
  const removeDont = (i: number) => onChange({ logoDonts: donts.filter((_, idx) => idx !== i) });

  return (
    <PageSlide theme={theme}>
      <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">02.5 — Logo</p>
            <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Usos Incorretos</h2>
          </div>
          <button onClick={addDont} className="flex items-center gap-1 text-[10px] opacity-30 hover:opacity-70 transition-opacity" style={{ color: accent }}>
            <Plus className="h-3 w-3" /> Adicionar
          </button>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-3 overflow-hidden">
          {donts.map((d, i) => (
            <div key={i} className="group border border-red-400/15 rounded p-3 flex flex-col gap-2 relative" style={{ backgroundColor: 'rgba(239,68,68,0.03)' }}>
              <div className="w-full h-12 border border-foreground/8 rounded bg-muted/10 flex items-center justify-center">
                {data.logoVariants[0]?.dataUrl ? (
                  <img src={data.logoVariants[0].dataUrl} alt="Logo" className="max-h-8 max-w-full object-contain opacity-50" />
                ) : (
                  <span className="text-[9px] font-mono opacity-20">LOGO</span>
                )}
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-red-400 text-[10px] mt-0.5 flex-shrink-0">✗</span>
                <EditableText value={d} onChange={(v) => updateDont(i, v)} className="text-[10px] flex-1 leading-snug opacity-70" />
              </div>
              <button onClick={() => removeDont(i)} className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded">
                <X className="h-2.5 w-2.5 text-red-400" />
              </button>
            </div>
          ))}
        </div>
        <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>02</div>
      </div>
    </PageSlide>
  );
};

export default LogoPage;
