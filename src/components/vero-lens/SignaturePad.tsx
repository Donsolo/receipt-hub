"use client";

import React, { useRef, useState, useEffect } from 'react';

export default function SignaturePad({ onSave, onCancel }: { onSave: (dataUrl: string) => void, onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Setup High-DPI canvas
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000';
      }
    }
  }, []);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.PointerEvent | React.TouchEvent) => {
    // We do not prevent default here to allow pointer capture
    const coords = getCoordinates(e);
    if (!coords) return;
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
    (e.target as HTMLElement).setPointerCapture((e as any).pointerId);
  };

  const draw = (e: React.PointerEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    if (!coords) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e: React.PointerEvent | React.TouchEvent) => {
    setIsDrawing(false);
    if ((e.target as HTMLElement).hasPointerCapture((e as any).pointerId)) {
        (e.target as HTMLElement).releasePointerCapture((e as any).pointerId);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
      <div className="border-2 border-dashed border-[var(--border)] rounded-xl bg-white overflow-hidden touch-none" style={{ height: '200px' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex justify-between items-center">
        <button onClick={clear} className="text-sm text-[var(--muted)] font-medium hover:text-[var(--text)]">Clear</button>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)]">Cancel</button>
          <button onClick={save} className="px-4 py-2 bg-indigo-600 rounded-xl text-sm font-medium text-white hover:bg-indigo-500">Confirm Signature</button>
        </div>
      </div>
    </div>
  );
}
