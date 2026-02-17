import React, { useState, useRef } from 'react';
import { TEMPLATES } from './templates';
import TemplatePicker from './components/TemplatePicker';
import ImageUploader from './components/ImageUploader';
import DeviceFrame from './components/DeviceFrame';
import ExportControls from './components/ExportControls';
import { RotateCcw } from 'lucide-react';

const UnbsMockupApp: React.FC = () => {
  const [selectedId, setSelectedId] = useState(TEMPLATES[0].id);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState('#f5f0eb');
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const template = TEMPLATES.find(t => t.id === selectedId) || TEMPLATES[0];

  const resetAdjustments = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

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
            <DeviceFrame ref={svgRef} template={template} imageSrc={imageSrc} bgColor={bgColor} zoom={zoom} offsetX={offsetX} offsetY={offsetY} />
          ) : (
            <div className="text-center space-y-3">
              <div className="w-24 h-24 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center">
                <svg viewBox={template.viewBox} className="h-16 w-auto opacity-30">
                  <rect x="0" y="0" width={template.width} height={template.height} fill="#666" rx="4" />
                  <rect
                    x={template.screen.x}
                    y={template.screen.y}
                    width={template.screen.width}
                    height={template.screen.height}
                    rx={template.screen.rx || 0}
                    fill="#888"
                  />
                </svg>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">Upload an image to preview</p>
              <div className="hidden">
                <DeviceFrame ref={svgRef} template={template} imageSrc={null} bgColor={bgColor} zoom={zoom} offsetX={offsetX} offsetY={offsetY} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnbsMockupApp;
