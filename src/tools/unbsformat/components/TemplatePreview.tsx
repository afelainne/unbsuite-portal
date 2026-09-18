import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Layers as LayersIcon, Maximize, Minus, Plus, Check } from 'lucide-react';
import type { GridConfig, GridResult, Module } from '../lib/grid';
import { referencePage } from '../lib/grid';
import { buildScene, GUIDE_COLORS, LAYER_LABEL, LAYER_ORDER, LayerId, Layers } from '../lib/scene';
import { fmt, MM_PER_PX, toUnit, Unit, UNIT_DIGITS, UNITS } from '../lib/units';
import { Segmented } from './controls';

interface Props {
  config: GridConfig;
  result: GridResult;
  layers: Layers;
  unit: Unit;
  onLayers: (l: Layers) => void;
  onUnit: (u: Unit) => void;
  onFacing: (facing: boolean) => void;
}

/** 100% = tamanho físico na tela a 96 px/in. */
const PX_PER_MM = 1 / MM_PER_PX;
const PAD = 24;

type Zoom = { mode: 'fit' } | { mode: 'fixed'; factor: number };

export const TemplatePreview: React.FC<Props> = ({ config, result, layers, unit, onLayers, onUnit, onFacing }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const clipId = useId().replace(/:/g, '');
  const [box, setBox] = useState({ w: 600, h: 500 });
  const [zoom, setZoom] = useState<Zoom>({ mode: 'fit' });
  const [hover, setHover] = useState<{ page: number; module: Module } | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);

  const bb = result.bleedBox;

  // Mede a área disponível.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitScale = Math.max(0.02, Math.min((box.w - PAD * 2) / bb.w, (box.h - PAD * 2) / bb.h));
  const scale = zoom.mode === 'fit' ? fitScale : PX_PER_MM * zoom.factor; // px de tela por mm
  const percent = Math.round((scale / PX_PER_MM) * 100);

  const setFactor = useCallback((f: (current: number) => number) => {
    setZoom(z => {
      const cur = z.mode === 'fit' ? fitScale / PX_PER_MM : z.factor;
      return { mode: 'fixed', factor: Math.min(16, Math.max(0.02, f(cur))) };
    });
  }, [fitScale]);

  // Ctrl/Cmd + roda: zoom. Sem modificador, a roda rola a área normalmente.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setFactor(c => c * (e.deltaY > 0 ? 0.9 : 1.1));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setFactor]);

  // Atalhos: 0 ajusta, 1 = 100%, + e − (fora de campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '0') setZoom({ mode: 'fit' });
      else if (e.key === '1') setZoom({ mode: 'fixed', factor: 1 });
      else if (e.key === '+' || e.key === '=') setFactor(c => c * 1.25);
      else if (e.key === '-' || e.key === '_') setFactor(c => c / 1.25);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setFactor]);

  // Fecha o menu de camadas ao clicar fora ou com Esc.
  useEffect(() => {
    if (!layersOpen) return;
    const onDown = (e: MouseEvent) => {
      if (layersRef.current && !layersRef.current.contains(e.target as Node)) setLayersOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLayersOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [layersOpen]);

  const scene = useMemo(() => buildScene(config, result, layers), [config, result, layers]);

  // Tudo o que é traço ou texto é medido em px de tela e convertido para mm aqui,
  // para a espessura e o rótulo não mudarem com o zoom.
  const px = (v: number) => v / scale;
  const strokePx = (weight = 0.5) => Math.max(0.75, Math.min(1.5, weight * 1.5));
  const d = UNIT_DIGITS[unit];
  const u = (mm: number) => fmt(toUnit(mm, unit), d);

  const ref = referencePage(result);
  const labelSize = px(10.5);

  const cotas: React.ReactNode[] = [];
  if (layers.cotas && ref.textBlock.w > 0 && ref.textBlock.h > 0) {
    const tb = ref.textBlock;
    const fits = (text: string, spaceMm: number) => text.length * 6 < spaceMm * scale && spaceMm * scale > 14;
    const label = (key: string, x: number, y: number, text: string, space: number, color: string, anchor: 'middle' | 'start' = 'middle') => {
      if (!fits(text, space)) return;
      cotas.push(
        <text key={key} x={x} y={y} fontSize={labelSize} fill={color} textAnchor={anchor} dominantBaseline="middle" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {text}
        </text>,
      );
    };
    const m = ref.margins;
    const mid = tb.x + tb.w / 2;
    if (m.top * scale > 14) label('ct', mid, m.top / 2, u(m.top), tb.w, GUIDE_COLORS.margin);
    if (m.bottom * scale > 14) label('cb', mid, config.height - m.bottom / 2, u(m.bottom), tb.w, GUIDE_COLORS.margin);
    label('cl', ref.trim.x + m.left / 2, tb.y + tb.h / 2, u(m.left), m.left, GUIDE_COLORS.margin);
    label('cr', ref.trim.x + ref.trim.w - m.right / 2, tb.y + tb.h / 2, u(m.right), m.right, GUIDE_COLORS.margin);
    const first = ref.modules[0];
    if (first) {
      const text = `${u(first.w)} × ${u(first.h)}`;
      if (first.h * scale > 22) label('mod', first.x + px(6), first.y + px(12), text, first.w, GUIDE_COLORS.column, 'start');
    } else if (ref.columns[0]) {
      label('col', ref.columns[0].x + ref.columns[0].w / 2, tb.y + px(12), u(ref.columns[0].w), ref.columns[0].w, GUIDE_COLORS.column);
    }
  }

  const toggleLayer = (id: LayerId) => onLayers({ ...layers, [id]: !layers[id] });

  const hoverText = hover
    ? `Coluna ${hover.module.col + 1}, linha ${hover.module.row + 1}${result.pages.length > 1 ? `, ${config.fold !== 'none' ? 'painel' : 'página'} ${hover.page + 1}` : ''}`
    : null;

  return (
    <section className="material-card p-0 flex flex-col min-h-0 h-full overflow-hidden" aria-label="Prévia da grade">
      {/* Barra da prévia */}
      <div className="flex items-center gap-2 px-3 py-2 hairline-b flex-wrap">
        <div className="relative" ref={layersRef}>
          <button
            type="button"
            className="ctl ctl-outline ctl-sm"
            aria-haspopup="true"
            aria-expanded={layersOpen}
            onClick={() => setLayersOpen(o => !o)}
          >
            <LayersIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Camadas
          </button>
          {layersOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-30 material-popover p-1.5 w-56 flex flex-col" role="menu" aria-label="Camadas visíveis">
              {LAYER_ORDER.map(id => (
                <button
                  key={id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={layers[id]}
                  onClick={() => toggleLayer(id)}
                  className="row justify-between"
                >
                  <span>{LAYER_LABEL[id]}</span>
                  {layers[id] && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <Segmented
          size="sm"
          label="Visualização"
          value={config.facing ? 'espelho' : 'pagina'}
          onChange={v => onFacing(v === 'espelho')}
          options={[
            { value: 'pagina', label: 'Página' },
            { value: 'espelho', label: 'Espelho', disabled: config.fold !== 'none', title: config.fold !== 'none' ? 'Folheto com dobra já mostra a folha aberta' : 'Páginas espelhadas' },
          ]}
        />

        <Segmented size="sm" label="Unidade" value={unit} onChange={onUnit} options={UNITS.map(x => ({ value: x, label: x }))} />

        <div className="ml-auto flex items-center gap-1">
          <button type="button" className="ctl ctl-plain ctl-icon ctl-sm" aria-label="Menos zoom" title="Menos zoom (−)" onClick={() => setFactor(c => c / 1.25)}>
            <Minus aria-hidden="true" />
          </button>
          <span className="text-value text-footnote w-12 text-center" aria-live="off" title="100% = tamanho real a 96 px por polegada">{percent}%</span>
          <button type="button" className="ctl ctl-plain ctl-icon ctl-sm" aria-label="Mais zoom" title="Mais zoom (+)" onClick={() => setFactor(c => c * 1.25)}>
            <Plus aria-hidden="true" />
          </button>
          <button type="button" className="ctl ctl-sm ctl-plain" aria-pressed={zoom.mode === 'fit'} onClick={() => setZoom({ mode: 'fit' })} title="Ajustar à área (0)">
            <Maximize aria-hidden="true" />
            <span className="hidden sm:inline">Ajustar</span>
          </button>
          <button type="button" className="ctl ctl-sm ctl-plain" aria-pressed={zoom.mode === 'fixed' && zoom.factor === 1} onClick={() => setZoom({ mode: 'fixed', factor: 1 })} title="Tamanho real (1)">
            100%
          </button>
        </div>
      </div>

      {/* Área da prévia */}
      <div ref={containerRef} className="relative flex-1 min-h-[240px] overflow-auto bg-canvas">
        <div className="min-w-full min-h-full w-max h-max flex items-center justify-center" style={{ padding: PAD }}>
          <svg
            width={bb.w * scale}
            height={bb.h * scale}
            viewBox={`${bb.x} ${bb.y} ${bb.w} ${bb.h}`}
            role="img"
            aria-label={`Prévia de ${config.formatName}, ${ref.columns.length} colunas por ${ref.rows.length} linhas`}
            onPointerLeave={() => setHover(null)}
            className="block"
            style={{ fontFamily: 'inherit' }}
          >
            <defs>
              <clipPath id={clipId}>
                <rect x={bb.x} y={bb.y} width={bb.w} height={bb.h} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              {/* papel: sangria levemente tingida, formato em branco */}
              <rect x={bb.x} y={bb.y} width={bb.w} height={bb.h} fill={result.bleed > 0 ? '#FBEAEA' : '#FFFFFF'} />
              <rect x={0} y={0} width={result.width} height={result.height} fill="#FFFFFF" />

              {scene.map((it, i) =>
                it.type === 'rect' ? (
                  <rect
                    key={i}
                    x={it.x}
                    y={it.y}
                    width={Math.max(0, it.w)}
                    height={Math.max(0, it.h)}
                    fill={it.fill ?? 'none'}
                    fillOpacity={it.fill ? it.fillOpacity : undefined}
                    stroke={it.stroke}
                    strokeWidth={it.stroke ? strokePx(it.weight) : undefined}
                    strokeDasharray={it.dash ? it.dash.map(v => px(v * 1.5)).join(' ') : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                ) : (
                  <line
                    key={i}
                    x1={it.x1}
                    y1={it.y1}
                    x2={it.x2}
                    y2={it.y2}
                    stroke={it.stroke}
                    strokeOpacity={it.opacity}
                    strokeWidth={strokePx(it.weight)}
                    strokeDasharray={it.dash ? it.dash.map(v => px(v * 1.5)).join(' ') : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                ),
              )}

              {cotas}

              {/* Alvos de medição: cada módulo responde ao cursor */}
              {result.pages.map(p =>
                p.modules.map(m => {
                  const active = hover && hover.page === p.index && hover.module.row === m.row && hover.module.col === m.col;
                  return (
                    <rect
                      key={`h-${p.index}-${m.row}-${m.col}`}
                      x={m.x}
                      y={m.y}
                      width={m.w}
                      height={m.h}
                      fill={active ? GUIDE_COLORS.column : 'transparent'}
                      fillOpacity={active ? 0.18 : 0}
                      stroke={active ? GUIDE_COLORS.column : 'none'}
                      strokeWidth={active ? 2 : 0}
                      vectorEffect="non-scaling-stroke"
                      onPointerEnter={() => setHover({ page: p.index, module: m })}
                      onClick={() => setHover({ page: p.index, module: m })}
                    />
                  );
                }),
              )}
            </g>
          </svg>
        </div>
      </div>

      {/* Leitura */}
      <div className="flex items-center gap-x-4 gap-y-1 px-4 py-2.5 hairline-t min-h-11 flex-wrap text-subhead" aria-live="polite">
        {hover ? (
          <>
            <span className="font-medium">{hoverText}</span>
            <span className="text-value">{u(hover.module.w)} × {u(hover.module.h)} {unit}</span>
            {unit !== 'pt' && (
              <span className="text-value text-muted-foreground">{fmt(toUnit(hover.module.w, 'pt'), 2)} × {fmt(toUnit(hover.module.h, 'pt'), 2)} pt</span>
            )}
            <span className="text-value text-muted-foreground">
              x {u(hover.module.x - result.pages[hover.page].trim.x)} · y {u(hover.module.y)} {unit}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">
            Toque ou passe o cursor sobre um módulo para medir.
            <span className="hidden md:inline"> Ctrl + roda do mouse aproxima; 0 ajusta, 1 mostra em tamanho real.</span>
          </span>
        )}
      </div>
    </section>
  );
};
