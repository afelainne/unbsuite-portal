import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileCode2, FolderOpen, Save } from 'lucide-react';
import { toast } from 'sonner';
import { FormatPanel } from './components/FormatPanel';
import { GridPanel } from './components/GridPanel';
import { InfoPanel } from './components/InfoPanel';
import { TemplatePreview } from './components/TemplatePreview';
import { TextTabs } from './components/controls';
import { configForPreset, configFromJson, configToJson, customPreset, defaultConfig } from './lib/config';
import { buildGridSvg } from './lib/exports';
import type { FormatPreset } from './lib/formats';
import { closeGrid, columnCountOf, computeGrid, GridConfig, MethodId } from './lib/grid';
import { applyMethod, methodInfo } from './lib/methods';
import { buildPdf } from './lib/pdf';
import { DEFAULT_LAYERS, Layers } from './lib/scene';
import { recommendFor, recommendationLabel, type Recommendation } from './lib/recommend';
import { loadState, saveState } from './lib/storage';
import type { Unit } from './lib/units';

type Tab = 'formato' | 'grade' | 'linhas';

const TABS: { value: Tab; label: string }[] = [
  { value: 'formato', label: 'Formato' },
  { value: 'grade', label: 'Grade' },
  { value: 'linhas', label: 'Linha de base' },
];

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Liberar a URL cedo demais cancela o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const slug = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'formato';

