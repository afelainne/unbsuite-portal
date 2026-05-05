import React, { useState, useCallback } from 'react';
import FontSelector from './components/FontSelector';
import PreviewPanel from './components/PreviewPanel';
import PairSuggestions from './components/PairSuggestions';
import ContextSwitcher from './components/ContextSwitcher';
import { loadGoogleFont, FontEntry, COLOR_PALETTES, generateContrastingPair } from './constants';
import { Shuffle } from 'lucide-react';

let localFontCounter = 0;

const UnbsTypeApp: React.FC = () => {
  const [headingFont, setHeadingFont] = useState('Playfair Display');
  const [bodyFont, setBodyFont] = useState('Source Sans 3');
  const [context, setContext] = useState('hero');
  const [customFonts, setCustomFonts] = useState<FontEntry[]>([]);
  const [fgColor, setFgColor] = useState<string | undefined>(undefined);
  const [bgColor, setBgColor] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    loadGoogleFont('Playfair Display', [400, 700]);
    loadGoogleFont('Source Sans 3', [400, 700]);
  }, []);

  const handleApplyPair = (h: string, b: string) => {
    setHeadingFont(h);
    setBodyFont(b);
  };

  const handleUploadFont = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const cleanName = file.name
        .replace(/\.(ttf|otf|woff2?)$/i, '')
        .replace(/[\\/"']/g, '_')
        .trim();
      localFontCounter++;
      const name = `Upload ${localFontCounter}: ${cleanName}`;
      const fontFace = new FontFace(name, buffer);
      await fontFace.load();
      document.fonts.add(fontFace);
      // Detect actual weight reported by the FontFace
      const parsedWeight = parseInt(String(fontFace.weight), 10);
      const weight = Number.isFinite(parsedWeight) ? parsedWeight : 400;
      const entry: FontEntry = {
        name,
        category: 'sans',
        weights: [weight],
        isLocal: true
      };
      setCustomFonts(prev => (prev.some(f => f.name === name) ? prev : [...prev, entry]));
    } catch (err) {
      console.error('Failed to load font:', err);
    }
  }, []);

  const handleShuffle = () => {
    const pair = generateContrastingPair();
    setFgColor(pair.fg);
    setBgColor(pair.bg);
  };

  const handleApplyPalette = (fg: string, bg: string) => {
    setFgColor(fg);
    setBgColor(bg);
  };

  const handleResetColors = () => {
    setFgColor(undefined);
    setBgColor(undefined);
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Sidebar */}
        <div className="space-y-6 order-2 lg:order-1">
          <FontSelector value={headingFont} onChange={setHeadingFont} label="Heading" customFonts={customFonts} onUploadFont={handleUploadFont} />
          <FontSelector value={bodyFont} onChange={setBodyFont} label="Body" customFonts={customFonts} onUploadFont={handleUploadFont} />
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Contexto</span>
            <ContextSwitcher value={context} onChange={setContext} />
          </div>

          {/* Colors */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Colors</span>
              <div className="flex gap-1">
                <button
                  onClick={handleShuffle}
                  className="p-1.5 rounded hover:bg-muted/50 transition-colors"
                  title="Random contrast pair"
                >
                  <Shuffle className="h-3 w-3 text-muted-foreground" />
                </button>
                {(fgColor || bgColor) && (
                  <button
                    onClick={handleResetColors}
                    className="font-mono text-[8px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <span className="font-mono text-[7px] text-muted-foreground block mb-1">Text</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={fgColor || '#1a1a1a'}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-7 h-7 rounded border border-border cursor-pointer"
                  />
                  <span className="font-mono text-[9px] text-muted-foreground">{fgColor || 'auto'}</span>
                </div>
              </div>
              <div className="flex-1">
                <span className="font-mono text-[7px] text-muted-foreground block mb-1">Background</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={bgColor || '#ffffff'}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-7 h-7 rounded border border-border cursor-pointer"
                  />
                  <span className="font-mono text-[9px] text-muted-foreground">{bgColor || 'auto'}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {COLOR_PALETTES.map(p => (
                <button
                  key={p.name}
                  onClick={() => handleApplyPalette(p.fg, p.bg)}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-border/50 hover:bg-muted/50 transition-colors"
                  title={p.name}
                >
                  <div className="w-3 h-3 rounded-full border border-border/30" style={{ backgroundColor: p.bg }}>
                    <div className="w-1.5 h-1.5 rounded-full m-[3px]" style={{ backgroundColor: p.fg }} />
                  </div>
                  <span className="font-mono text-[7px] text-muted-foreground">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <PairSuggestions onApply={handleApplyPair} />
        </div>

        {/* Preview */}
        <div className="order-1 lg:order-2 min-h-[500px] rounded-xl border border-border/30 bg-background p-8 lg:p-12 overflow-auto">
          <PreviewPanel headingFont={headingFont} bodyFont={bodyFont} context={context} fgColor={fgColor} bgColor={bgColor} />
        </div>
      </div>
    </div>
  );
};

export default UnbsTypeApp;
