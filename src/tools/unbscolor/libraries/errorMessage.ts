import type { Translations } from '../i18n';
import { LibraryImportError, type LibraryErrorCode } from './types';

const ERROR_KEYS: Record<LibraryErrorCode, keyof Translations> = {
  tooLarge: 'libErrTooLarge',
  unsupported: 'libErrUnsupported',
  badJson: 'libErrBadJson',
  badFormat: 'libErrBadFormat',
  badVersion: 'libErrBadVersion',
  noBooks: 'libErrNoBooks',
  badBook: 'libErrBadBook',
  badColor: 'libErrBadColor',
  noColors: 'libErrNoColors',
  tooManyColors: 'libErrTooManyColors',
  badAcb: 'libErrBadAcb',
  badAse: 'libErrBadAse'
};

/** Only these errors carry a detail worth showing (which book, which colour). */
const WITH_DETAIL = new Set<LibraryErrorCode>(['badBook', 'badColor']);

/** The sentence a person reads when an import fails, in their language. */
export const describeLibraryError = (t: Translations, err: unknown): string => {
  if (err instanceof LibraryImportError) {
    const message = t[ERROR_KEYS[err.code]];
    return WITH_DETAIL.has(err.code) && err.detail ? `${message}: ${err.detail}.` : message;
  }
  return t.libErrUnsupported;
};
