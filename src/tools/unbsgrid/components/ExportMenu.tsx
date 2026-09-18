import React, { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useLanguage, type Translations } from '../i18n';
import { TITLE_ICON_BTN } from './chrome-classes';

export type ExportKind = 'layered-svg' | 'svg' | 'outline-svg' | 'png-1' | 'png-2' | 'png-4' | 'pdf';

interface ExportItem {
  kind: ExportKind;
  title: string;
  description: string;
}

const sectionsFor = (m: Translations['exportMenu']): Array<{ label: string; items: ExportItem[] }> => [
  {
    label: m.vector,
    items: [
      { kind: 'layered-svg', title: m.layeredTitle, description: m.layeredDescription },
      { kind: 'svg', title: m.plainTitle, description: m.plainDescription },
      { kind: 'outline-svg', title: m.outlineTitle, description: m.outlineDescription },
      { kind: 'pdf', title: m.pdfTitle, description: m.pdfDescription },
    ],
  },
  {
    label: m.image,
    items: [
      { kind: 'png-1', title: m.png1Title, description: m.png1Description },
      { kind: 'png-2', title: m.png2Title, description: m.png2Description },
      { kind: 'png-4', title: m.png4Title, description: m.png4Description },
    ],
  },
];

interface ExportMenuProps {
  disabled?: boolean;
  onExport: (kind: ExportKind) => void | Promise<void>;
  /** Estimated final size per format, e.g. "SVG 1024 px" / "≈ 2048 × 1365 px". */
  sizeHints?: Partial<Record<ExportKind, string>>;
}

/** Square button in the title row that opens every export format in a popover below it. */
const ExportMenu: React.FC<ExportMenuProps> = ({ disabled, onExport, sizeHints }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const { t } = useLanguage();
  const sections = sectionsFor(t.exportMenu);

  const run = async (kind: ExportKind) => {
    setBusy(kind);
    try {
      await onExport(kind);
      setOpen(false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={t.exportMenu.more}
          title={t.exportMenu.more}
          aria-pressed={open}
          className={`${TITLE_ICON_BTN} ${open ? 'ctl-active' : ''}`}
        >
          <ChevronDown className="h-4 w-4 transition-transform duration-base ease-out" style={{ transform: open ? 'rotate(180deg)' : undefined }} />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" sideOffset={8} className="w-[280px] p-2 rounded-lg">
        <div role="menu" aria-label={t.exportMenu.formats} className="space-y-1.5">
          {sections.map(section => (
            <div key={section.label} className="space-y-0.5">
              <span className="label block px-2.5 pt-1">{section.label}</span>
              {section.items.map(item => (
                <button
                  key={item.kind}
                  type="button"
                  role="menuitem"
                  disabled={busy !== null}
                  onClick={() => run(item.kind)}
                  className="row h-auto flex-col items-start gap-0 py-2 disabled:opacity-[0.38]"
                >
                  <span className="flex w-full items-center gap-1.5 text-callout font-medium text-foreground">
                    {item.title}
                    {busy === item.kind && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </span>
                  <span className="text-caption text-muted-foreground">{item.description}</span>
                  {sizeHints?.[item.kind] && (
                    <span className="text-caption text-foreground tabular-nums">{sizeHints[item.kind]}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ExportMenu;
