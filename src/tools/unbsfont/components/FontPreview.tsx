import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { FontMetadata, GlyphData } from '../types';
import { exportFontWithFontEditor } from '../services/fontEditorExporter';
import { Field, Sheet, Spinner } from './ui';
import { cx } from './cx';

interface FontPreviewProps {
  glyphs: GlyphData[];
  metadata: FontMetadata;
  /** Mantido para os chamadores; as cores vêm dos tokens, que viram com a classe `dark`. */
  isDarkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_TEXTS = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  'The quick brown fox jumps over the lazy dog.',
  'HAMBURGEFONSTIV',
  'Typography & Design',
  'AV AW AT LT VA WA TA YA',
];

// Preview family name is derived from metadata.familyName so the preview
// reflects the real family/style binding the user is editing.
const sanitizeFamily = (name: string) =>
  (name || 'CustomFont').replace(/[^A-Za-z0-9_-]/g, '_');

/** Bloco de amostra: rótulo micro opcional sobre um quadro rebaixado. */
const Specimen: React.FC<{ label?: string; className?: string; children: React.ReactNode }> = ({ label, className, children }) => (
  <section className="flex flex-col gap-3 min-w-0">
    {label && <span className="label">{label}</span>}
    <div className={cx('bg-canvas rounded-xl p-5 min-w-0 text-foreground', className)}>{children}</div>
  </section>
);

