import { useState, useEffect } from 'react';
import { BrandData, TypefaceEntry, TypeStyle, FontWeight } from '../types';
import PageSlide from '../components/PageSlide';
import EditableText from '../components/EditableText';
import IdFontSelector from '../components/IdFontSelector';
import { loadGoogleFont } from '../../unbstype/constants';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TypographyPageProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  slide: 'typefaces' | 'hierarchy';
}

const ROLE_LABELS = { display: 'Display / Título', body: 'Corpo / Body', mono: 'Mono / Código', accent: 'Accent' };
const WEIGHT_LABELS: Record<FontWeight, string> = {
  100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular',
  500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
};

const TypographyPage = ({ data, onChange, slide }: TypographyPageProps) => {
  // Pré-carrega as fontes quando o slide é montado
  useEffect(() => {
    data.typefaces.forEach((tf) => {
      if (tf.source === 'google') loadGoogleFont(tf.name, tf.weights);
    });
  }, [data.typefaces]);

  if (slide === 'typefaces') {
    return (
      <PageSlide>
        <div className="h-full flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">04 — Tipografia</p>
            <h2 className="text-2xl font-bold mt-1">Fontes Oficiais</h2>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-5">
            {data.typefaces.map((tf) => (
              <div key={tf.id} className="border border-foreground/10 rounded-lg p-4 flex flex-col gap-3">
                {/* Preview */}
                <div className="border-b border-foreground/10 pb-3">
                  <p
                    className="text-4xl leading-tight font-bold truncate"
                    style={{ fontFamily: tf.name }}
                  >
                    {tf.previewText || tf.name}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    AaBbCcDdEe 0123456789
                  </p>
                </div>
                {/* Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-16">Fonte</span>
                    <IdFontSelector
                      value={tf.name}
                      onChange={(name) => {
                        const updated = data.typefaces.map((t) => t.id === tf.id ? { ...t, name } : t);
                        onChange({ typefaces: updated });
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-16">Papel</span>
                    <select
                      value={tf.role}
                      onChange={(e) => {
                        const updated = data.typefaces.map((t) => t.id === tf.id ? { ...t, role: e.target.value as TypefaceEntry['role'] } : t);
                        onChange({ typefaces: updated });
                      }}
                      className="text-xs bg-transparent border border-foreground/20 rounded px-2 py-0.5"
                    >
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-16">Pesos</span>
                    <div className="flex gap-1 flex-wrap">
                      {tf.weights.map((w) => (
                        <span
                          key={w}
                          className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono"
                          style={{ fontFamily: tf.name, fontWeight: w }}
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-16">Fallback</span>
                    <EditableText
                      value={tf.fallback}
                      onChange={(v) => {
                        const updated = data.typefaces.map((t) => t.id === tf.id ? { ...t, fallback: v } : t);
                        onChange({ typefaces: updated });
                      }}
                      className="text-xs font-mono text-muted-foreground"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">04</div>
        </div>
      </PageSlide>
    );
  }

  // slide === 'hierarchy'
  return (
    <PageSlide>
      <div className="h-full flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">04.2 — Tipografia</p>
          <h2 className="text-2xl font-bold mt-1">Hierarquia de Estilos</h2>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-foreground/10 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left py-2 font-normal w-20">Estilo</th>
                <th className="text-left py-2 font-normal">Família</th>
                <th className="text-left py-2 font-normal w-16">Tamanho</th>
                <th className="text-left py-2 font-normal w-16">Peso</th>
                <th className="text-left py-2 font-normal w-16">Line-H</th>
                <th className="text-left py-2 font-normal w-20">Tracking</th>
                <th className="text-left py-2 font-normal">Preview</th>
              </tr>
            </thead>
            <tbody>
              {data.typeStyles.map((ts) => (
                <tr key={ts.id} className="border-b border-foreground/5 hover:bg-muted/30 transition-colors">
                  <td className="py-2 font-bold text-[11px]">{ts.styleName}</td>
                  <td className="py-2">
                    <IdFontSelector
                      value={ts.fontFamily}
                      onChange={(v) => {
                        const updated = data.typeStyles.map((s) => s.id === ts.id ? { ...s, fontFamily: v } : s);
                        onChange({ typeStyles: updated });
                      }}
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      value={ts.size}
                      onChange={(e) => {
                        const updated = data.typeStyles.map((s) => s.id === ts.id ? { ...s, size: Number(e.target.value) } : s);
                        onChange({ typeStyles: updated });
                      }}
                      className="w-14 bg-transparent border-b border-foreground/20 outline-none text-xs"
                    />
                    <span className="text-muted-foreground ml-0.5">px</span>
                  </td>
                  <td className="py-2">
                    <select
                      value={ts.weight}
                      onChange={(e) => {
                        const updated = data.typeStyles.map((s) => s.id === ts.id ? { ...s, weight: Number(e.target.value) as FontWeight } : s);
                        onChange({ typeStyles: updated });
                      }}
                      className="bg-transparent border border-foreground/20 rounded px-1 py-0.5 text-xs"
                    >
                      {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      step="0.1"
                      value={ts.lineHeight}
                      onChange={(e) => {
                        const updated = data.typeStyles.map((s) => s.id === ts.id ? { ...s, lineHeight: Number(e.target.value) } : s);
                        onChange({ typeStyles: updated });
                      }}
                      className="w-14 bg-transparent border-b border-foreground/20 outline-none text-xs"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={ts.tracking}
                      onChange={(e) => {
                        const updated = data.typeStyles.map((s) => s.id === ts.id ? { ...s, tracking: Number(e.target.value) } : s);
                        onChange({ typeStyles: updated });
                      }}
                      className="w-14 bg-transparent border-b border-foreground/20 outline-none text-xs"
                    />
                    <span className="text-muted-foreground ml-0.5">em</span>
                  </td>
                  <td className="py-2 pl-2">
                    <span
                      className="truncate max-w-[120px] block"
                      style={{
                        fontFamily: ts.fontFamily,
                        fontSize: Math.min(ts.size * 0.5, 20),
                        fontWeight: ts.weight,
                        lineHeight: ts.lineHeight,
                        letterSpacing: `${ts.tracking}em`,
                      }}
                    >
                      Aa Bb Cc 123
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">04</div>
      </div>
    </PageSlide>
  );
};

export default TypographyPage;
