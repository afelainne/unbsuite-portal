import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FilePlus2, FolderOpen, Moon, Save, Sun } from 'lucide-react';
import type { FontStyle, Glyph, KerningSettings, Metrics, Project, SpacingSettings } from './lib/types';
import { addGlyphs, rekern, removeGlyph, respace, setMetrics, updateGlyph } from './lib/actions';
import {
  AUTOSAVE_KEY, downloadBlob, loadAutosave, newId, newProject, newStyle, parseProject, PROJECT_EXTENSION, rescaleUpm, saveAutosave, serializeProject,
} from './lib/project';
import { buildFont, fontFileName, type FontFormat } from './lib/font';
import type { SheetGuides } from './lib/sheet';
import { IconButton, Segmented, Sheet, Spinner, TextTabs, TitleRow } from './components/ui';
import { Sidebar } from './components/Sidebar';
import { InputStep } from './components/InputStep';
import { SpacingStep } from './components/SpacingStep';
import { KerningStep } from './components/KerningStep';
import { TestStep } from './components/TestStep';
import { cx } from './components/cx';

type Step = 'entrada' | 'espaco' | 'kerning' | 'teste';
type Tone = 'ok' | 'error' | 'info';
interface Notice { id: number; message: string; tone: Tone }

const STEPS: { value: Step; label: string }[] = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'espaco', label: 'Espaço' },
  { value: 'kerning', label: 'Kerning' },
  { value: 'teste', label: 'Teste' },
];

const THEME_KEY = 'unbsfont:dark';

