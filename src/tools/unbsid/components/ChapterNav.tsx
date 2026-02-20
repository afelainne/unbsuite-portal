import { useState } from 'react';
import { CHAPTERS } from '../types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChapterNavProps {
  currentSlide: number;
  onSlideChange: (idx: number) => void;
  totalSlides: number;
}

// Calcula o índice de slide de cada capítulo
function buildSlideMap() {
  const map: { chapterId: string; slideTitle: string; globalIdx: number }[] = [];
  let idx = 0;
  for (const ch of CHAPTERS) {
    for (const slideTitle of ch.slides) {
      map.push({ chapterId: ch.id, slideTitle, globalIdx: idx });
      idx++;
    }
  }
  return map;
}

const SLIDE_MAP = buildSlideMap();

const ChapterNav = ({ currentSlide, onSlideChange }: ChapterNavProps) => {
  // Quais capítulos estão abertos
  const activeChapterId = SLIDE_MAP[currentSlide]?.chapterId;
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set([activeChapterId]));

  const toggleChapter = (id: string) => {
    setOpenChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <nav className="flex flex-col gap-0.5 overflow-y-auto py-2">
      {CHAPTERS.map((chapter) => {
        const chapterSlides = SLIDE_MAP.filter((s) => s.chapterId === chapter.id);
        const isOpen = openChapters.has(chapter.id);
        const isActiveChapter = chapter.id === activeChapterId;

        return (
          <Collapsible key={chapter.id} open={isOpen} onOpenChange={() => toggleChapter(chapter.id)}>
            <CollapsibleTrigger
              className={cn(
                'flex items-center gap-1.5 w-full px-3 py-1.5 text-left text-xs rounded-lg transition-colors',
                isActiveChapter
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <ChevronRight
                className={cn(
                  'h-3 w-3 flex-shrink-0 transition-transform',
                  isOpen && 'rotate-90'
                )}
              />
              <span className="truncate">{chapter.title}</span>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="ml-5 flex flex-col gap-0.5 py-0.5">
                {chapterSlides.map((slide) => {
                  const isActive = slide.globalIdx === currentSlide;
                  return (
                    <button
                      key={slide.globalIdx}
                      onClick={() => onSlideChange(slide.globalIdx)}
                      className={cn(
                        'text-left px-2 py-1 rounded text-[11px] transition-colors truncate',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                      )}
                    >
                      {slide.slideTitle}
                    </button>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </nav>
  );
};

export default ChapterNav;
export { SLIDE_MAP };
