// Small browser helpers shared by the UI: clipboard, downloads and timers
// that are cleared when the component unmounts.

import { useCallback, useEffect, useRef, useState } from 'react';

/** Writes text to the clipboard. Resolves to false instead of throwing. */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (!navigator?.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/** Delay before revoking object URLs, so the browser can start the download. */
export const REVOKE_DELAY_MS = 1000;

export const revokeObjectUrlLater = (url: string) => {
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
};

/** Triggers a download for a URL (object URL or data URL). */
export const downloadUrl = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/** Downloads a Blob and revokes its object URL after a short delay. */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  revokeObjectUrlLater(url);
};

/**
 * setTimeout that is automatically cleared on unmount.
 * Returns a stable `schedule(fn, ms)` function.
 */
export const useSafeTimeout = () => {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const set = timers.current;
    return () => {
      set.forEach((id) => clearTimeout(id));
      set.clear();
    };
  }, []);

  return useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);
};

/**
 * Transient value (toast / "copied" feedback). `show(value)` replaces the
 * current value and restarts a single timer that resets it to null.
 * The timer is cleared on unmount.
 */
export const useTransientState = <T,>(duration: number): [T | null, (value: T) => void] => {
  const [value, setValue] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const show = useCallback(
    (next: T) => {
      setValue(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        setValue(null);
      }, duration);
    },
    [duration]
  );

  return [value, show];
};
