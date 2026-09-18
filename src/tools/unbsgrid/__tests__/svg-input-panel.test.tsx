import './paper-env';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SvgInputPanel from '../components/SvgInputPanel';
import { useUndoHistory } from '../hooks/use-undo-history';
import { renderHook, act } from '@testing-library/react';

describe('SvgInputPanel + useUndoHistory', () => {
  it('renders the panel, switches tabs, loads a sample and a pasted svg', async () => {
    localStorage.clear();
    const onLoad = vi.fn();
    render(<SvgInputPanel onLoad={onLoad} />);
    expect(screen.getByText('Enviar SVG')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Exemplos/ }));
    const sample = screen.getByTitle(/Chevron duplo/);
    expect(sample.querySelector('svg')).toBeTruthy();
    fireEvent.click(sample);
    await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(1));
    expect(onLoad.mock.calls[0][0].svg).toContain('<path');

    // recents appeared
    expect(screen.getByText('Recentes')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Colar/ }));
    const area = screen.getByLabelText(/Código SVG/);
    fireEvent.change(area, { target: { value: '<svg viewBox="0 0 10 10"><rect width="5" height="5"/></svg>' } });
    fireEvent.click(screen.getByText('Carregar'));
    await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(2));

    // page-level paste
    const evt = new Event('paste', { bubbles: true }) as Event & { clipboardData?: unknown };
    Object.defineProperty(evt, 'clipboardData', {
      value: { getData: (t: string) => (t === 'text/plain' ? '<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"/></svg>' : ''), files: [], items: [] },
    });
    document.dispatchEvent(evt);
    await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(3));
  });

  it('undo hook reacts to ctrl+z and ignores text fields', () => {
    const applied: string[] = [];
    const { result } = renderHook(() => useUndoHistory({ v: 0 }, { onApply: s => applied.push(`v${s.v}`) }));
    act(() => { result.current.record({ v: 1 }, { label: 'um', group: 'a' }); });
    act(() => { result.current.record({ v: 2 }, { label: 'dois', group: 'b', at: Date.now() + 10_000 }); });
    expect(result.current.canUndo).toBe(true);

    act(() => { fireEvent.keyDown(document, { key: 'z', ctrlKey: true }); });
    expect(applied).toEqual(['v1']);
    act(() => { fireEvent.keyDown(document, { key: 'z', ctrlKey: true, shiftKey: true }); });
    expect(applied).toEqual(['v1', 'v2']);

    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => { fireEvent.keyDown(input, { key: 'z', ctrlKey: true }); });
    expect(applied).toEqual(['v1', 'v2']);
    input.remove();
  });
});
