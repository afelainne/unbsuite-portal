import React, { useEffect, useMemo, useState } from 'react';
import type { FontStyle, Project } from '../lib/types';
import { buildOtf, previewFamily } from '../lib/font';
import { buildClasses } from '../lib/kerning';
import { layoutText } from '../lib/layout';
import { Card, Field, Switch } from './ui';
import { TextRender } from './GlyphArt';

interface TestStepProps {
  project: Project;
  style: FontStyle;
}

const SAMPLE = 'AVATAR Tony HOHO\nThe quick brown fox jumps over the lazy dog.\nPack my box with five dozen liquor jugs 0123456789';
const WATERFALL = [72, 48, 36, 24, 18, 14, 12];

/**
 * A fonte carregada no navegador a partir do mesmo arquivo que a exportação
 * gera (FontFace sobre o ArrayBuffer do OTF). Com as margens ligadas, o texto
 * é desenhado pelos mesmos números, com as caixas de avanço visíveis.
 */
function useFontFace(project: Project, style: FontStyle): { family: string; ready: boolean; error: string | null } {
  const family = previewFamily(style.id);
  const [state, setState] = useState<{ ready: boolean; error: string | null }>({ ready: false, error: null });
  useEffect(() => {
    let face: FontFace | null = null;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      try {
        const hasGlyphs = Object.values(style.glyphs).some(g => g.outline.length);
        if (!hasGlyphs || typeof FontFace === 'undefined') { setState({ ready: false, error: null }); return; }
        const { buffer } = buildOtf(project, style);
        face = new FontFace(family, buffer);
        face.load().then(loaded => {
          if (cancelled) return;
          for (const f of Array.from(document.fonts)) if (f.family === family || f.family === `"${family}"`) document.fonts.delete(f);
          document.fonts.add(loaded);
          setState({ ready: true, error: null });
        }).catch(() => { if (!cancelled) setState({ ready: false, error: 'O navegador recusou a fonte gerada.' }); });
      } catch (e) {
        setState({ ready: false, error: e instanceof Error ? e.message : 'Não foi possível montar a fonte.' });
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [project, style, family]);
  useEffect(() => () => {
    for (const f of Array.from(document.fonts)) if (f.family === family || f.family === `"${family}"`) document.fonts.delete(f);
  }, [family]);
  return { family, ...state };
}

export const TestStep: React.FC<TestStepProps> = ({ project, style }) => {
  const m = project.metrics;
  const [text, setText] = useState(SAMPLE);
  const [size, setSize] = useState(64);
  const [kerning, setKerning] = useState(true);
  const [margins, setMargins] = useState(false);
  const font = useFontFace(project, style);
  const classes = useMemo(() => buildClasses(style.glyphs, m, style.kerning.settings.useClasses), [style.glyphs, m, style.kerning.settings.useClasses]);
  const lines = useMemo(() => layoutText(text, style, m, kerning ? classes : null), [text, style, m, kerning, classes]);
  const hasGlyphs = Object.values(style.glyphs).some(g => g.outline.length);
  const css: React.CSSProperties = {
    fontFamily: `"${font.family}", system-ui`,
    fontKerning: kerning ? 'normal' : 'none',
    fontFeatureSettings: kerning ? '"kern" 1' : '"kern" 0',
  };

  return (
    <div className="flex flex-col gap-5">
      <Card label="Teste">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
          <Field label="Texto">
            <textarea className="field text-[14px]" rows={3} value={text} onChange={e => setText(e.target.value)} spellCheck={false} />
          </Field>
          <div className="flex flex-col gap-4">
            <Field label="Tamanho" value={`${size} px`}>
              <input type="range" min={12} max={200} value={size} onChange={e => setSize(Number(e.target.value))} className="tool-slider" aria-label="Tamanho" />
            </Field>
            <Switch checked={kerning} onChange={setKerning} label="Kerning" />
            <Switch checked={margins} onChange={setMargins} label="Mostrar margens" />
          </div>
        </div>
        {!hasGlyphs ? (
          <p className="text-[14px] text-muted-foreground">Crie os glifos na etapa Entrada para testar a fonte.</p>
        ) : margins ? (
          <div className="overflow-x-auto"><TextRender lines={lines} m={m} size={size} showMargins label="Texto com as margens de cada glifo" /></div>
        ) : (
          <div
            className="whitespace-pre-wrap break-words text-foreground"
            style={{ ...css, fontSize: size, lineHeight: (m.ascender - m.descender + m.lineGap) / m.unitsPerEm }}
            aria-busy={!font.ready}
          >
            {text}
          </div>
        )}
        {font.error && <p className="text-[13px] text-destructive">{font.error}</p>}
      </Card>

      {hasGlyphs && (
        <Card label="Cascata">
          <div className="flex flex-col gap-3 overflow-hidden">
            {WATERFALL.map(px => (
              <div key={px} className="flex items-baseline gap-4 min-w-0">
                <span className="w-10 shrink-0 text-[12px] text-muted-foreground tabular text-right">{px}</span>
                <span className="whitespace-nowrap overflow-hidden text-ellipsis" style={{ ...css, fontSize: px, lineHeight: 1.2 }}>
                  {text.split('\n')[0] || SAMPLE}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-muted-foreground">Texto e cascata usam o próprio OTF exportado, carregado no navegador. O que a fonte ainda não tem aparece na fonte do sistema.</p>
        </Card>
      )}
    </div>
  );
};
