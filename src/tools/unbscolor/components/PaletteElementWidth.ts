import { useEffect, useRef, useState } from 'react';

/** Width of an element, kept in step with resizes (rounded to 8px). */
export const useElementWidth = <T extends HTMLElement>(fallback: number) => {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(fallback);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const update = () => {
            const next = Math.floor(el.clientWidth / 8) * 8;
            if (next > 0) setWidth(next);
        };
        update();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return [ref, width] as const;
};