const App: React.FC = () => {
  const restored = useMemo(() => loadState(), []);
  const [config, setConfig] = useState<GridConfig>(() => restored?.config ?? defaultConfig());
  const [layers, setLayers] = useState<Layers>(() => restored?.layers ?? DEFAULT_LAYERS);
  const [unit, setUnit] = useState<Unit>(() => restored?.unit ?? (restored?.config?.docUnit === 'px' ? 'px' : 'mm'));
  const [tab, setTab] = useState<Tab>('grade');
  const fileRef = useRef<HTMLInputElement>(null);

  const result = useMemo(() => computeGrid(config), [config]);

  useEffect(() => {
    saveState({ config, layers, unit });
  }, [config, layers, unit]);

  const patch = useCallback((p: Partial<GridConfig>) => setConfig(c => ({ ...c, ...p })), []);

  /** Troca o formato e aplica a grade mais usada para ele; o método continua trocável à mão. */
  const applyFormat = (preset: FormatPreset, landscape?: boolean): Recommendation => {
    const rec = recommendFor(preset);
    setConfig(c => applyMethod(rec.method, configForPreset(preset, c, landscape), { columns: rec.columns, rows: rec.rows }));
    return rec;
  };

  const selectPreset = (preset: FormatPreset) => {
    const rec = applyFormat(preset);
    setUnit(preset.unit === 'px' ? 'px' : u => (u === 'px' ? 'mm' : u));
    toast.success(`${preset.name}: grade ${recommendationLabel(rec)}`, { description: 'A mais usada para este formato. Troque em Grade, se quiser.' });
  };

  const selectCustom = (width: number, height: number, u: 'mm' | 'px') => {
    const rec = applyFormat(customPreset(width, height, u), width > height);
    setUnit(u === 'px' ? 'px' : prev => (prev === 'px' ? 'mm' : prev));
    toast.success(`Formato personalizado: grade ${recommendationLabel(rec)}`);
  };

  const rotate = () => {
    setConfig(c => {
      const rotated: GridConfig = {
        ...c,
        width: c.height,
        height: c.width,
        safe: { top: c.safe.left, right: c.safe.top, bottom: c.safe.right, left: c.safe.bottom },
      };
      if (c.method !== 'livre') return applyMethod(c.method, rotated, { columns: columnCountOf(c), rows: c.rows });
      return rotated.baseline.enabled ? closeGrid(rotated).config : rotated;
    });
  };

  const setMethod = (id: MethodId, opts?: { columns?: number; rows?: number }) => {
    setConfig(c => applyMethod(id, c, opts));
    if (id !== 'livre') toast.success(`${methodInfo(id).name} aplicado`);
  };

  const closeTheGrid = () => {
    const res = closeGrid(config);
    setConfig(res.config);
    if (res.closed) toast.success(res.message);
    else toast.error('Não foi possível fechar: aumente a mancha ou reduza as linhas.');
  };

  const base = `unbsformat_${slug(config.formatName)}_${columnCountOf(config)}x${config.rows}`;

  const exportPdf = () => {
    try {
      triggerDownload(buildPdf(config, result, { layers }), `${base}.pdf`);
      toast.success('PDF exportado em escala real, com as guias numa camada que não imprime');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível gerar o PDF');
    }
  };

  const exportSvg = () => {
    triggerDownload(new Blob([buildGridSvg(config, result, layers)], { type: 'image/svg+xml;charset=utf-8' }), `${base}.svg`);
    toast.success('SVG exportado em escala real');
  };

  const saveJson = () => {
    triggerDownload(new Blob([configToJson(config)], { type: 'application/json' }), `${base}.json`);
    toast.success('Grade salva em JSON');
  };

  const openJson = (file: File) => {
    if (file.size > 256 * 1024) {
      toast.error('Arquivo grande demais para uma configuração de grade');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const c = configFromJson(String(reader.result ?? ''));
      if (!c) {
        toast.error('Este arquivo não é uma grade do UNBSFORMAT');
        return;
      }
      setConfig(c);
      setUnit(c.docUnit === 'px' ? 'px' : 'mm');
      toast.success('Grade carregada');
    };
    reader.onerror = () => toast.error('Não foi possível ler o arquivo');
    reader.readAsText(file);
  };

  const info = methodInfo(config.method);

  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto lg:overflow-hidden flex flex-col bg-background text-foreground">
      {/* Linha de título */}
      <div className="flex items-center justify-between gap-x-6 gap-y-3 flex-wrap px-4 sm:px-6 lg:px-10 pt-2 pb-5 shrink-0">
        <div className="flex items-baseline gap-x-5 gap-y-1 flex-wrap min-w-0">
          <h1 className="text-[28px] sm:text-[40px] leading-[1.1] tracking-[-0.015em] font-normal">Formato e grade</h1>
          <nav aria-label="Caminho" className="text-subhead text-muted-foreground min-w-0">
            <ol className="flex items-center gap-1.5 flex-wrap">
              <li>UNBSFORMAT</li>
              <li aria-hidden="true">/</li>
              <li className="truncate max-w-[180px]" title={config.formatName}>{config.formatName}</li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground" aria-current="page">{config.method === 'livre' ? `${columnCountOf(config)} × ${config.rows}` : info.name}</li>
            </ol>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) openJson(f);
              e.target.value = '';
            }}
          />
          <button type="button" className="ctl ctl-outline ctl-icon ctl-lg" aria-label="Abrir grade salva (JSON)" title="Abrir grade salva (JSON)" onClick={() => fileRef.current?.click()}>
            <FolderOpen className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          <button type="button" className="ctl ctl-outline ctl-icon ctl-lg" aria-label="Salvar grade (JSON)" title="Salvar grade (JSON)" onClick={saveJson}>
            <Save className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          <button type="button" className="ctl ctl-outline ctl-icon ctl-lg" aria-label="Exportar SVG" title="Exportar SVG em escala real" onClick={exportSvg}>
            <FileCode2 className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          <button type="button" className="ctl ctl-tinted ctl-lg" onClick={exportPdf} title="PDF em escala real, com sangria, marcas de corte e guias que não imprimem">
            <Download className="h-[18px] w-[18px]" aria-hidden="true" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Área de trabalho */}
      <div className="shrink-0 lg:shrink lg:flex-1 lg:min-h-0 flex flex-col lg:grid lg:grid-cols-[300px_minmax(0,1fr)_300px] xl:grid-cols-[330px_minmax(0,1fr)_330px] gap-5 px-4 sm:px-6 lg:px-10 pb-6 lg:pb-8">
        {/* Controles */}
        <div className="order-2 lg:order-1 lg:min-h-0 flex flex-col gap-4 lg:overflow-y-auto lg:pr-1 -mr-1 scrollbar-hide">
          <TextTabs label="Painéis de ajuste" idPrefix="unbsformat" value={tab} onChange={setTab} options={TABS} />
          <div role="tabpanel" id={`unbsformat-panel-${tab}`} aria-labelledby={`unbsformat-tab-${tab}`}>
            {tab === 'formato' ? (
              <FormatPanel config={config} unit={unit} onSelectPreset={selectPreset} onCustom={selectCustom} onRotate={rotate} onChange={patch} />
            ) : (
              <GridPanel config={config} result={result} unit={unit} onChange={patch} onMethod={setMethod} onClose={closeTheGrid} section={tab} />
            )}
          </div>
        </div>

        {/* Prévia */}
        <div className="order-1 lg:order-2 h-[78vh] min-h-[480px] lg:h-auto lg:min-h-0">
          <TemplatePreview
            config={config}
            result={result}
            layers={layers}
            unit={unit}
            onLayers={setLayers}
            onUnit={setUnit}
            onFacing={facing => patch({ facing, fold: facing ? 'none' : config.fold })}
          />
        </div>

        {/* Diagnóstico */}
        <div className="order-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1 scrollbar-hide">
          <InfoPanel config={config} result={result} unit={unit} onClose={closeTheGrid} />
        </div>
      </div>
    </div>
  );
};

export default App;

