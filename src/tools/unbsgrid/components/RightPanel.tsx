import React from 'react';
import { PanelRightClose } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { useLanguage, fill } from '../i18n';

interface Props {
  /** Panel state. On narrow screens it drives the sheet instead. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Narrow screen: the panel becomes a sheet, like the left one. */
  asSheet?: boolean;
  /** Micro label of the panel head, also the sheet title. */
  title: string;
  /** One line describing the panel, for screen readers inside the sheet. */
  description: string;
  children: React.ReactNode;
}

/**
 * Right-hand panel, collapsible.
 *
 * On a wide screen it is a white card floating on the page, beside the canvas
 * frame, scrolling inside. The button that opens it lives in the title row,
 * so closing it gives the whole width back to the canvas without leaving a
 * control floating over the drawing.
 */
const RightPanel: React.FC<Props> = ({ open, onOpenChange, asSheet = false, title, description, children }) => {
  const { t } = useLanguage();
  const closeLabel = fill(t.common.closePanelOf, { name: title.toLowerCase() });

  if (asSheet) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[340px] max-w-[92vw] gap-0 p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-1 text-left">
            <SheetTitle className="label text-foreground">{title}</SheetTitle>
            <SheetDescription className="sr-only">{description}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pt-3 pb-6">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!open) return null;

  return (
    <aside
      className="material-card p-0 w-[300px] min-w-[300px] min-h-0 flex flex-col overflow-hidden text-foreground"
      aria-label={title}
    >
      <div className="card-head pl-5 pr-4 pt-4 pb-2">
        <span className="label text-foreground truncate">{title}</span>
        <span className="card-actions -mr-1.5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ctl ctl-plain ctl-icon text-muted-foreground"
            aria-label={closeLabel}
            title={closeLabel}
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pl-5 pr-3 pt-2 pb-6">{children}</div>
    </aside>
  );
};

export default RightPanel;
