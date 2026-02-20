import { BrandData } from '../types';
import PageSlide from '../components/PageSlide';
import { exportBrandJson, exportTokensJson, exportPdf } from '../services/exportService';
import { FileJson, Download, Printer, Check, Circle } from 'lucide-react';

interface DeliverablesPageProps {
  data: BrandData;
}

const DeliverablesPage = ({ data }: DeliverablesPageProps) => {
  const checklist = [
    { id: 'logo-svg', label: 'Logo SVG (variantes)', done: data.logoVariants.some((v) => !!v.dataUrl) },
    { id: 'logo-png', label: 'Logo PNG transparente', done: data.logoVariants.some((v) => !!v.dataUrl) },
    { id: 'palette', label: 'Paleta de cores definida', done: data.palette.length > 0 },
    { id: 'neutrals', label: 'Escala de neutros', done: data.neutrals.length >= 5 },
    { id: 'typo', label: 'Fontes oficiais definidas', done: data.typefaces.length > 0 },
    { id: 'hierarchy', label: 'Hierarquia tipográfica', done: data.typeStyles.length >= 3 },
    { id: 'icons', label: 'Sistema de ícones configurado', done: !!data.iconStyle.style },
    { id: 'voice', label: 'Tom de voz documentado', done: data.voiceDos.length > 0 },
    { id: 'mockups', label: 'Mockups de aplicação', done: data.mockupRefs.length > 0 },
  ];

  const completed = checklist.filter((c) => c.done).length;
  const total = checklist.length;
  const progress = Math.round((completed / total) * 100);

  return (
    <PageSlide>
      <div className="h-full flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">09 — Entregáveis</p>
          <h2 className="text-2xl font-bold mt-1">Checklist & Export</h2>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-8">
          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Status do manual</p>
              <span className="text-sm font-bold text-primary">{progress}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-muted rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-2">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5">
                  {item.done ? (
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-foreground/20 flex-shrink-0" />
                  )}
                  <span className={`text-xs ${item.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground mt-4">
              {completed}/{total} itens concluídos
            </p>
          </div>

          {/* Export */}
          <div className="flex flex-col gap-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Exportar</p>

            <button
              onClick={() => exportBrandJson(data)}
              className="flex items-center gap-3 p-4 border border-foreground/10 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group text-left"
            >
              <FileJson className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <div>
                <p className="text-sm font-semibold">brand.json</p>
                <p className="text-[11px] text-muted-foreground">Fonte da verdade — todos os dados da marca</p>
              </div>
            </button>

            <button
              onClick={() => exportTokensJson(data)}
              className="flex items-center gap-3 p-4 border border-foreground/10 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group text-left"
            >
              <Download className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <div>
                <p className="text-sm font-semibold">tokens.json</p>
                <p className="text-[11px] text-muted-foreground">Design tokens prontos para desenvolvimento</p>
              </div>
            </button>

            <button
              onClick={exportPdf}
              className="flex items-center gap-3 p-4 border border-foreground/20 bg-foreground/5 rounded-xl hover:bg-foreground/10 transition-all group text-left"
            >
              <Printer className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">PDF / Imprimir</p>
                <p className="text-[11px] text-muted-foreground">Manual completo em A4 landscape</p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-foreground/10 pt-3">
          <span>UNBSID — Brand Identity Builder</span>
          <span>{data.name} · {data.version} · {data.date}</span>
        </div>

        <div className="absolute bottom-8 right-10 text-[80px] font-black text-foreground/3 pointer-events-none select-none">09</div>
      </div>
    </PageSlide>
  );
};

export default DeliverablesPage;
