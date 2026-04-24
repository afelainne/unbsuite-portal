import React, { useState, useCallback, useRef } from 'react';
import { GlyphData } from '../types';

interface SelectionBox {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

export function useGlyphSelection() {
    const [selectedChars, setSelectedChars] = useState<Set<string>>(new Set());
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleGridMouseDown = useCallback((e: React.MouseEvent) => {
        const targetElement = e.target as HTMLElement;
        if (targetElement.closest('button') || targetElement.closest('input') || e.button !== 0) return;
        if (targetElement.closest('[data-glyph-char]')) return;
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + containerRef.current.scrollLeft;
        const y = e.clientY - rect.top + containerRef.current.scrollTop;
        setIsSelecting(true);
        setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });
        if (!e.ctrlKey && !e.shiftKey) setSelectedChars(new Set());
    }, []);

    const handleGridMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isSelecting || !selectionBox || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + containerRef.current.scrollLeft;
        const y = e.clientY - rect.top + containerRef.current.scrollTop;
        setSelectionBox(prev => prev ? ({ ...prev, currentX: x, currentY: y }) : null);
    }, [isSelecting, selectionBox]);

    const handleGridMouseUp = useCallback(() => {
        if (!isSelecting || !selectionBox) return;
        
        const boxLeft = Math.min(selectionBox.startX, selectionBox.currentX);
        const boxTop = Math.min(selectionBox.startY, selectionBox.currentY);
        const boxRight = Math.max(selectionBox.startX, selectionBox.currentX);
        const boxBottom = Math.max(selectionBox.startY, selectionBox.currentY);

        if (Math.abs(boxRight - boxLeft) > 5 || Math.abs(boxBottom - boxTop) > 5) {
            const newSelection = new Set(selectedChars);
            const cards = document.querySelectorAll('[data-glyph-char]');
            const containerRect = containerRef.current?.getBoundingClientRect();
            
            if (containerRef.current && containerRect) {
                cards.forEach(card => {
                    const cardRect = card.getBoundingClientRect();
                    const cardLeft = cardRect.left - containerRect.left + containerRef.current!.scrollLeft;
                    const cardTop = cardRect.top - containerRect.top + containerRef.current!.scrollTop;
                    const cardRight = cardLeft + cardRect.width;
                    const cardBottom = cardTop + cardRect.height;
                    
                    if (!(cardLeft > boxRight || cardRight < boxLeft || cardTop > boxBottom || cardBottom < boxTop)) {
                        const char = card.getAttribute('data-glyph-char');
                        if (char) newSelection.add(char);
                    }
                });
                setSelectedChars(newSelection);
            }
        }
        setIsSelecting(false);
        setSelectionBox(null);
    }, [isSelecting, selectionBox, selectedChars]);

    const handleCardClick = useCallback((char: string, e: React.MouseEvent) => {
        if (e.ctrlKey || e.shiftKey) {
            e.stopPropagation();
            const newSet = new Set(selectedChars);
            if (newSet.has(char)) newSet.delete(char); 
            else newSet.add(char);
            setSelectedChars(newSet);
        } else { 
            if (selectedChars.size > 0 && !selectedChars.has(char)) setSelectedChars(new Set()); 
        }
    }, [selectedChars]);

    const clearSelection = useCallback(() => {
        setSelectedChars(new Set());
    }, []);

    const handleBulkClear = useCallback((glyphs: GlyphData[], setGlyphs: React.Dispatch<React.SetStateAction<GlyphData[]>>) => {
        if (window.confirm(`Clear ${selectedChars.size} slots?`)) {
            setGlyphs(prev => prev.map(g => {
                if (selectedChars.has(g.char)) {
                    return {
                        ...g, 
                        pathData: "", 
                        components: [], 
                        anchors: [], 
                        anchorOverrides: {},
                        advanceWidth: g.char === ' ' ? 250 : 600, 
                        leftSideBearing: 50, 
                        baselineOffset: 0, 
                        scale: 1, 
                        groups: { left: '', right: '' }, 
                        inheritsFrom: null,
                        kerningBias: 0
                    };
                }
                return g;
            }));
            setSelectedChars(new Set());
        }
    }, [selectedChars]);

    return {
        selectedChars,
        setSelectedChars,
        isSelecting,
        selectionBox,
        containerRef,
        handleGridMouseDown,
        handleGridMouseMove,
        handleGridMouseUp,
        handleCardClick,
        clearSelection,
        handleBulkClear
    };
}
