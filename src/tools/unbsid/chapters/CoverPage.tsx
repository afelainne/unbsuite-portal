import { useRef } from 'react';
import { BrandData } from '../types';
import PageSlide from '../components/PageSlide';
import EditableText from '../components/EditableText';
import { Upload } from 'lucide-react';

interface CoverPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
}

const CoverPage = ({ data, onChange }: CoverPageProps) => {
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

  return (
    <PageSlide
      noPadding
      bgColor={data.coverBgColor}
    >
      {/* Layout da capa: 60% esquerda conteúdo / 40% direita accent strip */}
      <div className="absolute inset-0 flex">
        {/* Esquerda — conteúdo */}
        <div className="flex-1 flex flex-col justify-between p-12" style={{ color: data.coverAccentColor }}>
          {/* Topo: versão + data */}
          <div className="flex items-center justify-between text-xs font-mono opacity-50">
            <EditableText
              value={data.version}
              onChange={(v) => onChange({ version: v })}
              className="uppercase tracking-widest"
            />
            <EditableText
              value={data.date}
              onChange={(v) => onChange({ date: v })}
            />
          </div>

          {/* Centro: logo + nome */}
          <div className="flex flex-col gap-6">
            {/* Logo upload */}
            <div className="w-32 h-16 group">
              {data.coverLogoUrl ? (
                <img
                  src={data.coverLogoUrl}
                  alt="Logo"
                  className="h-full object-contain cursor-pointer"
                  onClick={() => fileRef.current?.click()}
                  title="Clique para trocar o logo"
                />
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="h-full w-full border-2 border-dashed flex items-center justify-center gap-2 opacity-30 hover:opacity-60 transition-opacity rounded"
                  style={{ borderColor: data.coverAccentColor }}
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-xs">Upload Logo</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*,.svg" className="sr-only" onChange={handleLogoUpload} />
            </div>

            {/* Nome da marca */}
            <div>
              <EditableText
                value={data.name}
                onChange={(v) => onChange({ name: v })}
                as="h1"
                className="text-5xl font-black tracking-tight leading-none block"
              />
              <EditableText
                value={data.tagline}
                onChange={(v) => onChange({ tagline: v })}
                as="p"
                className="text-base mt-2 opacity-60 block"
              />
            </div>
          </div>

          {/* Rodapé: estúdio */}
          <div className="text-xs font-mono opacity-40">
            <span>Manual de Identidade Visual — </span>
            <EditableText
              value={data.studio}
              onChange={(v) => onChange({ studio: v })}
              className="inline"
            />
          </div>
        </div>

        {/* Direita — strip de accent */}
        <div
          className="w-[30%] flex flex-col items-center justify-end pb-12 gap-4"
          style={{ backgroundColor: data.coverAccentColor + '20' }}
        >
          {/* Color pickers inline */}
          <div className="flex flex-col items-center gap-2 text-[10px] opacity-40" style={{ color: data.coverAccentColor }}>
            <label className="flex flex-col items-center gap-1 cursor-pointer group hover:opacity-100 transition-opacity">
              <div
                className="w-6 h-6 rounded-full border-2 border-current"
                style={{ backgroundColor: data.coverBgColor }}
              />
              <span>Fundo</span>
              <input
                type="color"
                value={data.coverBgColor}
                onChange={(e) => onChange({ coverBgColor: e.target.value })}
                className="sr-only"
              />
            </label>
            <label className="flex flex-col items-center gap-1 cursor-pointer group hover:opacity-100 transition-opacity">
              <div
                className="w-6 h-6 rounded-full border-2 border-current"
                style={{ backgroundColor: data.coverAccentColor }}
              />
              <span>Accent</span>
              <input
                type="color"
                value={data.coverAccentColor}
                onChange={(e) => onChange({ coverAccentColor: e.target.value })}
                className="sr-only"
              />
            </label>
          </div>

          {/* Vertical label */}
          <p
            className="text-[9px] font-mono uppercase tracking-[0.3em] rotate-90 whitespace-nowrap opacity-20"
            style={{ color: data.coverAccentColor }}
          >
            Brand Identity Manual
          </p>
        </div>
      </div>
    </PageSlide>
  );
};

export default CoverPage;
