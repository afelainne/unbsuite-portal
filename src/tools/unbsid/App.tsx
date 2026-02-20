import { useState } from 'react';
import { BrandData, DEFAULT_BRAND_DATA } from './types';
import ChapterNav from './components/ChapterNav';
import ManualViewer from './components/ManualViewer';
import ExportPanel from './components/ExportPanel';
import ThemePicker from './components/ThemePicker';
import { BookOpen, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'unbsid_brand_data';

function loadData(): BrandData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_BRAND_DATA, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_BRAND_DATA;
}

function saveData(data: BrandData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

const UnbsIdApp = () => {
  const [data, setData] = useState<BrandData>(loadData);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleChange = (updated: Partial<BrandData>) => {
    setData((prev) => {
      const next = { ...prev, ...updated };
      saveData(next);
      return next;
    });
  };

  const handleReset = () => {
    if (window.confirm('Resetar todos os dados? Esta ação não pode ser desfeita.')) {
      localStorage.removeItem(STORAGE_KEY);
      setData(DEFAULT_BRAND_DATA);
      setCurrentSlide(0);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Sidebar esquerda: capítulos ─────────────────────────── */}
      <aside className="w-52 flex-shrink-0 border-r border-foreground/10 flex flex-col bg-background/95">
        {/* Header */}
        <div className="px-4 py-3 border-b border-foreground/10">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider">UnbsID</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{data.name}</p>
        </div>

        {/* Chapter navigation */}
        <div className="flex-1 overflow-y-auto">
          <ChapterNav
            currentSlide={currentSlide}
            onSlideChange={setCurrentSlide}
            totalSlides={0}
          />
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-foreground/10">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 w-full text-[10px] text-muted-foreground hover:text-destructive transition-colors py-1"
          >
            <RotateCcw className="h-3 w-3" />
            Resetar dados
          </button>
        </div>
      </aside>

      {/* ── Área principal ──────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-foreground/10 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold">{data.name}</h1>
            <span className="text-[10px] font-mono text-muted-foreground border border-foreground/10 rounded px-1.5 py-0.5">
              {data.version}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemePicker
              currentThemeId={data.themeId ?? 'studio'}
              onChange={(themeId) => handleChange({ themeId })}
            />
            <ExportPanel data={data} />
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 p-6 overflow-auto">
          <ManualViewer
            data={data}
            onChange={handleChange}
            currentSlide={currentSlide}
            onSlideChange={setCurrentSlide}
          />
        </div>
      </main>
    </div>
  );
};

export default UnbsIdApp;
