import React, { useMemo, useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { generateTonalScale } from '../utils/tonalScale';
import { getClosestColorName, getContrastColor } from '../utils/colorMath';
import {
  PALETTE_EXPORT_FORMATS,
  PaletteGroups,
  PaletteSwatch,
  slugifyColorName,
  toAse,
  toCssVariables,
  toDesignTokensJson,
  toGpl,
  toTailwindConfig
} from '../utils/paletteExport';
import { toSafeFileName } from '../utils/escape';
import { copyText, downloadBlob } from '../utils/browser';
import { ColorVisionToggle, VisionCaption, VisionMode, simulateVision } from './ColorVisionToggle';
import type { Translations } from '../i18n';
import { Card } from './ui';

interface TonalScaleCardProps {
  t: Translations;
  hex: string;
  onSelect: (hex: string) => void;
  /** Shows a transient message in the host (copy/download feedback). */
  onFeedback: (message: string) => void;
  className?: string;
}

type ScaleExport = 'css' | 'tailwind' | 'dtcg' | 'ase' | 'gpl';

export const TonalScaleCard: React.FC<TonalScaleCardProps> = ({ t, hex, onSelect, onFeedback, className = '' }) => {
  const [vision, setVision] = useState<VisionMode>('normal');
  const scale = useMemo(() => generateTonalScale(hex), [hex]);

  if (!scale) return null;

  const baseName = getClosestColorName(scale.base);
  const slug = slugifyColorName(baseName, 'color');
  const swatches: PaletteSwatch[] = scale.swatches.map((s) => ({ name: `${slug}-${s.step}`, hex: s.hex }));
  const groups: PaletteGroups = {
    [slug]: Object.fromEntries(scale.swatches.map((s) => [s.step, s.hex])) as Record<number, string>
  };
  const paletteTitle = `${baseName} ${scale.base}`;
  const fileBase = toSafeFileName(`${slug}-scale`, 'tonal-scale');

  const copy = async (text: string) => {
    onFeedback((await copyText(text)) ? t.copiedToClipboard : t.copyFailed);
  };

  const download = (content: string | Uint8Array, format: 'dtcg' | 'ase' | 'gpl') => {
    const meta = PALETTE_EXPORT_FORMATS[format];
    downloadBlob(new Blob([content as BlobPart], { type: meta.mime }), `${fileBase}.${meta.extension}`);
    onFeedback(t.downloaded);
  };

  const handleExport = (kind: ScaleExport) => {
    switch (kind) {
      case 'css':
        void copy(toCssVariables(swatches));
        break;
      case 'tailwind':
        void copy(toTailwindConfig(groups));
        break;
      case 'dtcg':
        download(toDesignTokensJson(groups, { description: paletteTitle }), 'dtcg');
        break;
      case 'ase':
        download(toAse(swatches, { groupName: paletteTitle }), 'ase');
        break;
      case 'gpl':
        download(toGpl(swatches, { name: paletteTitle }), 'gpl');
        break;
    }
  };

  const exportButtons: { kind: ScaleExport; label: string; action: 'copy' | 'download' }[] = [
    { kind: 'css', label: t.exportFormatCss, action: 'copy' },
    { kind: 'tailwind', label: t.exportFormatTailwind, action: 'copy' },
    { kind: 'dtcg', label: t.exportFormatDtcg, action: 'download' },
    { kind: 'ase', label: 'ASE', action: 'download' },
    { kind: 'gpl', label: 'GPL', action: 'download' }
  ];

  return (
    <Card className={className} aria-labelledby="unbscolor-tonal-title" label={<span id="unbscolor-tonal-title">{t.tonalScale}</span>}>
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-muted-foreground">{t.tonalScaleHint}</p>
          <ColorVisionToggle t={t} value={vision} onChange={setVision} />
        </div>

      <div className="grid grid-cols-6 sm:grid-cols-11 gap-x-1.5 gap-y-4">
        {scale.swatches.map((s) => {
          const shown = simulateVision(s.hex, vision);
          return (
            <button
              type="button"
              key={s.step}
              onClick={() => onSelect(s.hex)}
              title={`${s.step} · ${s.hex}`}
              aria-label={`${s.step} ${s.hex}${s.isBase ? ` (${t.baseStep})` : ''}`}
              aria-current={s.isBase ? 'true' : undefined}
              className="group flex flex-col items-stretch gap-1.5 text-left press min-w-0"
            >
              <span
                className={`relative h-16 rounded-sm transition-shadow duration-fast ease-out ${
                  s.isBase ? 'ring-[1.5px] ring-foreground ring-offset-2 ring-offset-card' : 'shadow-hairline group-hover:shadow-hairline-strong'
                }`}
                style={{ backgroundColor: shown }}
              >
                {s.isBase && (
                  <span
                    className="absolute top-1.5 left-1.5 text-[11px] leading-none"
                    style={{ color: getContrastColor(shown) }}
                  >
                    {t.baseStep}
                  </span>
                )}
              </span>
              <span className="text-[12px] tabular text-foreground">{s.step}</span>
              <span className="text-[11px] tabular text-muted-foreground truncate">{shown.replace('#', '')}</span>
            </button>
          );
        })}
      </div>

        <VisionCaption t={t} mode={vision} />

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[14px] text-muted-foreground mr-2">{t.exportScale}</span>
          {exportButtons.map((b) => (
            <button
              type="button"
              key={b.kind}
              onClick={() => handleExport(b.kind)}
              className="ctl ctl-outline ctl-sm"
              title={`${b.action === 'copy' ? t.copy : t.download}: ${b.label}`}
            >
              {b.action === 'copy' ? <Copy aria-hidden="true" /> : <Download aria-hidden="true" />}
              {b.label}
            </button>
          ))}
        </div>
    </Card>
  );
};
