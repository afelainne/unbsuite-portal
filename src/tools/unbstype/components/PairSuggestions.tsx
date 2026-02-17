import React from 'react';
import { CURATED_PAIRS, loadGoogleFont, FONTS } from '../constants';

interface PairSuggestionsProps {
  onApply: (heading: string, body: string) => void;
}

const PairSuggestions: React.FC<PairSuggestionsProps> = ({ onApply }) => {
  const handleClick = (pair: typeof CURATED_PAIRS[0]) => {
    const hf = FONTS.find(f => f.name === pair.heading);
    const bf = FONTS.find(f => f.name === pair.body);
    if (hf) loadGoogleFont(hf.name, hf.weights);
    if (bf) loadGoogleFont(bf.name, bf.weights);
    onApply(pair.heading, pair.body);
  };

  return (
    <div className="space-y-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground block">Pares sugeridos</span>
      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
        {CURATED_PAIRS.map((pair, i) => (
          <button
            key={i}
            onClick={() => handleClick(pair)}
            onMouseEnter={() => {
              const hf = FONTS.find(f => f.name === pair.heading);
              const bf = FONTS.find(f => f.name === pair.body);
              if (hf) loadGoogleFont(hf.name, hf.weights);
              if (bf) loadGoogleFont(bf.name, bf.weights);
            }}
            className="w-full text-left p-3 rounded-lg border border-border/30 hover:border-border/60 hover:bg-muted/30 transition-all group"
          >
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[13px] font-bold" style={{ fontFamily: `'${pair.heading}', serif` }}>
                {pair.heading}
              </span>
              <span className="font-mono text-[7px] text-muted-foreground uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                {pair.label}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground" style={{ fontFamily: `'${pair.body}', sans-serif` }}>
              {pair.body}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PairSuggestions;
