/**
 * Prévia da folha de marca em tela cheia, só para ver.
 *
 * Recebe a MESMA imagem que a prévia pequena do painel — o SVG da folha em
 * data URI —, então não há segundo pipeline e a ampliação é vetorial, não um
 * bitmap esticado. Nada aqui edita a folha: só ajustar à tela ou ver a 100 %.
 *
 * O foco, o Esc e o clique fora ficam por conta do Dialog do Radix, que
 * devolve o foco ao botão que abriu.
 */
import React, { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { Dialog, DialogOverlay, DialogPortal, DialogTitle, DialogDescription } from './ui/dialog';
import type { PageUnit } from '../lib/brandsheet';
import { useLanguage } from '../i18n';

export interface SheetPreviewOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Data URI do SVG da folha, o mesmo da prévia pequena. */
  uri: string;
  /** Largura e altura na unidade nativa do formato, já com a orientação. */
  native: { width: number; height: number; unit: PageUnit };
  /** Legenda do formato, ex. "A4 retrato · 210 × 297 mm". */
  label: string;
  /** Título da folha, mostrado na barra. */
  title: string;
}

/** 96 dpi: é assim que o navegador converte milímetro em pixel de tela. */
const PX_PER_MM = 96 / 25.4;

const SheetPreviewOverlay: React.FC<SheetPreviewOverlayProps> = ({
  open, onOpenChange, uri, native, label, title,
}) => {
  const { t } = useLanguage();
  const b = t.brandSheet;
  const [full, setFull] = useState(false);

  // Cada abertura começa ajustada à tela.
  useEffect(() => {
    if (open) setFull(false);
  }, [open]);

  const pxWidth = Math.round(native.unit === 'mm' ? native.width * PX_PER_MM : native.width);
  const pxHeight = Math.round(native.unit === 'mm' ? native.height * PX_PER_MM : native.height);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-foreground/70 backdrop-blur-sm duration-base ease-out" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none duration-base ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          data-brandsheet-zoom=""
        >
          {/* O Radix liga título e descrição ao Content pelo contexto; dar um
              id próprio a eles quebraria essa ligação e o leitor de tela. */}
          <DialogTitle className="sr-only">{b.expandedTitle}</DialogTitle>
          <DialogDescription className="sr-only">{b.expandedDescription}</DialogDescription>

          <div className="flex items-center justify-between gap-2 px-4 py-3 text-primary-foreground">
            <span className="min-w-0">
              <span className="block truncate text-callout font-medium">{title}</span>
              <span className="block truncate text-footnote text-primary-foreground/70 tabular-nums">{label}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFull(v => !v)}
                aria-pressed={full}
                className="ctl ctl-plain ctl-sm text-primary-foreground hover:bg-primary-foreground/15"
                title={full ? b.zoomFitHint : b.zoomFullHint}
              >
                {full
                  ? <><Minimize2 className="h-3.5 w-3.5" /> {b.zoomFit}</>
                  : <><Maximize2 className="h-3.5 w-3.5" /> {b.zoomFull}</>}
              </button>
              <DialogPrimitive.Close
                className="ctl ctl-plain ctl-icon text-primary-foreground hover:bg-primary-foreground/15"
                aria-label={t.common.close}
                title={t.common.close}
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </span>
          </div>

          {/* Clique no vazio em volta da folha fecha, como num visualizador.
              O Content cobre a tela inteira, então o fundo não é o overlay do
              Radix e o descarte por clique fora não chegaria aqui sozinho. */}
          <div
            onClick={(event) => { if (event.target === event.currentTarget) onOpenChange(false); }}
            className={`flex-1 min-h-0 px-4 pb-4 ${full ? 'overflow-auto' : 'overflow-hidden flex items-center justify-center'}`}
          >
            {uri ? (
              <img
                src={uri}
                alt={b.previewAlt}
                className={full ? 'block mx-auto shadow-sheet' : 'max-h-full max-w-full object-contain shadow-sheet'}
                style={full ? { width: pxWidth, height: pxHeight, maxWidth: 'none' } : undefined}
              />
            ) : (
              <span className="text-callout text-primary-foreground/70">{b.previewLoad}</span>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default SheetPreviewOverlay;
