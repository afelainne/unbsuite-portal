import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TEMPLATES, EditableField } from './templates';
import TemplatePicker from './components/TemplatePicker';
import ImageUploader from './components/ImageUploader';
import DeviceFrame from './components/DeviceFrame';
import ExportControls from './components/ExportControls';
import { RotateCcw, Upload, User } from 'lucide-react';

function getDefaultFieldValues(fields?: EditableField[]): Record<string, string> {
  if (!fields) return {};
  const vals: Record<string, string> = {};
  for (const f of fields) {
    if (f.type === 'text') vals[f.id] = f.defaultValue;
  }
  return vals;
}

const UnbsMockupApp: React.FC = () => {
  const [selectedId, setSelectedId] = useState(TEMPLATES[0].id);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState('#f5f0eb');
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const template = TEMPLATES.find(t => t.id === selectedId) || TEMPLATES[0];

  // Reset field values when template changes
  useEffect(() => {
    setFieldValues(getDefaultFieldValues(template.editableFields));
  }, [template.id]);

  const resetAdjustments = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleAvatarFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) setAvatarSrc(e.target.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const hasEditableFields = template.editableFields && template.editableFields.length > 0;
  const textFields = template.editableFields?.filter(f => f.type === 'text') || [];
  const hasAvatar = template.editableFields?.some(f => f.type === 'avatar') || false;

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Sidebar */}
        <div className="space-y-6 order-2 lg:order-1">
          {/* Upload */}
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Image</span>
            <ImageUploader onImageLoad={setImageSrc} hasImage={!!imageSrc} />
          </div>

          {/* Background color */}
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Background</span>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="flex-1 font-mono text-[11px] px-3 py-2 rounded-lg border border-border bg-background"
              />
            </div>
          </div>

          {/* Image adjustment */}
          {imageSrc && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Adjust Image</span>
                <button
                  onClick={resetAdjustments}
                  className="p-1 rounded hover:bg-muted/50 transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-[8px] text-muted-foreground">Zoom</span>
                    <span className="font-mono text-[8px] text-muted-foreground">{zoom.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none bg-border accent-foreground"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-[8px] text-muted-foreground">X Offset</span>
                    <span className="font-mono text-[8px] text-muted-foreground">{(offsetX * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.01"
                    value={offsetX}
                    onChange={(e) => setOffsetX(parseFloat(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none bg-border accent-foreground"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-[8px] text-muted-foreground">Y Offset</span>
                    <span className="font-mono text-[8px] text-muted-foreground">{(offsetY * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.01"
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseFloat(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none bg-border accent-foreground"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Content editing - only for templates with editable fields */}
          {hasEditableFields && (
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Content</span>
              <div className="space-y-3">
                {/* Avatar upload */}
                {hasAvatar && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="w-10 h-10 rounded-full border border-border bg-muted/50 flex items-center justify-center overflow-hidden hover:border-accent transition-colors flex-shrink-0"
                      title="Upload avatar"
                    >
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1">
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        className="font-mono text-[9px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        <Upload className="h-3 w-3" />
                        {avatarSrc ? 'Replace avatar' : 'Upload avatar'}
                      </button>
                      {avatarSrc && (
                        <button
                          onClick={() => setAvatarSrc(null)}
                          className="font-mono text-[8px] text-muted-foreground/60 hover:text-destructive transition-colors block mt-0.5"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarFile(file);
                      }}
                    />
                  </div>
                )}

                {/* Text fields */}
                {textFields.map(field => (
                  <div key={field.id}>
                    <span className="font-mono text-[8px] text-muted-foreground mb-1 block">{field.label}</span>
                    <input
                      type="text"
                      value={fieldValues[field.id] ?? field.defaultValue}
                      onChange={(e) => setFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                      className="w-full font-mono text-[11px] px-3 py-1.5 rounded-lg border border-border bg-background"
                      placeholder={field.defaultValue}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Templates */}
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Templates</span>
            <TemplatePicker selected={selectedId} onSelect={setSelectedId} />
          </div>

          {/* Export */}
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Export</span>
            <ExportControls svgRef={svgRef} template={template} disabled={!imageSrc} />
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center justify-center order-1 lg:order-2 min-h-[400px] rounded-xl bg-muted/30 p-8">
          {imageSrc ? (
            <DeviceFrame
              ref={svgRef}
              template={template}
              imageSrc={imageSrc}
              bgColor={bgColor}
              zoom={zoom}
              offsetX={offsetX}
              offsetY={offsetY}
              fieldValues={fieldValues}
              avatarSrc={avatarSrc}
            />
          ) : (
            <div className="text-center space-y-3">
              <div className="w-24 h-24 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center">
                <svg viewBox={template.viewBox} className="h-16 w-auto opacity-30">
                  <rect x="0" y="0" width={template.width} height={template.height} fill="hsl(var(--foreground))" rx="4" />
                  <rect
                    x={template.screen.x}
                    y={template.screen.y}
                    width={template.screen.width}
                    height={template.screen.height}
                    rx={template.screen.rx || 0}
                    fill="hsl(var(--muted-foreground))"
                  />
                </svg>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">Upload an image to preview</p>
              <div className="hidden">
                <DeviceFrame
                  ref={svgRef}
                  template={template}
                  imageSrc={null}
                  bgColor={bgColor}
                  zoom={zoom}
                  offsetX={offsetX}
                  offsetY={offsetY}
                  fieldValues={fieldValues}
                  avatarSrc={avatarSrc}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnbsMockupApp;
