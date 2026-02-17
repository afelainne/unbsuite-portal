import React, { useCallback, useRef, useState } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageLoad: (dataUrl: string) => void;
  hasImage: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageLoad, hasImage }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) onImageLoad(e.target.result as string);
    };
    reader.readAsDataURL(file);
  }, [onImageLoad]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
        isDragging
          ? 'border-accent bg-accent/10'
          : hasImage
            ? 'border-accent/40 bg-accent/5'
            : 'border-border/40 hover:border-border/60'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {hasImage ? (
        <div className="flex items-center justify-center gap-2">
          <ImageIcon className="h-4 w-4 text-accent" />
          <span className="font-mono text-[10px] text-muted-foreground">Click or drop to replace</span>
        </div>
      ) : (
        <div className="space-y-2">
          <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="font-mono text-[10px] text-muted-foreground">Drop image or click to upload</p>
          <p className="font-mono text-[8px] text-muted-foreground/60">PNG, JPG, SVG, WEBP</p>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
