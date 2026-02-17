import { Dispatch, SetStateAction, useCallback } from 'react';
import { FontMetadata } from '../types';

const normalizePairKey = (pair: string) => (pair || '').trim();

export const useKerningManager = (
    onUpdateMetadata: Dispatch<SetStateAction<FontMetadata>>
) => {
    const updateKerning = useCallback((updater: (prev: Record<string, number>) => Record<string, number>) => {
        onUpdateMetadata(prev => ({
            ...prev,
            kerning: updater(prev.kerning),
        }));
    }, [onUpdateMetadata]);

    const applyKerningMap = useCallback((nextKerning: Record<string, number>) => {
        updateKerning(() => nextKerning);
    }, [updateKerning]);

    const updatePair = useCallback((pair: string, value: number) => {
        const key = normalizePairKey(pair);
        if (key.length < 2 || Number.isNaN(value)) return;
        updateKerning(prev => ({
            ...prev,
            [key]: value,
        }));
    }, [updateKerning]);

    const removePair = useCallback((pair: string) => {
        const key = normalizePairKey(pair);
        if (key.length < 2) return;
        updateKerning(prev => {
            if (!(key in prev)) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, [updateKerning]);

    const mergePairs = useCallback((pairs: Record<string, number>) => {
        updateKerning(prev => ({
            ...prev,
            ...pairs,
        }));
    }, [updateKerning]);

    const clearAllPairs = useCallback(() => {
        updateKerning(() => ({}));
    }, [updateKerning]);

    return {
        applyKerningMap,
        updatePair,
        removePair,
        mergePairs,
        clearAllPairs,
    };
};
