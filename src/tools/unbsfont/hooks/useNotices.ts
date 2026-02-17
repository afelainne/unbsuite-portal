import { useState, useCallback, useRef, useMemo } from 'react';
import { NoticeVariant } from '../contexts/NoticeContext';

export interface Notice {
    id: number;
    message: string;
    variant: NoticeVariant;
}

export interface NoticeStyles {
    label: string;
    container: string;
    dot: string;
}

export function useNotices(isDarkMode: boolean) {
    const [notices, setNotices] = useState<Notice[]>([]);
    const noticeTimersRef = useRef<number[]>([]);

    const pushNotice = useCallback((message: string, variant: NoticeVariant = 'info') => {
        const id = Date.now() + Math.random();
        setNotices(prev => [...prev, { id, message, variant }]);
        const timeoutId = window.setTimeout(() => {
            setNotices(prev => prev.filter(n => n.id !== id));
            noticeTimersRef.current = noticeTimersRef.current.filter(t => t !== timeoutId);
        }, 4200);
        noticeTimersRef.current.push(timeoutId);
    }, []);

    const clearAllNotices = useCallback(() => {
        noticeTimersRef.current.forEach(clearTimeout);
        noticeTimersRef.current = [];
        setNotices([]);
    }, []);

    const noticeStyles = useMemo<Record<NoticeVariant, NoticeStyles>>(() => ({
        success: {
            label: 'Sucesso',
            container: isDarkMode ? 'bg-emerald-500/10 border-emerald-300 text-emerald-50' : 'bg-emerald-50 border-emerald-500 text-emerald-900',
            dot: 'bg-emerald-400'
        },
        warning: {
            label: 'Aviso',
            container: isDarkMode ? 'bg-amber-500/10 border-amber-300 text-amber-50' : 'bg-amber-50 border-amber-500 text-amber-900',
            dot: 'bg-amber-400'
        },
        error: {
            label: 'Erro',
            container: isDarkMode ? 'bg-rose-500/10 border-rose-300 text-rose-50' : 'bg-rose-50 border-rose-500 text-rose-900',
            dot: 'bg-rose-400'
        },
        info: {
            label: 'Info',
            container: isDarkMode ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-white border-black text-black',
            dot: isDarkMode ? 'bg-slate-200' : 'bg-slate-500'
        }
    }), [isDarkMode]);

    return {
        notices,
        pushNotice,
        clearAllNotices,
        noticeStyles,
        noticeTimersRef
    };
}