const FontPreview: React.FC<FontPreviewProps> = ({ glyphs, metadata, isOpen, onClose }) => {
  const [fontUrl, setFontUrl] = useState<string | null>(null);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [previewSize, setPreviewSize] = useState(48);

  // Fix #9: Count kerning pairs for footer info
  const kerningPairsCount = Object.keys(metadata.kerning || {}).length;

  const FONT_FAMILY_NAME = `${sanitizeFamily(metadata.familyName)}_preview`;

  // Export and load font
  const loadFont = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Export font to ArrayBuffer
      const buffer = await exportFontWithFontEditor(metadata, glyphs);

      // Create blob URL
      const blob = new Blob([buffer], { type: 'font/ttf' });
      const url = URL.createObjectURL(blob);

      // Clean up any previous preview FontFace (any family with _preview suffix)
      document.fonts.forEach(f => {
        if (f.family === FONT_FAMILY_NAME || f.family.endsWith('_preview')) {
          document.fonts.delete(f);
        }
      });

      // Clean up old blob URL
      if (fontUrl) {
        URL.revokeObjectURL(fontUrl);
      }

      // Create @font-face rule
      const fontFace = new FontFace(FONT_FAMILY_NAME, `url(${url})`);
      await fontFace.load();
      document.fonts.add(fontFace);

      setFontUrl(url);
      setFontLoaded(true);
    } catch (err) {
      console.error('Failed to load font preview:', err);
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a pré-visualização.');
    } finally {
      setIsLoading(false);
    }
  }, [metadata, glyphs, fontUrl, FONT_FAMILY_NAME]);

  // Load font when modal opens
  useEffect(() => {
    if (isOpen) {
      loadFont();
    }

    return () => {
      if (fontUrl) {
        URL.revokeObjectURL(fontUrl);
      }
      document.fonts.forEach(f => {
        if (f.family === FONT_FAMILY_NAME || f.family.endsWith('_preview')) {
          document.fonts.delete(f);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, metadata.familyName, metadata.styleName, glyphs]);

  if (!isOpen) return null;

  const fontStyle = (size: number): React.CSSProperties => ({
    fontFamily: `"${FONT_FAMILY_NAME}", sans-serif`,
    fontSize: size,
  });

  const drawnCount = glyphs.filter(g => g.pathData).length;

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      size="max-w-5xl"
      zIndex="z-50"
      title="Pré-visualização"
      description={`${metadata.familyName || 'CustomFont'}: a fonte exportada, como ela sai.`}
      actions={
        <button type="button" onClick={loadFont} disabled={isLoading} className="ctl ctl-outline">
          {isLoading ? <Spinner /> : <RefreshCw className="w-4 h-4" aria-hidden="true" />}
          {isLoading ? 'Carregando' : 'Atualizar'}
        </button>
      }
      footer={
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[12px] text-muted-foreground tabular">
          <span>
            {drawnCount} glifos · UPM {metadata.unitsPerEm || 1000} · Ascendente {metadata.ascender || 800} ·
            Descendente {metadata.descender || -200} · Kerning {kerningPairsCount} pares
          </span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cx('w-2 h-2 rounded-pill shrink-0', kerningPairsCount > 0 ? 'bg-foreground' : 'shadow-[inset_0_0_0_1.5px_hsl(var(--foreground))]')}
            />
            {kerningPairsCount > 0 ? 'Fonte exportada com o kerning embutido' : 'A fonte não tem pares de kerning'}
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-6 min-w-0">
        {/* Controles */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-5 items-end">
          <Field label="Tamanho" value={`${previewSize} px`}>
            <input
              type="range"
              min="12"
              max="120"
              value={previewSize}
              aria-label="Tamanho"
              onChange={(e) => setPreviewSize(parseInt(e.target.value))}
              className="tool-slider w-full"
            />
          </Field>
          <Field label="Texto próprio">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Digite um texto para testar..."
              className="field w-full"
            />
          </Field>
        </div>

        {error ? (
          <div className="bg-canvas rounded-xl flex flex-col items-center justify-center gap-3 py-16 px-5 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-[14px] text-foreground max-w-[48ch]">
              <span className="text-destructive">Erro:</span> {error}
            </p>
            <button type="button" onClick={loadFont} className="ctl ctl-outline">
              Tentar de novo
            </button>
          </div>
        ) : isLoading ? (
          <div className="bg-canvas rounded-xl flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Spinner className="w-6 h-6" />
            <p className="text-[14px]">Exportando e carregando a fonte...</p>
          </div>
        ) : fontLoaded ? (
          <>
            {/* Custom text */}
            {customText && (
              <Specimen label="Texto próprio">
                <p style={fontStyle(previewSize)} className="break-words">
                  {customText}
                </p>
              </Specimen>
            )}

            {/* Sample texts at different sizes */}
            <Specimen label="Amostras em tamanhos diferentes">
              <div className="flex flex-col gap-4">
                {[72, 48, 36, 24, 18, 14, 12].map((size) => (
                  <div key={size} className="flex items-baseline gap-4 min-w-0">
                    <span className="text-[12px] text-muted-foreground tabular w-12 text-right shrink-0">{size} px</span>
                    <p style={fontStyle(size)} className="min-w-0 break-words">
                      {metadata.familyName || 'HAMBURGEFONSTIV'}
                    </p>
                  </div>
                ))}
              </div>
            </Specimen>

            {/* Character sets */}
            <section className="flex flex-col gap-3 min-w-0">
              <span className="label">Conjuntos de caracteres</span>
              {SAMPLE_TEXTS.map((text, idx) => (
                <div key={idx} className="bg-canvas rounded-xl p-5 min-w-0 text-foreground">
                  <p style={fontStyle(previewSize)} className="break-words">
                    {text}
                  </p>
                </div>
              ))}
            </section>

            {/* Waterfall */}
            <Specimen label="Cascata de tamanhos">
              <div className="flex flex-col gap-2">
                {[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72].map((size) => (
                  <div key={size} className="flex items-baseline gap-4 min-w-0">
                    <span className="text-[12px] text-muted-foreground tabular w-12 text-right shrink-0">{size} px</span>
                    <p style={fontStyle(size)} className="min-w-0 break-words">
                      The quick brown fox jumps over the lazy dog. 0123456789
                    </p>
                  </div>
                ))}
              </div>
            </Specimen>

            {/* All glyphs grid */}
            <Specimen label="Todos os caracteres">
              <div
                className="flex flex-wrap gap-2"
                style={{ fontFamily: `"${FONT_FAMILY_NAME}", sans-serif` }}
              >
                {glyphs
                  .filter(g => g.pathData && g.char !== ' ')
                  .map((g, idx) => (
                    <div
                      key={idx}
                      className="w-12 h-12 flex items-center justify-center rounded-md bg-card shadow-hairline"
                      style={{ fontSize: 32 }}
                      title={`${g.char} (${g.name || g.unicode})`}
                    >
                      {g.char}
                    </div>
                  ))
                }
              </div>
            </Specimen>
          </>
        ) : (
          <div className="bg-canvas rounded-xl flex items-center justify-center py-16 px-5 text-center">
            <p className="text-[14px] text-muted-foreground">Clique em “Atualizar” para carregar a pré-visualização.</p>
          </div>
        )}
      </div>
    </Sheet>
  );
};

export default FontPreview;