const App: React.FC = () => {
  const [project, setProject] = useState<Project>(() => loadAutosave() ?? newProject());
  const [styleId, setStyleId] = useState(() => project.styles[0].id);
  const [step, setStep] = useState<Step>('entrada');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [format, setFormat] = useState<FontFormat>('otf');
  const [scope, setScope] = useState<'one' | 'all'>('one');
  const [exporting, setExporting] = useState(false);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) === '1'; } catch { return false; }
  });
  const openRef = useRef<HTMLInputElement>(null);
  const storageWarned = useRef(false);

  const style = project.styles.find(s => s.id === styleId) ?? project.styles[0];

  const notify = useCallback((message: string, tone: Tone = 'info') => {
    const id = Date.now() + Math.random();
    setNotices(prev => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setNotices(prev => prev.filter(n => n.id !== id)), tone === 'error' ? 6000 : 4000);
  }, []);

  // Salva no navegador pouco depois de cada mudança. Só grava o que mudou de fato, e
  // outra aba que salvar atualiza esta: duas abas abertas não apagam o trabalho uma da outra.
  const lastSaved = useRef<string | null>(null);
  if (lastSaved.current === null) lastSaved.current = serializeProject(project);
  useEffect(() => {
    const text = serializeProject(project);
    if (text === lastSaved.current) return;
    const t = window.setTimeout(() => {
      lastSaved.current = text;
      if (!saveAutosave(project) && !storageWarned.current) {
        storageWarned.current = true;
        notify('O projeto não coube no navegador. Salve como arquivo para não perder.', 'error');
      }
    }, 700);
    return () => window.clearTimeout(t);
  }, [project, notify]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUTOSAVE_KEY || !e.newValue || e.newValue === lastSaved.current) return;
      try {
        const p = parseProject(e.newValue);
        lastSaved.current = e.newValue;
        setProject(p);
        setStyleId(id => (p.styles.some(s => s.id === id) ? id : p.styles[0].id));
      } catch { /* conteúdo ilegível: fica o desta aba */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, dark ? '1' : '0'); } catch { /* preferência só nesta sessão */ }
  }, [dark]);

  /* ------------------------------------------------ atualizações */

  const updateStyle = useCallback((fn: (s: FontStyle, m: Metrics) => FontStyle) => {
    setProject(p => ({ ...p, styles: p.styles.map(s => (s.id === style.id ? fn(s, p.metrics) : s)) }));
  }, [style.id]);

  const onAddGlyphs = useCallback((glyphs: Glyph[], srcCap: number, guides?: SheetGuides) => {
    setProject(p => addGlyphs(p, style.id, glyphs, srcCap, guides));
  }, [style.id]);

  const onGlyph = useCallback((g: Glyph) => {
    // Destravado (ou mudou a forma): o automático refaz as margens. Os derivados acompanham sempre.
    updateStyle((s, m) => updateGlyph(s, g, m));
  }, [updateStyle]);

  const onSpacing = (spacing: SpacingSettings) => updateStyle((s, m) => respace({ ...s, spacing }, m));
  const onKerningSettings = (settings: KerningSettings) =>
    updateStyle((s, m) => {
      const next = { ...s, kerning: { ...s.kerning, settings } };
      return Object.keys(s.kerning.auto).length ? rekern(next, m) : next;
    });
  const onManual = (key: string, value: number | null) =>
    updateStyle(s => {
      const manual = { ...s.kerning.manual };
      if (value === null) delete manual[key];
      else manual[key] = value;
      return { ...s, kerning: { ...s.kerning, manual } };
    });

  /* ------------------------------------------------ estilos */

  const addStyle = (name: string, copyFrom?: string) => {
    const unique = (base: string) => {
      let n = base;
      let i = 2;
      while (project.styles.some(s => s.name === n)) n = `${base} ${i++}`;
      return n;
    };
    const source = project.styles.find(s => s.id === copyFrom);
    const created: FontStyle = source ? { ...source, id: newId(), name: unique(name) } : newStyle(unique(name));
    setProject(p => ({ ...p, styles: [...p.styles, created] }));
    setStyleId(created.id);
    setStep('entrada');
  };
  const removeStyle = (id: string) => {
    const target = project.styles.find(s => s.id === id);
    if (!target || project.styles.length < 2) return;
    if (!window.confirm(`Excluir o estilo ${target.name}? Não dá para desfazer.`)) return;
    const rest = project.styles.filter(s => s.id !== id);
    setProject(p => ({ ...p, styles: p.styles.filter(s => s.id !== id) }));
    setStyleId(rest[0].id);
  };

  /* ------------------------------------------------ arquivo */

  const safeName = (project.family.trim() || 'fonte').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '-');

  const saveProject = () => {
    downloadBlob(new Blob([serializeProject(project)], { type: 'application/json' }), `${safeName}${PROJECT_EXTENSION}`);
    notify('Projeto salvo como arquivo.', 'ok');
  };

  const openProject = (file: File | undefined) => {
    if (!file) return;
    file.text().then(text => {
      const p = parseProject(text);
      setProject(p);
      setStyleId(p.styles[0].id);
      setStep('entrada');
      notify(`Projeto ${p.family} aberto.`, 'ok');
    }).catch(e => notify(e instanceof Error ? e.message : 'Não foi possível abrir o projeto.', 'error'));
  };

  const resetProject = () => {
    if (!window.confirm('Começar um projeto novo? O atual fica só se você tiver salvo o arquivo.')) return;
    const p = newProject();
    setProject(p);
    setStyleId(p.styles[0].id);
    setStep('entrada');
  };

  const exportFonts = async () => {
    const targets = (scope === 'all' ? project.styles : [style]).filter(s => Object.values(s.glyphs).some(g => g.outline.length));
    if (!targets.length) { notify('Nenhum glifo para exportar.', 'error'); return; }
    setExporting(true);
    try {
      for (const [i, s] of targets.entries()) {
        const built = await buildFont(project, s, format);
        const name = fontFileName(project, s, format);
        // Um pequeno intervalo entre arquivos: o navegador bloqueia downloads em rajada.
        window.setTimeout(() => downloadBlob(new Blob([built.buffer], { type: `font/${format}` }), name), i * 400);
        notify(`${name}: ${built.glyphCount} glifos, ${built.kerningPairs} pares de kerning.`, 'ok');
      }
      setExportOpen(false);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Não foi possível exportar a fonte.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const drawnStyles = project.styles.filter(s => Object.values(s.glyphs).some(g => g.outline.length)).length;

  return (
    <div className={cx(dark && 'dark', 'flex-1 min-h-0 min-w-0 flex flex-col bg-background text-foreground')}>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-10 pt-2 pb-10 max-w-[1600px] mx-auto">
          <TitleRow
            title={project.family.trim() || 'Sem nome'}
            actions={
              <>
                <input ref={openRef} type="file" accept={`${PROJECT_EXTENSION},application/json,.json`} className="hidden" onChange={e => { openProject(e.target.files?.[0]); e.target.value = ''; }} />
                <IconButton label="Novo projeto" variant="surface" onClick={resetProject}><FilePlus2 aria-hidden="true" /></IconButton>
                <IconButton label="Abrir projeto" variant="surface" onClick={() => openRef.current?.click()}><FolderOpen aria-hidden="true" /></IconButton>
                <IconButton label="Salvar projeto" variant="surface" onClick={saveProject}><Save aria-hidden="true" /></IconButton>
                <IconButton label={dark ? 'Usar tema claro' : 'Usar tema escuro'} variant="surface" onClick={() => setDark(d => !d)}>
                  {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
                </IconButton>
                <button type="button" className="ctl ctl-tinted ctl-lg" onClick={() => setExportOpen(true)}>
                  <Download className="w-[18px] h-[18px]" aria-hidden="true" />
                  Exportar fonte
                </button>
              </>
            }
            tabs={<TextTabs<Step> ariaLabel="Etapas" items={STEPS} value={step} onChange={setStep} />}
          />

          <div className="mt-6 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] items-start">
            <div className="order-2 lg:order-1">
              <Sidebar
                project={project}
                styleId={style.id}
                onFamily={family => setProject(p => ({ ...p, family }))}
                onDesigner={designer => setProject(p => ({ ...p, designer }))}
                onSelectStyle={setStyleId}
                onAddStyle={addStyle}
                onRenameStyle={(id, name) => setProject(p => ({ ...p, styles: p.styles.map(s => (s.id === id ? { ...s, name } : s)) }))}
                onRemoveStyle={removeStyle}
                onMetrics={m => setProject(p => setMetrics(p, m))}
                onUpm={upm => setProject(p => rescaleUpm(p, upm))}
              />
            </div>
            <section className="order-1 lg:order-2 min-w-0" role="tabpanel" aria-label={STEPS.find(s => s.value === step)?.label}>
              {step === 'entrada' && (
                <InputStep
                  project={project}
                  style={style}
                  onAddGlyphs={onAddGlyphs}
                  onGlyph={onGlyph}
                  onRemoveGlyph={char => updateStyle((s, m) => respace(removeGlyph(s, char), m))}
                  onUpdateStyle={updateStyle}
                  notify={notify}
                />
              )}
              {step === 'espaco' && (
                <SpacingStep
                  project={project}
                  style={style}
                  onSpacing={onSpacing}
                  onGlyph={onGlyph}
                  onUnlockAll={() => updateStyle((s, m) => respace({ ...s, glyphs: Object.fromEntries(Object.entries(s.glyphs).map(([c, g]) => [c, { ...g, locked: false }])) }, m))}
                />
              )}
              {step === 'kerning' && (
                <KerningStep
                  project={project}
                  style={style}
                  onSettings={onKerningSettings}
                  onGenerate={() => { updateStyle((s, m) => rekern(s, m)); notify('Kerning automático gerado.', 'ok'); }}
                  onClear={() => { if (window.confirm('Apagar todo o kerning deste estilo, inclusive os ajustes à mão?')) updateStyle(s => ({ ...s, kerning: { ...s.kerning, auto: {}, manual: {} } })); }}
                  onManual={onManual}
                />
              )}
              {step === 'teste' && <TestStep project={project} style={style} />}
            </section>
          </div>
        </div>
      </div>

      <Sheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Exportar fonte"
        description="Contornos do jeito que foram desenhados, com as margens, o kerning (GPOS e kern) e os nomes de família e estilo."
        size="max-w-md"
        footer={
          <>
            <button type="button" className="ctl ctl-plain ctl-lg" onClick={() => setExportOpen(false)}>Cancelar</button>
            <button type="button" className="ctl ctl-filled ctl-lg" disabled={exporting} aria-busy={exporting} onClick={exportFonts}>
              {exporting && <Spinner />}
              Baixar
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-[12px] text-muted-foreground">Formato</span>
            <Segmented<FontFormat>
              ariaLabel="Formato"
              value={format}
              onChange={setFormat}
              items={[{ value: 'otf', label: 'OTF' }, { value: 'ttf', label: 'TTF' }]}
            />
            <span className="text-[12px] text-muted-foreground">
              {format === 'otf' ? 'Curvas cúbicas, iguais às do SVG.' : 'O TrueType só aceita curvas quadráticas: as cúbicas do SVG são convertidas.'}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[12px] text-muted-foreground">Estilos</span>
            <Segmented<'one' | 'all'>
              ariaLabel="Estilos"
              value={scope}
              onChange={setScope}
              items={[{ value: 'one', label: style.name || 'Atual' }, { value: 'all', label: `Família (${drawnStyles})` }]}
            />
          </div>
        </div>
      </Sheet>

      {notices.length > 0 && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[80] flex flex-col items-end gap-2 pointer-events-none" role="status" aria-live="polite">
          {notices.map(n => (
            <div key={n.id} className="material-popover fade-in-up w-full sm:w-96 px-4 py-3 pointer-events-auto flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className={cx('mt-1.5 w-2 h-2 rounded-pill shrink-0', n.tone === 'ok' && 'bg-accent shadow-[0_0_0_1px_hsl(var(--foreground)/0.2)]', n.tone === 'error' && 'bg-destructive', n.tone === 'info' && 'bg-muted-foreground')}
              />
              <p className="text-[14px] leading-snug text-foreground">{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
