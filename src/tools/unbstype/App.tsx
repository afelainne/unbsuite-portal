import React, { useState } from 'react';
import FontSelector from './components/FontSelector';
import PreviewPanel from './components/PreviewPanel';
import PairSuggestions from './components/PairSuggestions';
import ContextSwitcher from './components/ContextSwitcher';
import { loadGoogleFont } from './constants';

const UnbsTypeApp: React.FC = () => {
  const [headingFont, setHeadingFont] = useState('Playfair Display');
  const [bodyFont, setBodyFont] = useState('Source Sans 3');
  const [context, setContext] = useState('hero');

  // Preload defaults
  React.useEffect(() => {
    loadGoogleFont('Playfair Display', [400, 700]);
    loadGoogleFont('Source Sans 3', [400, 700]);
  }, []);

  const handleApplyPair = (h: string, b: string) => {
    setHeadingFont(h);
    setBodyFont(b);
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Sidebar */}
        <div className="space-y-6 order-2 lg:order-1">
          <FontSelector value={headingFont} onChange={setHeadingFont} label="Heading" />
          <FontSelector value={bodyFont} onChange={setBodyFont} label="Body" />
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Contexto</span>
            <ContextSwitcher value={context} onChange={setContext} />
          </div>
          <PairSuggestions onApply={handleApplyPair} />
        </div>

        {/* Preview */}
        <div className="order-1 lg:order-2 min-h-[500px] rounded-xl border border-border/30 bg-background p-8 lg:p-12 overflow-auto">
          <PreviewPanel headingFont={headingFont} bodyFont={bodyFont} context={context} />
        </div>
      </div>
    </div>
  );
};

export default UnbsTypeApp;
