import React, { useRef } from 'react';
import type { Glyph, Metrics } from '../lib/types';
import { advanceOf, glyphPathData, inkBox } from '../lib/outline';
import type { TextLine } from '../lib/layout';
import { cx } from './cx';

/**
 * Desenhos em SVG a partir dos mesmos números da fonte exportada. O eixo y da
 * fonte sobe; o SVG desce, então tudo fica dentro de um grupo espelhado.
 */

const flip = (m: Metrics) => `translate(0 ${m.ascender}) scale(1 -1)`;

/** Miniatura do glifo na caixa de avanço, altura de ascendente a descendente. */
export const GlyphThumb: React.FC<{ glyph: Glyph; m: Metrics; className?: string }> = ({ glyph, m, className }) => {
  const adv = Math.max(advanceOf(glyph, m), 1);
  const h = m.ascender - m.descender;
  return (
    <svg viewBox={`0 0 ${adv} ${h}`} preserveAspectRatio="xMidYMid meet" className={cx('fill-current', className)} aria-hidden="true">
      <g transform={flip(m)}>
        <path d={glyphPathData(glyph, m)} />
      </g>
    </svg>
  );
};

interface GlyphStageProps {
  glyph: Glyph;
  m: Metrics;
  /** Arrastar as margens (em unidades da fonte). */
  onMargins?: (lsb: number, rsb: number) => void;
}

/**
 * O glifo grande com as guias (linha de base, altura-x, maiúsculas,
 * ascendente, descendente) e as duas margens, que dá para arrastar.
 */
export const GlyphStage: React.FC<GlyphStageProps> = ({ glyph, m, onMargins }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ side: 'l' | 'r'; startX: number; lsb: number; rsb: number } | null>(null);
  const box = inkBox(glyph, m);
  const ink = box.x1 - box.x0;
  const adv = advanceOf(glyph, m);
  const pad = m.unitsPerEm * 0.25;
  const x0 = Math.min(0, glyph.lsb) - pad;
  const width = Math.max(adv, glyph.lsb + ink) - x0 + pad;
  const h = m.ascender - m.descender;
  const guides: [string, number][] = [
    ['Ascendente', m.ascender],
    ['Maiúsculas', m.capHeight],
    ['Altura-x', m.xHeight],
    ['Linha de base', 0],
    ['Descendente', m.descender],
  ];

  const unitsPerPx = () => {
    const el = svgRef.current;
    if (!el) return 1;
    const rect = el.getBoundingClientRect();
    return Math.max(width / rect.width, h / rect.height);
  };
  const onDown = (side: 'l' | 'r') => (e: React.PointerEvent) => {
    if (!onMargins) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { side, startX: e.clientX, lsb: glyph.lsb, rsb: glyph.rsb };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !onMargins) return;
    const delta = Math.round((e.clientX - d.startX) * unitsPerPx());
    if (d.side === 'l') onMargins(d.lsb - delta, d.rsb);
    else onMargins(d.lsb, d.rsb + delta);
  };
  const onUp = () => { drag.current = null; };

  const handle = (x: number, side: 'l' | 'r', label: string) => (
    <g>
      <line x1={x} x2={x} y1={0} y2={h} className="stroke-foreground" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeDasharray="6 4" />
      {onMargins && (
        <rect
          x={x - pad * 0.12}
          width={pad * 0.24}
          y={0}
          height={h}
          fill="transparent"
          className="cursor-ew-resize"
          role="slider"
          aria-label={label}
          aria-valuenow={side === 'l' ? glyph.lsb : glyph.rsb}
          tabIndex={0}
          onPointerDown={onDown(side)}
          onKeyDown={e => {
            const step = e.shiftKey ? 10 : 1;
            const dir = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
            if (!dir) return;
            e.preventDefault();
            if (side === 'l') onMargins(glyph.lsb - dir * step, glyph.rsb);
            else onMargins(glyph.lsb, glyph.rsb + dir * step);
          }}
        />
      )}
    </g>
  );

  return (
    <svg
      ref={svgRef}
      viewBox={`${x0} 0 ${width} ${h}`}
      className="w-full h-full touch-none select-none"
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="group"
      aria-label={`Glifo ${glyph.char}, margem esquerda ${glyph.lsb}, direita ${glyph.rsb}`}
    >
      <rect x={0} y={0} width={adv} height={h} className="fill-fill" />
      {guides.map(([name, y]) => (
        <g key={name}>
          <line x1={x0} x2={x0 + width} y1={m.ascender - y} y2={m.ascender - y} className="stroke-separator-strong" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <text x={x0 + 8} y={Math.max(h * 0.04, m.ascender - y - 8)} className="fill-muted-foreground" fontSize={h * 0.035}>{name}</text>
        </g>
      ))}
      <g transform={flip(m)} className="fill-foreground">
        <path d={glyphPathData(glyph, m)} />
      </g>
      {handle(0, 'l', 'Margem esquerda')}
      {handle(adv, 'r', 'Margem direita')}
    </svg>
  );
};

interface TextRenderProps {
  lines: TextLine[];
  m: Metrics;
  /** Altura do corpo em px (1 em). */
  size: number;
  showMargins?: boolean;
  className?: string;
  label?: string;
}

/** Texto composto com a fonte em memória, linha a linha, com as margens se pedido. */
export const TextRender: React.FC<TextRenderProps> = ({ lines, m, size, showMargins, className, label }) => {
  const lineH = m.ascender - m.descender + Math.max(0, m.lineGap);
  const width = Math.max(m.unitsPerEm, ...lines.map(l => l.width));
  const height = lineH * Math.max(1, lines.length);
  const k = size / m.unitsPerEm;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width * k}
      height={height * k}
      className={cx('max-w-none overflow-visible', className)}
      role="img"
      aria-label={label}
    >
      {lines.map((line, i) => (
        <g key={i} transform={`translate(0 ${i * lineH})`}>
          {showMargins && line.items.map((it, j) => (
            <rect
              key={`m${j}`}
              x={it.x}
              y={0}
              width={it.advance}
              height={m.ascender - m.descender}
              className={j % 2 ? 'fill-fill-2' : 'fill-fill'}
            />
          ))}
          {showMargins && line.items.filter(it => it.kern).map((it, j) => (
            <rect key={`k${j}`} x={Math.min(it.x, it.x - it.kern)} y={m.ascender - m.descender - lineH * 0.04} width={Math.abs(it.kern)} height={lineH * 0.04} className="fill-foreground" />
          ))}
          <g transform={flip(m)} className="fill-foreground">
            {line.items.map((it, j) => it.glyph && (
              <path key={j} transform={`translate(${it.x} 0)`} d={glyphPathData(it.glyph, m)} />
            ))}
          </g>
          {line.items.filter(it => !it.glyph && it.char !== ' ').map((it, j) => (
            <rect key={`e${j}`} x={it.x + it.advance * 0.1} y={m.ascender - m.capHeight} width={it.advance * 0.8} height={m.capHeight} className="fill-none stroke-muted-foreground" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />
          ))}
        </g>
      ))}
    </svg>
  );
};
