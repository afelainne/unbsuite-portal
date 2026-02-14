import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';

interface SVGDropZoneProps {
  onSVGLoaded: (svgString: string) => void;
}

const SVGDropZone: React.FC<SVGDropZoneProps> = ({ onSVGLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (file.type !== 'image/svg+xml' && !file.name.endsWith('.svg')) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) onSVGLoaded(text);
    };
    reader.readAsText(file);
  }, [onSVGLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg,image/svg+xml';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [handleFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`
        flex items-center justify-center gap-2 rounded-md border border-dashed 
        cursor-pointer transition-all duration-200 px-3 py-2
        ${isDragging 
          ? 'border-primary bg-primary/10' 
          : 'border-border hover:border-muted-foreground hover:bg-surface-hover'
        }
      `}
    >
      <Upload className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-[10px] text-muted-foreground">Drop SVG or click to upload</span>
    </div>
  );
};

export default SVGDropZone;
