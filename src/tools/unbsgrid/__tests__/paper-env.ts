/**
 * jsdom does not implement HTMLCanvasElement.getContext, and paper-full calls
 * it at import time. This installs a permissive no-op 2D context so paper's
 * geometry / import / export APIs can run under Vitest. Import this module
 * BEFORE importing `paper` in any test.
 */
function makeCtx(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const store: Record<string | symbol, unknown> = { canvas };
  return new Proxy(store, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'getImageData' || prop === 'createImageData') {
        return (_x: number, _y: number, w = 1, h = 1) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      }
      if (prop === 'getLineDash') return () => [];
      if (prop === 'isPointInPath' || prop === 'isPointInStroke') return () => false;
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') {
        return () => ({ addColorStop: () => {} });
      }
      return () => {};
    },
    set(target, prop, value) { target[prop] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
}

const proto = HTMLCanvasElement.prototype as unknown as { getContext: unknown; toDataURL: unknown };
proto.getContext = function (this: HTMLCanvasElement) {
  const self = this as unknown as { __ctx?: CanvasRenderingContext2D };
  if (!self.__ctx) self.__ctx = makeCtx(this);
  return self.__ctx;
};
proto.toDataURL = () => 'data:image/png;base64,';

export {};
