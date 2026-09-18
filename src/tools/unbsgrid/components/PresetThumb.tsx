/**
 * Miniatura do preset: uma silhueta neutra de marca com os motivos da
 * construção por cima, nas cores que aquelas construções têm na cena.
 *
 * SVG estático, sem paper.js: um cartão custa meia dúzia de nós.
 */
import React from 'react';
import { presetMotifs, type MotifId, type ThumbSource } from '../lib/preset-thumb';

interface Props {
  preset: ThumbSource;
  /** Sobre o preenchimento preto da seleção, a silhueta vira branca. */
  inverted?: boolean;
  className?: string;
}

const STROKE = 1.6;

/** Cada motivo em 48 × 48, desenhado em `currentColor` trocado pela cor da cena. */
const MOTIF_SHAPES: Record<MotifId, React.ReactNode> = {
  box: <rect x="7" y="7" width="34" height="34" rx="1" />,
  circle: (
    <>
      <circle cx="19" cy="24" r="12" />
      <circle cx="29" cy="24" r="12" />
    </>
  ),
  cross: (
    <>
      <path d="M24 5V43" />
      <path d="M5 24H43" />
    </>
  ),
  diagonal: (
    <>
      <path d="M7 41 41 7" />
      <path d="M7 7 41 41" />
    </>
  ),
  golden: (
    <>
      <rect x="6" y="11" width="36" height="26" rx="1" />
      <path d="M28 11V37" />
      <path d="M28 37a16 16 0 0 0-16-16" />
    </>
  ),
  grid: (
    <>
      <path d="M15 6V42M24 6V42M33 6V42" />
      <path d="M6 15H42M6 24H42M6 33H42" />
    </>
  ),
  type: (
    <>
      <path d="M7 15H41" />
      <path d="M7 24H41" strokeDasharray="3 3" />
      <path d="M7 33H41" />
    </>
  ),
  points: (
    <>
      <circle cx="13" cy="13" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="35" cy="13" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="13" cy="35" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="35" cy="35" r="2.6" fill="currentColor" stroke="none" />
    </>
  ),
  scale: (
    <>
      <rect x="6" y="20" width="22" height="22" rx="1" />
      <rect x="31" y="29" width="13" height="13" rx="1" />
      <rect x="31" y="15" width="8" height="8" rx="1" />
    </>
  ),
};

const PresetThumb: React.FC<Props> = ({ preset, inverted = false, className = '' }) => {
  const motifs = presetMotifs(preset);
  const ink = inverted ? '#ffffff' : '#1c1c1e';
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      {/* Silhueta neutra: só para as construções terem sobre o que pousar. */}
      <rect x="15" y="15" width="18" height="18" rx="3" fill={ink} opacity={inverted ? 0.28 : 0.14} />
      {motifs.map(motif => (
        <g
          key={motif.id}
          style={{ color: motif.color }}
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          opacity={inverted ? 0.95 : 0.85}
        >
          {MOTIF_SHAPES[motif.id]}
        </g>
      ))}
    </svg>
  );
};

export default React.memo(PresetThumb);
