"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';

interface Annotation {
    id: string;
    type: 'circle' | 'rectangle' | 'arrow' | 'label';
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    label?: string;
    note?: string;
    createdAt: string;
}

interface LensAnnotationCanvasProps {
    imageId: string;
    imageUrl: string;
    initialAnnotations?: Annotation[];
    readOnly?: boolean;
}

export default function LensAnnotationCanvas({ imageId, imageUrl, initialAnnotations = [], readOnly = false }: LensAnnotationCanvasProps) {
    const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
    const [selectedTool, setSelectedTool] = useState<'select' | 'circle' | 'rectangle' | 'arrow' | 'label'>('select');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentColor, setCurrentColor] = useState('#ef4444'); // Default red
    
    const containerRef = useRef<HTMLDivElement>(null);
    const currentDrawRef = useRef<{ startX: number; startY: number; id: string } | null>(null);

    // Save debounce timer
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

    const saveAnnotations = useCallback(async (newAnnotations: Annotation[]) => {
        try {
            await fetch(`/api/vero/lens/images/${imageId}/annotations`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ annotations: newAnnotations })
            });
        } catch (error) {
            console.error("Failed to save annotations", error);
        }
    }, [imageId]);

    const debouncedSave = useCallback((newAnnotations: Annotation[]) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            saveAnnotations(newAnnotations);
        }, 1000);
    }, [saveAnnotations]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (readOnly || selectedTool === 'select') return;
        
        // Prevent scrolling while drawing on mobile
        e.currentTarget.setPointerCapture(e.pointerId);
        
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        const newId = crypto.randomUUID();
        setIsDrawing(true);
        currentDrawRef.current = { startX: x, startY: y, id: newId };

        const newAnnotation: Annotation = {
            id: newId,
            type: selectedTool,
            x,
            y,
            width: 0,
            height: 0,
            color: currentColor,
            createdAt: new Date().toISOString()
        };

        setAnnotations(prev => [...prev, newAnnotation]);
        setSelectedId(newId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDrawing || !currentDrawRef.current || selectedTool === 'select') return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const currentX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const currentY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

        const { startX, startY, id } = currentDrawRef.current;

        setAnnotations(prev => prev.map(ann => {
            if (ann.id !== id) return ann;
            return {
                ...ann,
                x: Math.min(startX, currentX),
                y: Math.min(startY, currentY),
                width: Math.abs(currentX - startX),
                height: Math.abs(currentY - startY)
            };
        }));
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDrawing) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        setIsDrawing(false);
        currentDrawRef.current = null;
        debouncedSave(annotations);
    };

    const handleDelete = () => {
        if (!selectedId) return;
        const newAnnotations = annotations.filter(a => a.id !== selectedId);
        setAnnotations(newAnnotations);
        setSelectedId(null);
        debouncedSave(newAnnotations);
    };

    const handleLabelChange = (text: string) => {
        if (!selectedId) return;
        const newAnnotations = annotations.map(a => a.id === selectedId ? { ...a, label: text } : a);
        setAnnotations(newAnnotations);
        debouncedSave(newAnnotations);
    };

    const renderAnnotation = (ann: Annotation) => {
        const isSelected = ann.id === selectedId;
        const style: React.CSSProperties = {
            position: 'absolute',
            left: `${ann.x * 100}%`,
            top: `${ann.y * 100}%`,
            width: `${ann.width * 100}%`,
            height: `${ann.height * 100}%`,
            border: isSelected ? '2px dashed #fff' : `2px solid ${ann.color}`,
            boxShadow: isSelected ? '0 0 0 2px rgba(0,0,0,0.5)' : 'none',
            pointerEvents: readOnly || isDrawing ? 'none' : 'auto',
            cursor: selectedTool === 'select' ? 'pointer' : 'crosshair'
        };

        if (ann.type === 'circle') {
            style.borderRadius = '50%';
        } else if (ann.type === 'arrow') {
            // Simplified arrow rendering using SVG inside the div
            style.border = 'none';
        } else if (ann.type === 'label') {
            style.border = 'none';
            style.width = 'auto';
            style.height = 'auto';
            style.background = ann.color;
            style.color = '#fff';
            style.padding = '4px 8px';
            style.borderRadius = '4px';
            style.fontSize = '12px';
            style.fontWeight = 'bold';
        }

        return (
            <div 
                key={ann.id}
                style={style}
                onClick={(e) => {
                    if (selectedTool === 'select' && !readOnly) {
                        e.stopPropagation();
                        setSelectedId(ann.id);
                    }
                }}
            >
                {ann.type === 'arrow' && (
                    <svg width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                        <defs>
                            <marker id={`arrowhead-${ann.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill={ann.color} />
                            </marker>
                        </defs>
                        <line x1="0" y1="0" x2="100%" y2="100%" stroke={ann.color} strokeWidth="3" markerEnd={`url(#arrowhead-${ann.id})`} />
                    </svg>
                )}
                {ann.type === 'label' && (
                    <span>{ann.label || "Text Label"}</span>
                )}
                {isSelected && !readOnly && ann.type !== 'label' && ann.label && (
                    <div className="absolute top-full left-0 mt-1 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                        {ann.label}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            {!readOnly && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-2 shadow-sm">
                    <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedTool('select')} className={clsx("p-2 rounded-xl transition-colors", selectedTool === 'select' ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20" : "text-[var(--muted)] hover:bg-[var(--bg)]")}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                        </button>
                        <div className="w-px h-6 bg-[var(--border)] mx-1"></div>
                        <button onClick={() => setSelectedTool('rectangle')} className={clsx("p-2 rounded-xl transition-colors", selectedTool === 'rectangle' ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20" : "text-[var(--muted)] hover:bg-[var(--bg)]")}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={2} /></svg>
                        </button>
                        <button onClick={() => setSelectedTool('circle')} className={clsx("p-2 rounded-xl transition-colors", selectedTool === 'circle' ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20" : "text-[var(--muted)] hover:bg-[var(--bg)]")}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="8" strokeWidth={2} /></svg>
                        </button>
                        <button onClick={() => setSelectedTool('arrow')} className={clsx("p-2 rounded-xl transition-colors", selectedTool === 'arrow' ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20" : "text-[var(--muted)] hover:bg-[var(--bg)]")}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>
                        <button onClick={() => setSelectedTool('label')} className={clsx("p-2 rounded-xl transition-colors", selectedTool === 'label' ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20" : "text-[var(--muted)] hover:bg-[var(--bg)]")}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1 mr-2">
                            {['#ef4444', '#eab308', '#3b82f6', '#22c55e'].map(color => (
                                <button
                                    key={color}
                                    onClick={() => setCurrentColor(color)}
                                    className={clsx("w-6 h-6 rounded-full border-2 transition-transform", currentColor === color ? "border-white scale-110 shadow-md" : "border-transparent")}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                        {selectedId && (
                            <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Canvas Area */}
            <div 
                ref={containerRef}
                className="relative w-full overflow-hidden rounded-2xl bg-black select-none touch-none shadow-inner"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{ cursor: selectedTool === 'select' ? 'default' : 'crosshair', minHeight: '300px' }}
            >
                <img 
                    src={imageUrl} 
                    alt="Uploaded workspace" 
                    className="w-full h-auto block object-contain pointer-events-none"
                    draggable={false}
                />
                {annotations.map(renderAnnotation)}
            </div>

            {/* Selected Label Editor */}
            {!readOnly && selectedId && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 shadow-sm flex items-center gap-3">
                    <span className="text-sm font-medium text-[var(--muted)] whitespace-nowrap">Label:</span>
                    <input 
                        type="text" 
                        value={annotations.find(a => a.id === selectedId)?.label || ''}
                        onChange={(e) => handleLabelChange(e.target.value)}
                        placeholder="Add a note or context..."
                        className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-indigo-500"
                        maxLength={100}
                    />
                </div>
            )}
        </div>
    );
}
