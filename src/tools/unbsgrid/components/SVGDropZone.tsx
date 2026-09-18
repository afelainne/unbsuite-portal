import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage, fill } from '../i18n';

interface SVGDropZoneProps {
  /** Receives the file contents and, when it came from a file, its name. */
  onSVGLoaded: (svgString: string, fileName?: string) => void;
  /** "lg" is the big empty-state area in the middle of the canvas. */
  size?: 'sm' | 'lg';
}

const SVG_NAME = /\.svg$/i;

const SVGDropZone: React.FC<SVGDropZoneProps> = ({ onSVGLoaded, size = 'sm' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useLanguage();

  const handleFile = useCallback((file: File) => {
    if (file.type !== 'image/svg+xml' && !SVG_NAME.test(file.name)) {
      toast.error(t.input.invalidFile, { description: fill(t.input.invalidFileDescription, { name: file.name }) });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string' && text.trim()) onSVGLoaded(text, file.name);
      else toast.error(t.input.emptyFile, { description: fill(t.input.emptyFileDescription, { name: file.name }) });
    };
    reader.onerror = () => {
      toast.error(t.input.readFailed, { description: reader.error?.message ?? file.name });
    };
    reader.readAsText(file);
  }, [onSVGLoaded, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const openPicker = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.svg,image/svg+xml';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [handleFile]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  }, [openPicker]);

  const large = size === 'lg';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t.input.dropAria}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={openPicker}
      onKeyDown={handleKeyDown}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center cursor-pointer select-none press transition-colors duration-fast ease-out outline-none focus-visible:shadow-focus ${
        large ? 'w-full max-w-[420px] gap-2 px-8 py-12 material-card' : 'px-4 py-4'
      } ${isDragging ? 'border-tint bg-fill-2' : `border-separator-strong ${large ? '' : 'bg-fill'} hover:bg-fill-2`}`}
    >
      <Upload
        className={`flex-shrink-0 transition-colors duration-fast ease-out ${large ? 'h-8 w-8' : 'h-5 w-5'} ${isDragging ? 'text-tint' : 'text-muted-foreground'}`}
        strokeWidth={2}
      />
      <span className={large ? 'text-title-3 text-foreground' : 'text-headline text-foreground'}>{t.input.dropTitle}</span>
      <span className="text-footnote text-muted-foreground">{t.input.dropHint}</span>
      {large && (
        <span className="text-caption text-muted-foreground mt-1 max-w-[320px]">
          {t.input.dropPrivacy}
        </span>
      )}
    </div>
  );
};

export default SVGDropZone;
