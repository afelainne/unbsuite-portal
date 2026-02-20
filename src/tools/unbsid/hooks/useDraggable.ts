import { useRef, useCallback } from 'react';

export interface DragPos { x: number; y: number }

/**
 * Hook simples de drag-to-move com mouse.
 * Persiste posição via onSave chamado ao soltar.
 */
export function useDraggable(
  key: string,
  positions: Record<string, DragPos> | undefined,
  onSave: (k: string, p: DragPos) => void
) {
  const pos = positions?.[key] ?? { x: 0, y: 0 };
  const dragging = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef(pos);

  // Sync ref when data changes externally
  currentPos.current = pos;

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Prevent EditableText from triggering drag
      if ((e.target as HTMLElement).isContentEditable) return;
      e.preventDefault();
      dragging.current = true;
      startMouse.current = { x: e.clientX, y: e.clientY };
      startPos.current = { ...currentPos.current };

      const el = e.currentTarget as HTMLElement;

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const dx = ev.clientX - startMouse.current.x;
        const dy = ev.clientY - startMouse.current.y;
        el.style.transform = `translate(${startPos.current.x + dx}px, ${startPos.current.y + dy}px)`;
      };

      const onUp = (ev: MouseEvent) => {
        dragging.current = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        const dx = ev.clientX - startMouse.current.x;
        const dy = ev.clientY - startMouse.current.y;
        onSave(key, { x: startPos.current.x + dx, y: startPos.current.y + dy });
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [key, onSave]
  );

  return {
    style: {
      transform: `translate(${pos.x}px, ${pos.y}px)`,
      cursor: 'move',
      userSelect: 'none' as const,
    },
    onMouseDown,
  };
}
