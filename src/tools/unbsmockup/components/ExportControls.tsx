import React, { useCallback } from 'react';
import { Download } from 'lucide-react';
import { MockupTemplate } from '../templates';

interface ExportControlsProps {
  svgRef: React.RefObject<SVGSVGElement>;
  template: MockupTemplate;
  disabled: boolean;
}

const ExportControls: React.FC<ExportControlsProps> = ({ svgRef, template, disabled }) => {
  const exportSvg = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mockup-${template.id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [svgRef, template.id]);

  const exportPng = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const scale = 2;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = template.width * scale;
      canvas.height = template.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `mockup-${template.id}.png`;
        a.click();
        URL.revokeObjectURL(pngUrl);
      }, 'image/png');
    };
    img.src = url;
  }, [svgRef, template]);

  return (
    <div className="flex gap-2">
      <button
        onClick={exportPng}
        disabled={disabled}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-30 bg-foreground text-background hover:bg-foreground/90"
      >
        <Download className="h-3.5 w-3.5" /> PNG 2×
      </button>
      <button
        onClick={exportSvg}
        disabled={disabled}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-30 border border-border hover:bg-muted"
      >
        <Download className="h-3.5 w-3.5" /> SVG
      </button>
    </div>
  );
};

export default ExportControls;
