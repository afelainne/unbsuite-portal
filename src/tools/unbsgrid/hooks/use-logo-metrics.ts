import { useEffect, useState } from 'react';
import { computeLogoMetrics, type LogoMetrics, type MetricsOptions } from '../lib/metrics';

export interface UseLogoMetricsResult {
  metrics: LogoMetrics | null;
  error: string | null;
  loading: boolean;
}

/**
 * Logo metrics for the UI (proportion, ink coverage, visual vs geometric
 * center, balance, symmetry). Computed after paint so a heavy logo does not
 * block the upload interaction; results are memoized by SVG content.
 */
export function useLogoMetrics(
  svg: string | null | undefined,
  options: MetricsOptions = {},
): UseLogoMetricsResult {
  const [state, setState] = useState<UseLogoMetricsResult>({ metrics: null, error: null, loading: false });
  const { resolution, centeredThresholdPercent } = options;

  useEffect(() => {
    if (!svg) {
      setState({ metrics: null, error: null, loading: false });
      return;
    }
    let cancelled = false;
    setState(prev => ({ ...prev, loading: true, error: null }));
    const handle = setTimeout(() => {
      try {
        const metrics = computeLogoMetrics({ originalSVG: svg }, { resolution, centeredThresholdPercent });
        if (!cancelled) setState({ metrics, error: null, loading: false });
      } catch (err) {
        if (!cancelled) setState({ metrics: null, error: err instanceof Error ? err.message : String(err), loading: false });
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [svg, resolution, centeredThresholdPercent]);

  return state;
}
