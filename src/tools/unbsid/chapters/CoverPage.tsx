import { useRef } from 'react';
import { BrandData } from '../types';
import PageSlide from '../components/PageSlide';
import EditableText from '../components/EditableText';
import { ManualTheme } from '../themes';
import { Upload } from 'lucide-react';

interface CoverPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  theme?: ManualTheme;
}

const CoverPage = ({ data, onChange, theme }: CoverPageProps) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onChange({ coverLogoUrl: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const coverLayout = theme?.coverLayout ?? 'split';
  const bgColor = data.coverBgColor || theme?.coverBg || '#0F0F0F';
  const accentHex = data.coverAccentColor || theme?.coverAccent || '#FFFFFF';
  const textColor = theme?.coverTextColor || accentHex;

  // ── Layout: centered ──────────────────────────────────────────────
  if (coverLayout === 'centered') {
    return (
      <PageSlide noPadding bgColor={bgColor}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-16" style={{ color: textColor }}>
          {/* Logo */}
          <div className="w-28 h-14 group">
            {data.coverLogoUrl ? (
              <img src={data.coverLogoUrl} alt="Logo" className="h-full object-contain cursor-pointer mx-auto" onClick={() => fileRef.current?.click()} />
            ) : (
              <button onClick={() => fileRef.current?.click()} className="h-full w-full border-2 border-dashed flex items-center justify-center gap-2 opacity-30 hover:opacity-60 transition-opacity rounded mx-auto" style={{ borderColor: accentHex }}>
                <Upload className="h-4 w-4" /><span className="text-xs">Logo</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*,.svg" className="sr-only" onChange={handleLogoUpload} />
          </div>

          <div className="text-center">
            <EditableText value={data.name} onChange={(v) => onChange({ name: v })} as="h1" className="text-5xl font-black tracking-tight leading-none block" />
            <EditableText value={data.tagline} onChange={(v) => onChange({ tagline: v })} as="p" className="text-base mt-3 opacity-60 block" />
          </div>

          {/* Accent line */}
          <div className="w-16 h-0.5" style={{ backgroundColor: accentHex }} />

          <div className="flex items-center gap-4 text-xs font-mono opacity-40">
            <EditableText value={data.version} onChange={(v) => onChange({ version: v })} className="uppercase tracking-widest inline" />
            <span>·</span>
            <EditableText value={data.studio} onChange={(v) => onChange({ studio: v })} className="inline" />
          </div>

          {/* Color pickers */}
          <div className="absolute bottom-4 right-6 flex gap-2 opacity-30 hover:opacity-80 transition-opacity">
            <label className="flex flex-col items-center gap-0.5 cursor-pointer text-[9px]" style={{ color: accentHex }}>
              <div className="w-4 h-4 rounded-full border border-current" style={{ backgroundColor: bgColor }} />
              <input type="color" value={data.coverBgColor} onChange={(e) => onChange({ coverBgColor: e.target.value })} className="sr-only" />
            </label>
            <label className="flex flex-col items-center gap-0.5 cursor-pointer text-[9px]" style={{ color: accentHex }}>
              <div className="w-4 h-4 rounded-full border border-current" style={{ backgroundColor: accentHex }} />
              <input type="color" value={data.coverAccentColor} onChange={(e) => onChange({ coverAccentColor: e.target.value })} className="sr-only" />
            </label>
          </div>
        </div>
      </PageSlide>
    );
  }

  // ── Layout: magazine (Editorial / Luxe) ──────────────────────────
  if (coverLayout === 'magazine') {
    return (
      <PageSlide noPadding bgColor={bgColor}>
        <div className="absolute inset-0" style={{ color: textColor }}>
          {/* Top bar accent */}
          <div className="h-2 w-full" style={{ backgroundColor: accentHex }} />

          <div className="flex h-full">
            {/* Left — big text column */}
            <div className="flex-1 flex flex-col justify-between p-10 pt-8">
              <div className="flex items-center justify-between text-[10px] font-mono opacity-50">
                <EditableText value={data.studio} onChange={(v) => onChange({ studio: v })} className="uppercase tracking-widest inline" />
                <EditableText value={data.version} onChange={(v) => onChange({ version: v })} className="uppercase tracking-widest inline" />
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-50 mb-2">Manual de Identidade Visual</p>
                <EditableText value={data.name} onChange={(v) => onChange({ name: v })} as="h1"
                  className="text-6xl font-black tracking-tight leading-[0.9] block mb-4"
                  style={{ fontFamily: theme?.headingFont }} />
                <div className="w-full h-px mb-4" style={{ backgroundColor: accentHex, opacity: 0.4 }} />
                <EditableText value={data.tagline} onChange={(v) => onChange({ tagline: v })} as="p"
                  className="text-sm opacity-60 block italic" />
              </div>

              <div className="text-[10px] font-mono opacity-40">
                <EditableText value={data.date} onChange={(v) => onChange({ date: v })} className="inline" />
              </div>
            </div>

            {/* Right — logo + accent strip */}
            <div className="w-[35%] flex flex-col items-center justify-center gap-6" style={{ backgroundColor: accentHex + '15' }}>
              <div className="w-32 h-20 group">
                {data.coverLogoUrl ? (
                  <img src={data.coverLogoUrl} alt="Logo" className="h-full w-full object-contain cursor-pointer" onClick={() => fileRef.current?.click()} />
                ) : (
                  <button onClick={() => fileRef.current?.click()} className="h-full w-full border-2 border-dashed flex flex-col items-center justify-center gap-1 opacity-20 hover:opacity-50 transition-opacity rounded" style={{ borderColor: accentHex, color: accentHex }}>
                    <Upload className="h-4 w-4" /><span className="text-[9px]">Upload Logo</span>
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*,.svg" className="sr-only" onChange={handleLogoUpload} />
              {/* Pickers */}
              <div className="flex gap-2 opacity-30 hover:opacity-80 transition-opacity">
                <label className="cursor-pointer" style={{ color: accentHex }}>
                  <div className="w-5 h-5 rounded-full border-2 border-current" style={{ backgroundColor: bgColor }} />
                  <input type="color" value={data.coverBgColor} onChange={(e) => onChange({ coverBgColor: e.target.value })} className="sr-only" />
                </label>
                <label className="cursor-pointer" style={{ color: accentHex }}>
                  <div className="w-5 h-5 rounded-full border-2 border-current" style={{ backgroundColor: accentHex }} />
                  <input type="color" value={data.coverAccentColor} onChange={(e) => onChange({ coverAccentColor: e.target.value })} className="sr-only" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </PageSlide>
    );
  }

  // ── Layout: diagonal (Tech / Bold / Neon) ────────────────────────
  if (coverLayout === 'diagonal') {
    return (
      <PageSlide noPadding bgColor={bgColor}>
        <div className="absolute inset-0 overflow-hidden" style={{ color: textColor }}>
          {/* Diagonal accent block */}
          <div
            className="absolute"
            style={{
              backgroundColor: accentHex,
              width: '60%', height: '130%',
              right: '-10%', top: '-15%',
              transform: 'rotate(-12deg)',
              transformOrigin: 'top right',
            }}
          />

          {/* Content left */}
          <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
            <div className="text-xs font-mono opacity-40 uppercase tracking-widest" style={{ color: textColor }}>
              Manual de Identidade Visual
            </div>

            <div>
              <EditableText value={data.name} onChange={(v) => onChange({ name: v })} as="h1"
                className="text-6xl font-black tracking-tight leading-none block mb-3"
                style={{ fontFamily: theme?.headingFont, color: textColor }} />
              <EditableText value={data.tagline} onChange={(v) => onChange({ tagline: v })} as="p"
                className="text-sm opacity-60 block" style={{ color: textColor }} />
            </div>

            <div className="flex items-center gap-4 text-[10px] font-mono opacity-40" style={{ color: textColor }}>
              <EditableText value={data.version} onChange={(v) => onChange({ version: v })} className="uppercase tracking-widest inline" />
              <span>·</span>
              <EditableText value={data.studio} onChange={(v) => onChange({ studio: v })} className="inline" />
            </div>
          </div>

          {/* Logo on diagonal area */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 w-32 h-20 group">
            {data.coverLogoUrl ? (
              <img src={data.coverLogoUrl} alt="Logo" className="h-full w-full object-contain cursor-pointer" onClick={() => fileRef.current?.click()} />
            ) : (
              <button onClick={() => fileRef.current?.click()} className="h-full w-full flex flex-col items-center justify-center gap-1 opacity-40 hover:opacity-80 transition-opacity" style={{ color: bgColor }}>
                <Upload className="h-5 w-5" /><span className="text-[9px]">Logo</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*,.svg" className="sr-only" onChange={handleLogoUpload} />
          </div>

          {/* Pickers */}
          <div className="absolute bottom-4 left-12 flex gap-2 z-20 opacity-30 hover:opacity-80 transition-opacity">
            <label className="cursor-pointer" style={{ color: textColor }}>
              <div className="w-4 h-4 rounded-full border border-current" style={{ backgroundColor: bgColor }} />
              <input type="color" value={data.coverBgColor} onChange={(e) => onChange({ coverBgColor: e.target.value })} className="sr-only" />
            </label>
            <label className="cursor-pointer" style={{ color: textColor }}>
              <div className="w-4 h-4 rounded-full border border-current" style={{ backgroundColor: accentHex }} />
              <input type="color" value={data.coverAccentColor} onChange={(e) => onChange({ coverAccentColor: e.target.value })} className="sr-only" />
            </label>
          </div>
        </div>
      </PageSlide>
    );
  }

  // ── Layout: split (default Studio) ──────────────────────────────
  return (
    <PageSlide noPadding bgColor={bgColor}>
      <div className="absolute inset-0 flex">
        {/* Esquerda — conteúdo */}
        <div className="flex-1 flex flex-col justify-between p-12" style={{ color: textColor }}>
          <div className="flex items-center justify-between text-xs font-mono opacity-50">
            <EditableText value={data.version} onChange={(v) => onChange({ version: v })} className="uppercase tracking-widest" />
            <EditableText value={data.date} onChange={(v) => onChange({ date: v })} />
          </div>

          <div className="flex flex-col gap-6">
            <div className="w-32 h-16 group">
              {data.coverLogoUrl ? (
                <img src={data.coverLogoUrl} alt="Logo" className="h-full object-contain cursor-pointer" onClick={() => fileRef.current?.click()} title="Clique para trocar o logo" />
              ) : (
                <button onClick={() => fileRef.current?.click()} className="h-full w-full border-2 border-dashed flex items-center justify-center gap-2 opacity-30 hover:opacity-60 transition-opacity rounded" style={{ borderColor: accentHex }}>
                  <Upload className="h-4 w-4" /><span className="text-xs">Upload Logo</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*,.svg" className="sr-only" onChange={handleLogoUpload} />
            </div>

            <div>
              <EditableText value={data.name} onChange={(v) => onChange({ name: v })} as="h1"
                className="text-5xl font-black tracking-tight leading-none block"
                style={{ fontFamily: theme?.headingFont }} />
              <EditableText value={data.tagline} onChange={(v) => onChange({ tagline: v })} as="p"
                className="text-base mt-2 opacity-60 block" />
            </div>
          </div>

          <div className="text-xs font-mono opacity-40">
            <span>Manual de Identidade Visual — </span>
            <EditableText value={data.studio} onChange={(v) => onChange({ studio: v })} className="inline" />
          </div>
        </div>

        {/* Direita — strip de accent */}
        <div className="w-[30%] flex flex-col items-center justify-end pb-12 gap-4" style={{ backgroundColor: accentHex + '20' }}>
          <div className="flex flex-col items-center gap-2 text-[10px] opacity-40" style={{ color: accentHex }}>
            <label className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-100 transition-opacity">
              <div className="w-6 h-6 rounded-full border-2 border-current" style={{ backgroundColor: bgColor }} />
              <span>Fundo</span>
              <input type="color" value={data.coverBgColor} onChange={(e) => onChange({ coverBgColor: e.target.value })} className="sr-only" />
            </label>
            <label className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-100 transition-opacity">
              <div className="w-6 h-6 rounded-full border-2 border-current" style={{ backgroundColor: accentHex }} />
              <span>Accent</span>
              <input type="color" value={data.coverAccentColor} onChange={(e) => onChange({ coverAccentColor: e.target.value })} className="sr-only" />
            </label>
          </div>
          <p className="text-[9px] font-mono uppercase tracking-[0.3em] rotate-90 whitespace-nowrap opacity-20" style={{ color: accentHex }}>
            Brand Identity Manual
          </p>
        </div>
      </div>
    </PageSlide>
  );
};

export default CoverPage;
