import { createDefaultGlyphModel, GlyphModel, FontMetrics, HandlePosition } from './core/glyphModel';
import { OverlayController, OverlaySnapshot } from './core/overlays';
import {
  AlignmentZone,
  AlignmentZoneType,
  FontState,
  FontStateStore,
  loadPersistedState,
  savePersistedState
} from './core/fontState';
import { CanvasRenderer, SelectionState } from './ui/canvasRenderer';
import { ToolController, ToolMode } from './ui/tools';

interface InspectorInput extends HTMLInputElement {
  dataset: DOMStringMap & { bind: string };
}

const parseNumberList = (value: string): number[] =>
  value
    .split(',')
    .map(entry => Number(entry.trim()))
    .filter(entry => Number.isFinite(entry) && entry !== 0)
    .map(entry => Math.abs(Math.round(entry)));

const formatStemList = (values: number[]) => values.join(', ');

export const initEditor = () => {
  const canvas = document.getElementById('glyphCanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('Canvas principal não encontrado.');
  }

  const persisted = loadPersistedState();
  const glyphModel: GlyphModel = persisted?.glyph ? new GlyphModel(persisted.glyph) : createDefaultGlyphModel();
  const fontStateStore = new FontStateStore(persisted?.font);
  let fontState = fontStateStore.getState();
  glyphModel.updateMetrics(fontState.metrics);

  const overlayController = new OverlayController(fontState.metrics);
  overlayController.setAlignmentZones(fontState.alignmentZones);
  overlayController.setStemTargets('vertical', fontState.verticalStems);
  overlayController.setStemTargets('horizontal', fontState.horizontalStems);
  overlayController.setGlyphState(glyphModel.getState());

  const renderer = new CanvasRenderer(canvas);

  let glyphState = glyphModel.getState();
  let overlaySnapshot = overlayController.getSnapshot();

  const cursorReadout = document.getElementById('cursorPosition');
  const selectionReadout = document.getElementById('selectionInfo');
  const zoomIndicator = document.getElementById('zoomIndicator');
  const resetViewBtn = document.getElementById('resetViewBtn');
  const metricsForm = document.getElementById('metricsForm') as HTMLFormElement | null;
  const toolButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-tool]'));
  const toggleInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-toggle]'));
  const inspectorInputs = Array.from(document.querySelectorAll<InspectorInput>('input[data-bind]'));
  const deletePointBtn = document.getElementById('deletePointBtn');
  const mirrorHandlesBtn = document.getElementById('mirrorHandlesBtn');
  const verticalStemsInput = document.getElementById('verticalStemsInput') as HTMLInputElement | null;
  const horizontalStemsInput = document.getElementById('horizontalStemsInput') as HTMLInputElement | null;
  const resetStemsBtn = document.getElementById('resetStemsBtn');
  const zonesList = document.getElementById('zonesList');
  const addZoneBtn = document.getElementById('addZoneBtn');
  const resetZonesBtn = document.getElementById('resetZonesBtn');
  const zoneTypeSelect = document.getElementById('zoneTypeSelect') as HTMLSelectElement | null;
  const zoneLabelInput = document.getElementById('zoneLabelInput') as HTMLInputElement | null;
  const zonePositionInput = document.getElementById('zonePositionInput') as HTMLInputElement | null;
  const zoneSizeInput = document.getElementById('zoneSizeInput') as HTMLInputElement | null;
  const saveProjectBtn = document.getElementById('saveProjectBtn');
  const saveStatus = document.getElementById('saveStatus');

  if (
    !metricsForm ||
    !cursorReadout ||
    !selectionReadout ||
    !verticalStemsInput ||
    !horizontalStemsInput ||
    !zonesList
  ) {
    throw new Error('Elementos de UI essenciais não encontrados.');
  }

  let tool: ToolController;

  const render = () => {
    if (!tool) return;
    renderer.render({
      glyph: glyphState,
      overlays: overlaySnapshot,
      selection: tool.getSelection(),
      hover: tool.getHover(),
      view: tool.getView(),
      cursorWorld: tool.getCursorWorld()
    });
    updateZoomIndicator();
    updateInspectorFields();
  };

  const toolCallbacks = {
    onStateChange: render,
    onCursorMove: (world: { x: number; y: number } | null) => updateCursorReadout(world),
    onSelectionChange: (selection: SelectionState) => handleSelectionChange(selection)
  };

  tool = new ToolController(canvas, glyphModel, toolCallbacks, {
    getZones: () => fontState.alignmentZones,
    getStems: () => overlaySnapshot.stems,
    reportSnap: highlight => overlayController.setSnapHighlight(highlight)
  });
  const baseZoom = tool.getView().zoom;

  let lastMetrics = glyphModel.getMetrics();

  glyphModel.subscribe(state => {
    glyphState = state;
    overlayController.setGlyphState(state);
    render();
  });

  overlayController.subscribe(snapshot => {
    overlaySnapshot = snapshot;
    render();
  });

  fontStateStore.subscribe(next => {
    fontState = next;
    overlayController.updateMetrics(next.metrics);
    overlayController.setAlignmentZones(next.alignmentZones);
    overlayController.setStemTargets('vertical', next.verticalStems);
    overlayController.setStemTargets('horizontal', next.horizontalStems);
    if (!areMetricsEqual(next.metrics, lastMetrics)) {
      glyphModel.updateMetrics(next.metrics);
      lastMetrics = next.metrics;
    }
    setupMetricForm(metricsForm, next.metrics);
    updateStemInputs(next);
    renderZoneList(next.alignmentZones);
  });

  window.addEventListener('resize', () => {
    renderer.resize();
    tool.updateCanvasMetrics();
    render();
  });

  if (resetViewBtn) {
    resetViewBtn.addEventListener('click', () => tool.resetView());
  }

  metricsForm.addEventListener('input', event => {
    const target = event.target as HTMLInputElement;
    if (!target?.name) return;
    const value = Number(target.value);
    if (Number.isNaN(value)) return;
    fontStateStore.updateMetrics({ [target.name]: value } as Partial<FontMetrics>);
  });

  const toggleMap: Record<string, keyof OverlaySnapshot['options']> = {
    zones: 'showZones',
    stems: 'showStems',
    grid: 'showGrid'
  };

  toggleInputs.forEach(input => {
    input.addEventListener('change', () => {
      const dataKey = input.dataset.toggle ?? '';
      const mapped = toggleMap[dataKey];
      if (!mapped) return;
      overlayController.setOption(mapped, input.checked);
    });
  });

  toolButtons.forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      const mode = button.dataset.tool as ToolMode;
      tool.setMode(mode);
      toolButtons.forEach(btn => btn.classList.toggle('active', btn === button));
    });
  });

  inspectorInputs.forEach(input => {
    input.addEventListener('change', () => handleInspectorInput(input));
  });

  if (deletePointBtn) {
    deletePointBtn.addEventListener('click', () => {
      const { pointId } = tool.getSelection();
      if (!pointId) return;
      glyphModel.removeAnchor(pointId);
      tool.clearSelection();
      selectionReadout.textContent = 'Nenhum ponto selecionado';
    });
  }

  if (mirrorHandlesBtn) {
    mirrorHandlesBtn.addEventListener('click', () => mirrorHandles());
  }

  verticalStemsInput.addEventListener('change', () => {
    fontStateStore.setVerticalStems(parseNumberList(verticalStemsInput.value));
  });

  horizontalStemsInput.addEventListener('change', () => {
    fontStateStore.setHorizontalStems(parseNumberList(horizontalStemsInput.value));
  });

  if (resetStemsBtn) {
    resetStemsBtn.addEventListener('click', () => fontStateStore.resetStems());
  }

  if (addZoneBtn) {
    addZoneBtn.addEventListener('click', event => {
      event.preventDefault();
      const type = (zoneTypeSelect?.value ?? 'custom') as AlignmentZoneType;
      const payload: Partial<AlignmentZone> = { type };
      if (zoneLabelInput?.value) {
        payload.label = zoneLabelInput.value;
      }
      if (type === 'custom') {
        const position = Number(zonePositionInput?.value ?? fontState.metrics.baseline);
        const size = Number(zoneSizeInput?.value ?? 20);
        if (!Number.isNaN(position)) payload.position = position;
        if (!Number.isNaN(size) && size > 0) payload.size = size;
      }
      fontStateStore.addAlignmentZone(payload);
      if (zoneLabelInput) zoneLabelInput.value = '';
    });
  }

  if (resetZonesBtn) {
    resetZonesBtn.addEventListener('click', () => fontStateStore.resetAlignmentZones());
  }

  if (saveProjectBtn) {
    saveProjectBtn.addEventListener('click', () => {
      savePersistedState({ font: fontStateStore.getState(), glyph: glyphModel.getState() });
      if (saveStatus) {
        saveStatus.textContent = 'Projeto salvo';
        window.setTimeout(() => {
          if (saveStatus.textContent === 'Projeto salvo') {
            saveStatus.textContent = '';
          }
        }, 2200);
      }
    });
  }

  const handleSelectionChange = (selection: SelectionState) => {
    if (!selection.pointId) {
      selectionReadout.textContent = 'Nenhum ponto selecionado';
      updateInspectorFields();
      return;
    }
    const point = glyphModel.getAnchor(selection.pointId);
    if (!point) return;
    selectionReadout.textContent = `Ponto ${selection.pointId.slice(-4)} · x ${Math.round(point.x)} · y ${Math.round(point.y)}`;
    updateInspectorFields();
  };

  const updateInspectorFields = () => {
    const { pointId } = tool.getSelection();
    const point = pointId ? glyphModel.getAnchor(pointId) : null;
    inspectorInputs.forEach(input => {
      input.disabled = !point;
      if (!point) {
        input.value = '';
        return;
      }
      switch (input.dataset.bind) {
        case 'pointX':
          input.value = point.x.toFixed(1);
          break;
        case 'pointY':
          input.value = point.y.toFixed(1);
          break;
        case 'handleInX':
          input.value = point.handleIn ? point.handleIn.x.toFixed(1) : '';
          break;
        case 'handleInY':
          input.value = point.handleIn ? point.handleIn.y.toFixed(1) : '';
          break;
        case 'handleOutX':
          input.value = point.handleOut ? point.handleOut.x.toFixed(1) : '';
          break;
        case 'handleOutY':
          input.value = point.handleOut ? point.handleOut.y.toFixed(1) : '';
          break;
        default:
          break;
      }
    });
  };

  const handleInspectorInput = (input: InspectorInput) => {
    const { pointId } = tool.getSelection();
    if (!pointId) return;
    const value = Number(input.value);
    if (Number.isNaN(value)) return;
    const binding = input.dataset.bind;
    const point = glyphModel.getAnchor(pointId);
    if (!point) return;

    if (binding === 'pointX' || binding === 'pointY') {
      glyphModel.updateAnchor(pointId, {
        [binding === 'pointX' ? 'x' : 'y']: value
      });
      return;
    }

    const handleKey = binding.startsWith('handleIn') ? 'handleIn' : 'handleOut';
    const currentHandle = handleKey === 'handleIn' ? point.handleIn : point.handleOut;
    const fallback = currentHandle ?? { x: point.x, y: point.y };
    const nextHandle: HandlePosition = {
      x: binding.endsWith('X') ? value : fallback.x,
      y: binding.endsWith('Y') ? value : fallback.y
    };
    glyphModel.updateHandle(pointId, handleKey as 'handleIn' | 'handleOut', nextHandle);
  };

  const updateCursorReadout = (world: { x: number; y: number } | null) => {
    if (!cursorReadout) return;
    if (!world) {
      cursorReadout.textContent = 'x 0 · y 0';
      return;
    }
    cursorReadout.textContent = `x ${Math.round(world.x)} · y ${Math.round(world.y)}`;
  };

  const updateZoomIndicator = () => {
    if (!zoomIndicator) return;
    const ratio = tool.getView().zoom / baseZoom;
    zoomIndicator.textContent = `${Math.round(ratio * 100)}%`;
  };

  const setupMetricForm = (form: HTMLFormElement, metrics: FontMetrics) => {
    const map: Record<string, number> = {
      unitsPerEm: metrics.unitsPerEm,
      baseline: metrics.baseline,
      xHeight: metrics.xHeight,
      capHeight: metrics.capHeight,
      ascender: metrics.ascender,
      descender: metrics.descender
    };
    Object.entries(map).forEach(([key, value]) => {
      const input = form.elements.namedItem(key) as HTMLInputElement | null;
      if (input) {
        input.value = String(value);
      }
    });
  };

  const areMetricsEqual = (next: FontMetrics, prev: FontMetrics) => (
    next.unitsPerEm === prev.unitsPerEm &&
    next.baseline === prev.baseline &&
    next.xHeight === prev.xHeight &&
    next.capHeight === prev.capHeight &&
    next.ascender === prev.ascender &&
    next.descender === prev.descender
  );

  const updateStemInputs = (state: FontState) => {
    verticalStemsInput.value = formatStemList(state.verticalStems);
    horizontalStemsInput.value = formatStemList(state.horizontalStems);
  };

  const renderZoneList = (zones: AlignmentZone[]) => {
    zonesList.innerHTML = '';
    zones.forEach(zone => {
      const card = document.createElement('div');
      card.className = 'zone-card';

      const header = document.createElement('div');
      header.className = 'zone-card__header';
      const badge = document.createElement('span');
      badge.className = 'zone-badge';
      badge.style.backgroundColor = zone.type === 'custom' ? '#5E5CE6' : '#111';
      badge.textContent = zone.label;
      header.appendChild(badge);

      const fieldset = document.createElement('div');
      fieldset.className = 'zone-card__fields';

      const positionField = createZoneField('Posição', zone.position.toFixed(1), zone.type === 'custom');
      const sizeField = createZoneField('Altura', zone.size.toFixed(1), true);
      const labelField = createZoneField('Label', zone.label, zone.type === 'custom', 'text');

      if (zone.type === 'custom') {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'ghost-btn';
        removeBtn.textContent = 'Remover';
        removeBtn.addEventListener('click', () => fontStateStore.removeAlignmentZone(zone.id));
        card.append(removeBtn);
      }

      const positionInput = positionField.querySelector('input');
      const sizeInput = sizeField.querySelector('input');
      const labelInput = labelField.querySelector('input');

      positionInput?.addEventListener('change', () => {
        const value = Number(positionInput.value);
        if (!Number.isNaN(value)) fontStateStore.updateAlignmentZone(zone.id, { position: value });
      });

      sizeInput?.addEventListener('change', () => {
        const value = Number(sizeInput.value);
        if (!Number.isNaN(value) && value > 0) fontStateStore.updateAlignmentZone(zone.id, { size: value });
      });

      labelInput?.addEventListener('change', () => {
        fontStateStore.updateAlignmentZone(zone.id, { label: labelInput.value || zone.label });
      });

      fieldset.append(positionField, sizeField, labelField);
      card.append(header, fieldset);
      zonesList.appendChild(card);
    });
  };

  const createZoneField = (label: string, value: string, editable: boolean, type: 'number' | 'text' = 'number') => {
    const wrapper = document.createElement('label');
    wrapper.className = 'zone-field';
    wrapper.textContent = label;
    const input = document.createElement('input');
    input.type = type;
    input.value = value;
    if (!editable) input.disabled = true;
    wrapper.appendChild(input);
    return wrapper;
  };

  const mirrorHandles = () => {
    const { pointId } = tool.getSelection();
    if (!pointId) return;
    const point = glyphModel.getAnchor(pointId);
    if (!point) return;

    const mirror = (source: HandlePosition | null): HandlePosition | null => {
      if (!source) return null;
      const dx = point.x - source.x;
      const dy = point.y - source.y;
      return { x: point.x + dx, y: point.y + dy };
    };

    if (point.handleIn) {
      glyphModel.updateHandle(pointId, 'handleOut', mirror(point.handleIn));
    } else if (point.handleOut) {
      glyphModel.updateHandle(pointId, 'handleIn', mirror(point.handleOut));
    }
  };

  const applyInitialUIState = () => {
    updateCursorReadout(null);
    handleSelectionChange(tool.getSelection());
    setupMetricForm(metricsForm, fontState.metrics);
    updateStemInputs(fontState);
    renderZoneList(fontState.alignmentZones);
    toolButtons[0]?.classList.add('active');
  };

  applyInitialUIState();
  render();
};
