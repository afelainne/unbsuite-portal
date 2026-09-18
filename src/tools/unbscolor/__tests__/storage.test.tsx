import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { getStoredLibraries, saveLibraryToStorage, removeLibraryFromStorage } from '../utils/storage';
import { getProjects, saveProject, deleteProject } from '../utils/projectStorage';
import { readJson, safeGetItem, safeSetItem } from '../utils/safeStorage';
import { LanguageProvider, useLanguage } from '../i18n/LanguageContext';
import type { ReferenceColor } from '../types';

const color: ReferenceColor = { code: 'X 1', name: 'X 1', hex: '#FF0000', rgb: { r: 255, g: 0, b: 0 } };

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('safeStorage', () => {
  it('returns fallback for corrupt JSON and wrong shape', () => {
    localStorage.setItem('k', '{not json');
    expect(readJson('k', ['fallback'])).toEqual(['fallback']);
    localStorage.setItem('k', '{"a":1}');
    expect(readJson('k', [], (v): v is unknown[] => Array.isArray(v))).toEqual([]);
  });

  it('never throws when storage throws (private mode / quota)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(safeGetItem('a')).toBeNull();
    expect(safeSetItem('a', 'b')).toBe(false);
  });
});

describe('custom libraries storage (bug: setItem/JSON without guards)', () => {
  it('saves, replaces by name and removes', () => {
    saveLibraryToStorage('Lib', [color]);
    const updated = saveLibraryToStorage('Lib', [color, color]);
    expect(updated.persisted).toBe(true);
    expect(getStoredLibraries()).toHaveLength(1);
    expect(getStoredLibraries()[0].colors).toHaveLength(2);
    expect(removeLibraryFromStorage('Lib')).toHaveLength(0);
  });

  it('ignores non-array / malformed stored data', () => {
    localStorage.setItem('chromamatch_custom_libraries', '{"name":"x"}');
    expect(getStoredLibraries()).toEqual([]);
    localStorage.setItem('chromamatch_custom_libraries', '[null, 5, {"name":"ok","colors":[]}]');
    expect(getStoredLibraries()).toEqual([{ name: 'ok', colors: [] }]);
  });

  it('does not throw on QuotaExceededError and reports persisted=false', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    let result: ReturnType<typeof saveLibraryToStorage> | undefined;
    expect(() => {
      result = saveLibraryToStorage('Big', [color]);
    }).not.toThrow();
    expect(result!.persisted).toBe(false);
    expect(result!).toHaveLength(1);
    expect(() => removeLibraryFromStorage('Big')).not.toThrow();
  });
});

describe('project storage', () => {
  it('upserts and deletes', () => {
    saveProject({ id: 'p1', name: 'A', updatedAt: 0, items: [] });
    saveProject({ id: 'p1', name: 'B', updatedAt: 0, items: [] });
    expect(getProjects()).toHaveLength(1);
    expect(getProjects()[0].name).toBe('B');
    expect(getProjects()[0].updatedAt).toBeGreaterThan(0);
    expect(deleteProject('p1')).toHaveLength(0);
  });

  it('survives corrupt data and quota errors', () => {
    localStorage.setItem('chromamatch_projects', '"a string"');
    expect(getProjects()).toEqual([]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveProject({ id: 'x', name: 'x', updatedAt: 0, items: [] })).not.toThrow();
  });
});

describe('LanguageProvider (bug: localStorage access could crash the whole tool)', () => {
  const Probe = () => {
    const { language, setLanguage, t } = useLanguage();
    return (
      <div>
        <span data-testid="lang">{language}</span>
        <span data-testid="has-t">{t ? 'yes' : 'no'}</span>
        <button onClick={() => setLanguage('pt')}>pt</button>
        <button onClick={() => setLanguage('xx' as never)}>bad</button>
      </div>
    );
  };

  it('renders with default language when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    expect(screen.getByTestId('lang').textContent).toBe('en');
    act(() => screen.getByText('pt').click());
    expect(screen.getByTestId('lang').textContent).toBe('pt');
  });

  it('restores a stored language, ignores invalid values', () => {
    localStorage.setItem('unbscolor-language', 'es');
    const { unmount } = render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    expect(screen.getByTestId('lang').textContent).toBe('es');
    act(() => screen.getByText('bad').click());
    expect(screen.getByTestId('lang').textContent).toBe('es');
    act(() => screen.getByText('pt').click());
    expect(localStorage.getItem('unbscolor-language')).toBe('pt');
    unmount();

    localStorage.setItem('unbscolor-language', 'de');
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    expect(screen.getByTestId('lang').textContent).toBe('en');
    expect(screen.getByTestId('has-t').textContent).toBe('yes');
  });
});
