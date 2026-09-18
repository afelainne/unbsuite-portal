/** Junta classes, ignorando as vazias. Fica fora de `ui.tsx` para o fast refresh. */
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');
