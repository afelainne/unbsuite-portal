import { useRef, useEffect, useCallback } from 'react';
import { BrandData } from '../types';
import { SLIDE_MAP } from './ChapterNav';
import { getTheme, ManualTheme } from '../themes';
import CoverPage from '../chapters/CoverPage';
import IntroPage from '../chapters/IntroPage';
import LogoPage from '../chapters/LogoPage';
import ColorsPage from '../chapters/ColorsPage';
import TypographyPage from '../chapters/TypographyPage';
import GraphicsPage from '../chapters/GraphicsPage';
import LayoutPage from '../chapters/LayoutPage';
import VoicePage from '../chapters/VoicePage';
import ApplicationsPage from '../chapters/ApplicationsPage';
import DeliverablesPage from '../chapters/DeliverablesPage';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManualViewerProps {
  data: BrandData;
  onChange: (updated: Partial<BrandData>) => void;
  currentSlide: number;
  onSlideChange: (idx: number) => void;
}

// Renderiza o slide correto baseado no SLIDE_MAP
function renderSlide(
  idx: number,
  data: BrandData,
  onChange: (u: Partial<BrandData>) => void,
  theme: ManualTheme
) {
  const entry = SLIDE_MAP[idx];
  if (!entry) return null;

  const { chapterId, slideTitle } = entry;

  switch (chapterId) {
    case 'cover':
      return <CoverPage data={data} onChange={onChange} theme={theme} />;

    case 'intro':
      return slideTitle === 'Objetivo'
        ? <IntroPage data={data} onChange={onChange} slide="objective" theme={theme} />
        : <IntroPage data={data} onChange={onChange} slide="personality" theme={theme} />;

    case 'logo': {
      const slideMap: Record<string, 'gallery' | 'grid' | 'clearspace' | 'minsize' | 'donts'> = {
        'Variações': 'gallery',
        'Grid & Construção': 'grid',
        'Área de Proteção': 'clearspace',
        'Tamanho Mínimo': 'minsize',
        'Usos Incorretos': 'donts',
      };
      return <LogoPage data={data} onChange={onChange} slide={slideMap[slideTitle] || 'gallery'} theme={theme} />;
    }

    case 'colors': {
      const map: Record<string, 'palette' | 'neutrals' | 'a11y' | 'gradients'> = {
        'Paleta Principal': 'palette',
        'Neutros': 'neutrals',
        'Contraste A11y': 'a11y',
        'Gradientes': 'gradients',
      };
      return <ColorsPage data={data} onChange={onChange} slide={map[slideTitle] || 'palette'} theme={theme} />;
    }

    case 'typography': {
      const map: Record<string, 'typefaces' | 'hierarchy'> = {
        'Fontes': 'typefaces',
        'Hierarquia': 'hierarchy',
      };
      return <TypographyPage data={data} onChange={onChange} slide={map[slideTitle] || 'typefaces'} theme={theme} />;
    }

    case 'graphics': {
      const map: Record<string, 'visual' | 'icons'> = {
        'Linguagem Visual': 'visual',
        'Ícones': 'icons',
      };
      return <GraphicsPage data={data} onChange={onChange} slide={map[slideTitle] || 'visual'} theme={theme} />;
    }

    case 'layout': {
      const map: Record<string, 'spacing' | 'grid'> = {
        'Espaçamento': 'spacing',
        'Grid Responsivo': 'grid',
      };
      return <LayoutPage data={data} onChange={onChange} slide={map[slideTitle] || 'spacing'} theme={theme} />;
    }

    case 'voice':
      return <VoicePage data={data} onChange={onChange} theme={theme} />;

    case 'applications':
      return <ApplicationsPage data={data} onChange={onChange} theme={theme} />;

    case 'deliverables':
      return <DeliverablesPage data={data} theme={theme} />;

    default:
      return null;
  }
}

const ManualViewer = ({ data, onChange, currentSlide, onSlideChange }: ManualViewerProps) => {
  const totalSlides = SLIDE_MAP.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = getTheme(data.themeId ?? 'studio');

  // Navegação por teclado
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentSlide < totalSlides - 1) {
        onSlideChange(currentSlide + 1);
      }
      if (e.key === 'ArrowLeft' && currentSlide > 0) {
        onSlideChange(currentSlide - 1);
      }
    },
    [currentSlide, totalSlides, onSlideChange]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const slideContent = renderSlide(currentSlide, data, onChange, theme);
  const entry = SLIDE_MAP[currentSlide];

  return (
    <div ref={containerRef} className="flex flex-col gap-3 h-full">
      {/* Badge de slide */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono px-1">
        <span className="uppercase tracking-wider">{entry?.slideTitle}</span>
        <span>{currentSlide + 1} / {totalSlides}</span>
      </div>

      {/* Slide 16:9 */}
      <div
        className="relative w-full border border-foreground/10 rounded-xl overflow-hidden shadow-sm"
        style={{ aspectRatio: '16/9' }}
      >
        {slideContent}
      </div>

      {/* Controles de navegação */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => onSlideChange(currentSlide - 1)}
          disabled={currentSlide === 0}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors',
            currentSlide === 0
              ? 'text-foreground/20 cursor-not-allowed'
              : 'text-foreground/60 hover:text-foreground hover:bg-muted'
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Anterior
        </button>

        {/* Thumbnails de slides (dot navigation) */}
        <div className="flex gap-1 flex-wrap justify-center max-w-sm">
          {SLIDE_MAP.map((_, i) => (
            <button
              key={i}
              onClick={() => onSlideChange(i)}
              className={cn(
                'rounded-full transition-all',
                i === currentSlide
                  ? 'bg-primary w-4 h-1.5'
                  : 'bg-foreground/15 hover:bg-foreground/30 w-1.5 h-1.5'
              )}
              title={SLIDE_MAP[i].slideTitle}
            />
          ))}
        </div>

        <button
          onClick={() => onSlideChange(currentSlide + 1)}
          disabled={currentSlide === totalSlides - 1}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors',
            currentSlide === totalSlides - 1
              ? 'text-foreground/20 cursor-not-allowed'
              : 'text-foreground/60 hover:text-foreground hover:bg-muted'
          )}
        >
          Próximo
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ManualViewer;
