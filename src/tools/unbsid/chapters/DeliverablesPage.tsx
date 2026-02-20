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
    { id: 'palette',    label: 'Paleta de cores definida',       done: data.palette.length > 0 },
    { id: 'neutrals',   label: 'Escala de neutros',             done: data.neutrals.length >= 5 },
    { id: 'gradients',  label: 'Gradientes documentados',        done: data.gradients.length > 0 },
    { id: 'typo',       label: 'Fontes oficiais definidas',      done: data.typefaces.length > 0 },
    { id: 'hierarchy',  label: 'Hierarquia tipográfica',         done: data.typeStyles.length >= 3 },
    { id: 'icons',      label: 'Sistema de ícones configurado', done: !!data.iconStyle.style },
    { id: 'voice',      label: 'Tom de voz documentado',        done: data.voiceDos.length > 0 },
    { id: 'templates',  label: 'Templates de mensagem',          done: data.voiceTemplates.length >= 3 },
    { id: 'theme',      label: 'Tema do manual definido',        done: !!data.themeId },
    { id: 'grid',       label: 'Grid responsivo configurado',    done: (data.gridBreakpoints?.length ?? 0) >= 2 },
    { id: 'mockups',    label: 'Mockups de aplicação',          done: data.mockupRefs.length > 0 },
    { id: 'clearspace', label: 'Área de proteção do logo',       done: !!data.clearSpaceRule },
  ];

  const completed = checklist.filter((c) => c.done).length;
  const total = checklist.length;
  const progress = Math.round((completed / total) * 100);

  return (
    <PageSlide theme={theme}>
      <div className="absolute inset-0 px-10 py-8 flex flex-col gap-4 overflow-hidden">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">09 — Entregáveis</p>
          <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: theme?.headingFont }}>Checklist & Export</h2>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-8 min-h-0 overflow-hidden">
          {/* Checklist */}
          <div className="flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-[9px] uppercase tracking-[0.2em] opacity-40">Status do manual</p>
              <span className="text-sm font-bold" style={{ color: accent }}>{progress}%</span>
            </div>

            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: accent }} />
            </div>

            <div className="flex flex-col gap-1 overflow-y-auto flex-1">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  {item.done ? (
                    <Check className="h-3 w-3 flex-shrink-0" style={{ color: '#22c55e' }} />
                  ) : (
                    <Circle className="h-3 w-3 flex-shrink-0 opacity-15" />
                  )}
                  <span className={`text-[10px] ${item.done ? 'opacity-80' : 'opacity-30'}`}>{item.label}</span>
                </div>
              ))}
            </div>

            <p className="text-[9px] opacity-30">{completed}/{total} itens concluídos</p>
          </div>

          {/* Export */}
          <div className="flex flex-col gap-2 overflow-hidden">
            <p className="text-[9px] uppercase tracking-[0.2em] opacity-40">Exportar</p>

            <button onClick={() => exportBrandJson(data)} className="flex items-center gap-3 p-3 border border-foreground/8 rounded hover:border-primary hover:bg-primary/5 transition-all group text-left" style={{ borderRadius: theme?.borderRadius }}>
              <FileJson className="h-4 w-4 opacity-40 group-hover:text-primary transition-colors flex-shrink-0" />
              <div>
                <p className="text-[11px] font-semibold">brand.json</p>
                <p className="text-[9px] opacity-40">Fonte da verdade — todos os dados da marca</p>
              </div>
            </button>

            <button onClick={() => exportTokensJson(data)} className="flex items-center gap-3 p-3 border border-foreground/8 rounded hover:border-primary hover:bg-primary/5 transition-all group text-left" style={{ borderRadius: theme?.borderRadius }}>
              <Download className="h-4 w-4 opacity-40 group-hover:text-primary transition-colors flex-shrink-0" />
              <div>
                <p className="text-[11px] font-semibold">tokens.json</p>
                <p className="text-[9px] opacity-40">Design tokens prontos para desenvolvimento</p>
              </div>
            </button>

            <button onClick={exportPdf} className="flex items-center gap-3 p-3 border border-foreground/8 bg-muted/20 rounded hover:bg-muted/40 transition-all group text-left" style={{ borderRadius: theme?.borderRadius }}>
              <Printer className="h-4 w-4 opacity-50 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-semibold">PDF / Imprimir</p>
                <p className="text-[9px] opacity-40">Manual completo</p>
              </div>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[9px] font-mono opacity-30 border-t border-foreground/8 pt-3">
          <span>UNBSID — Brand Identity Builder</span>
          <span>{data.name} · {data.version} · {data.date}</span>
        </div>

        <div className="absolute bottom-6 right-8 text-[60px] font-black pointer-events-none select-none" style={{ opacity: theme?.decoratorOpacity ?? 0.03 }}>09</div>
      </div>
    </PageSlide>
  );
};

export default DeliverablesPage;
