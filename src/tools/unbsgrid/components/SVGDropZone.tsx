import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';

const THEME = {
  text: 'hsl(var(--foreground))',
  accent: 'hsl(var(--accent))',
  border: 'hsl(var(--border))',
  muted: '#888',
  hoverBorder: '#999',
};

interface SVGDropZoneProps {
  onSVGLoaded: (svgString: string) => void;
}

const SVGDropZone: React.FC<SVGDropZoneProps> = ({ onSVGLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (file.type !== 'image/svg+xml' && !file.name.endsWith('.svg')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) onSVGLoaded(text);
    };
    reader.readAsText(file);
  }, [onSVGLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.svg,image/svg+xml';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [handleFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={handleClick}
      className="flex items-center justify-center gap-1.5 rounded border border-dashed cursor-pointer transition-all px-2 py-1.5"
      style={{
        borderColor: isDragging ? THEME.accent : THEME.border,
        backgroundColor: isDragging ? `${THEME.accent}15` : 'transparent',
      }}
    >
      <Upload className="h-3 w-3 flex-shrink-0" style={{ color: THEME.muted }} />
      <span className="text-[9px]" style={{ color: THEME.muted }}>Drop SVG or click to upload</span>
    </div>
  );
};

export default SVGDropZone;
