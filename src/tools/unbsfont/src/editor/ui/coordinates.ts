export interface ViewTransform {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Converte coordenadas do espaço da fonte (unidades por EM) para pixels do canvas.
 * Mantém a origem na baseline central definida por offsetX/offsetY.
 */
export const fontToCanvas = (
  x: number,
  y: number,
  view: ViewTransform
): { x: number; y: number } => ({
  x: view.offsetX + x * view.zoom,
  y: view.offsetY - y * view.zoom
});

/**
 * Converte coordenadas de pixel (canvas) para o espaço da fonte.
 * Usado por ferramentas para traduzir cliques e arrastos.
 */
export const canvasToFont = (
  x: number,
  y: number,
  view: ViewTransform
): { x: number; y: number } => ({
  x: (x - view.offsetX) / view.zoom,
  y: (view.offsetY - y) / view.zoom
});
