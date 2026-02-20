import { BrandData } from '../types';
import PageSlide from '../components/PageSlide';
import { ManualTheme } from '../themes';
import { exportBrandJson, exportTokensJson, exportPdf } from '../services/exportService';
import { FileJson, Download, Printer, Check, Circle } from 'lucide-react';

interface DeliverablesPageProps {
  data: BrandData;
  theme?: ManualTheme;
}

const DeliverablesPage = ({ data, theme }: DeliverablesPageProps) => {
  const accent = theme?.accentColor || 'hsl(var(--primary))';

  const checklist = [
    { id: 'logo-svg',   label: 'Logo SVG (variantes)',         done: data.logoVariants.some((v) => !!v.dataUrl) },
    { id: 'logo-png',   label: 'Logo PNG transparente',         done: data.logoVariants.some((v) => !!v.dataUrl) },
    { id: 'palette',    label: 'Paleta de cores definida',       done: data.palette.length > 0 },
    { id: 'neutrals',   label: 'Escala de neutros',             done: data.neutrals.length >= 5 },
    { id: 'gradients',  label: 'Gradientes documentados',        done: data.gradients.length > 0 },
    { id: 'typo',       label: 'Fontes oficiais definidas',      done: data.typefaces.length > 0 },
    { id: 'hierarchy',  label: 'Hierarquia tipográfica',         done: data.typeStyles.length >= 3 },
    { id: 'icons',      label: 'Sistema de ícones configurado', done: !!data.iconStyle.style },
    { id: 'voice',      label: 'Tom de voz documentado',        done: data.voiceDos.length > 0 },
    { id: 'templates',  label: 'Templates de mensagem',          done: data.voiceTemplates.length >= 3 },
    { id: 'theme',      label: 'Tema do manual definido',        done: !!data.themeId && data.themeId !== 'studio' || data.themeId === 'studio' },
    { id: 'grid',       label: 'Grid responsivo configurado',    done: (data.gridBreakpoints?.length ?? 0) >= 2 },
    { id: 'mockups',    label: 'Mockups de aplicação',          done: data.mockupRefs.length > 0 },
  ];

  const completed = checklist.filter((c) => c.done).length;
  const total = checklist.length;
  const progress = Math.round((completed / total) * 100);

  return (
    <PageSlide theme={theme}>
      <div className="h-full flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">09 — Entregáveis</p>
          <h2 className="text-2xl font-bold mt-1" style={{ fontFamily: theme?.headingFont }}>Checklist & Export</h2>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-8">
          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest opacity-50">Status do manual</p>
              <span className="text-sm font-bold" style={{ color: accent }}>{progress}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-muted rounded-full mb-4 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: accent }} />
            </div>

            <div className="space-y-1.5 overflow-auto max-h-48">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5">
                  {item.done ? (
                    <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                  ) : (
                    <Circle className="h-3.5 w-3.5 flex-shrink-0 opacity-20" />
                  )}
                  <span className={`text-xs ${item.done ? 'opacity-90' : 'opacity-40'}`}>{item.label}</span>
                </div>
              ))}
            </div>

            <p className="text-[10px] opacity-40 mt-3">{completed}/{total} itens concluídos</p>
          </div>

          {/* Export */}
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-widest opacity-50">Exportar</p>

            <button onClick={() => exportBrandJson(data)} className="flex items-center gap-3 p-4 border border-foreground/10 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group text-left" style={{ borderRadius: theme?.borderRadius }}>
              <FileJson className="h-5 w-5 opacity-50 group-hover:text-primary transition-colors" />
              <div>
                <p className="text-sm font-semibold">brand.json</p>
                <p className="text-[11px] opacity-50">Fonte da verdade — todos os dados da marca</p>
              </div>
            </button>

            <button onClick={() => exportTokensJson(data)} className="flex items-center gap-3 p-4 border border-foreground/10 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group text-left" style={{ borderRadius: theme?.borderRadius }}>
              <Download className="h-5 w-5 opacity-50 group-hover:text-primary transition-colors" />
              <div>
                <p className="text-sm font-semibold">tokens.json</p>
                <p className="text-[11px] opacity-50">Design tokens prontos para desenvolvimento</p>
              </div>
            </button>

            <button onClick={exportPdf} className="flex items-center gap-3 p-4 border border-foreground/20 bg-foreground/5 rounded-xl hover:bg-foreground/10 transition-all group text-left" style={{ borderRadius: theme?.borderRadius }}>
              <Printer className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">PDF / Imprimir</p>
                <p className="text-[11px] opacity-50">Manual completo em A4 landscape</p>
              </div>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono opacity-40 border-t border-foreground/10 pt-3">
          <span>UNBSID — Brand Identity Builder</span>
          <span>{data.name} · {data.version} · {data.date}</span>
        </div>

        <div className="absolute bottom-8 right-10 text-[80px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.04 }}>09</div>
      </div>
    </PageSlide>
  );
};

export default DeliverablesPage;
