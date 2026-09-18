import './paper-env';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ComparePanel, { type ComparePanelProps } from '../components/ComparePanel';
import { TooltipProvider } from '../components/ui/tooltip';
import CompareView from '../components/CompareView';
import { parseSVG } from '../lib/svg-engine';
import { clearCompareCache } from '../lib/compare';
import { clearMetricsCache } from '../lib/metrics';

const svg = (body: string, vb = '0 0 100 100') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;
const rect = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000"/>`;

const A = svg(rect(0, 0, 10, 100) + rect(90, 0, 10, 100) + rect(20, 0, 10, 100));
const B = svg(rect(0, 0, 10, 100) + rect(90, 0, 10, 100) + rect(50, 0, 10, 100));

/** ComparePanel uses InfoTooltip, so it needs a TooltipProvider above it (as Index does). */
const renderPanel = (props: ComparePanelProps) =>
  render(<TooltipProvider><ComparePanel {...props} /></TooltipProvider>);

const paste = (value: string) => {
  fireEvent.click(screen.getByText('Colar código SVG'));
  fireEvent.change(screen.getByLabelText('Código SVG'), { target: { value } });
  fireEvent.click(screen.getByText('Usar este SVG'));
};

beforeEach(() => {
  clearCompareCache();
  clearMetricsCache();
});

describe('ComparePanel', () => {
  it('asks for a logo before comparing', () => {
    renderPanel({ parsedSVG: null, defaultOpen: true });
    expect(screen.getByText(/Envie um logo primeiro/)).toBeTruthy();
  });

  it('loads a second version, keeps the first one and shows the differences', async () => {
    const onChange = vi.fn();
    const { container } = renderPanel({ parsedSVG: parseSVG(A), nameA: 'logo-a.svg', onVersionBChange: onChange, defaultOpen: true });
    expect(screen.getByText('Enviar SVG')).toBeTruthy();

    paste(B);

    await waitFor(() => expect(screen.getByText('Área coincidente')).toBeTruthy());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].source).toBe(B);
    // Version A is untouched: still named and shown as A.
    expect(screen.getByTitle('logo-a.svg')).toBeTruthy();

    // Metric table.
    for (const label of ['Proporção', 'Cobertura de tinta', 'Simetria vertical', 'Nós', 'Espessura mínima']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    // ~50% of the ink coincides (two of three bars).
    expect(screen.getByText(/^5\d\.\d%$|^4\d\.\d%$/)).toBeTruthy();
    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  it('switches view mode and keeps both versions rendered while toggling', async () => {
    const { container } = renderPanel({ parsedSVG: parseSVG(A), defaultOpen: true });
    paste(B);
    await waitFor(() => expect(screen.getByText('Área coincidente')).toBeTruthy());

    fireEvent.click(screen.getByRole('tab', { name: 'Alternar' }));
    const toggle = screen.getByRole('button', { name: /Alternar entre/ });
    expect(container.querySelectorAll('img')).toHaveLength(2);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    // Both images are still in the DOM: only the opacity changed.
    expect(container.querySelectorAll('img')).toHaveLength(2);

    fireEvent.click(screen.getByRole('tab', { name: 'Cortina' }));
    expect(screen.getByRole('separator', { name: /cortina/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Lado a lado' }));
    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  it('swaps A and B without touching the app version', async () => {
    renderPanel({ parsedSVG: parseSVG(A), nameA: 'logo-a.svg', defaultOpen: true });
    paste(B);
    await waitFor(() => expect(screen.getByText('Área coincidente')).toBeTruthy());

    const before = screen.getByTitle('logo-a.svg');
    expect(before.previousElementSibling?.textContent).toBe('A');

    fireEvent.click(screen.getByRole('button', { name: 'Trocar A e B de lugar' }));
    await waitFor(() => {
      expect(screen.getByTitle('logo-a.svg').nextElementSibling?.textContent).toBe('B');
    });
  });

  it('shows a clear error for an invalid second version', async () => {
    renderPanel({ parsedSVG: parseSVG(A), defaultOpen: true });
    paste('isto não é um svg');
    await waitFor(() => expect(screen.getByText(/Versão B/)).toBeTruthy());
    expect(screen.queryByText('Área coincidente')).toBeNull();
  });

  it('removes the second version', async () => {
    const onChange = vi.fn();
    renderPanel({ parsedSVG: parseSVG(A), onVersionBChange: onChange, defaultOpen: true });
    paste(B);
    await waitFor(() => expect(screen.getByText('Área coincidente')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Remover a segunda versão' }));
    await waitFor(() => expect(screen.queryByText('Área coincidente')).toBeNull());
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText('Enviar SVG')).toBeTruthy();
  });
});

describe('CompareView', () => {
  const props = { srcA: 'data:image/svg+xml,a', srcB: 'data:image/svg+xml,b', frameAspect: 2 };

  it('never unmounts a version when the mode changes', () => {
    const { container, rerender } = render(<CompareView {...props} mode="overlay" />);
    const first = container.querySelectorAll('img');
    expect(first).toHaveLength(2);

    rerender(<CompareView {...props} mode="toggle" />);
    const after = container.querySelectorAll('img');
    expect(after).toHaveLength(2);
    // Same DOM nodes: the toggle cannot flash.
    expect(after[0]).toBe(first[0]);
    expect(after[1]).toBe(first[1]);
  });

  it('applies the overlay opacity to B only', () => {
    const { container } = render(<CompareView {...props} mode="overlay" overlayOpacity={0.25} />);
    const layers = container.querySelectorAll<HTMLElement>('.absolute.inset-0.flex');
    expect(layers[0].style.opacity).toBe('1');
    expect(layers[1].style.opacity).toBe('0.25');
  });

  it('clips both sides in curtain mode and moves with the keyboard', () => {
    const { container } = render(<CompareView {...props} mode="curtain" />);
    const separator = screen.getByRole('separator');
    expect(separator.getAttribute('aria-valuenow')).toBe('50');
    const layers = container.querySelectorAll<HTMLElement>('.absolute.inset-0.flex');
    expect(layers[0].style.clipPath).toContain('inset(0 50%');
    expect(layers[1].style.clipPath).toContain('0 0 50%)');

    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(separator.getAttribute('aria-valuenow')).toBe('52');
    fireEvent.keyDown(separator, { key: 'Home' });
    expect(separator.getAttribute('aria-valuenow')).toBe('0');
  });

  it('flips with the space bar while the pointer is over the view', () => {
    const onActive = vi.fn();
    render(<CompareView {...props} mode="toggle" onActiveChange={onActive} />);
    const toggle = screen.getByRole('button', { name: /Alternar entre/ });

    // Not hovered: the shortcut stays out of the way of the rest of the app.
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    fireEvent.pointerEnter(toggle.parentElement as HTMLElement);
    fireEvent.keyDown(document.body, { key: ' ', code: 'Space' });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(onActive).toHaveBeenLastCalledWith('b');
  });
});
