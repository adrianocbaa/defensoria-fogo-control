import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { ChecklistAmbiente } from '@/hooks/useChecklistDinamico';

// Use CDN worker to avoid Vite configuration complexity
const PDFJS_VERSION = '3.11.174';

interface PdfCanvasProps {
  pdfUrl: string;
  currentPage: number;
  ambientes: ChecklistAmbiente[];
  isDrawingMode: boolean;
  selectedAmbienteId: string | null;
  onPageCount: (count: number) => void;
  onDrawComplete: (rect: { x: number; y: number; w: number; h: number }) => void;
  onAmbienteClick: (id: string) => void;
}

export function PdfCanvas({
  pdfUrl,
  currentPage,
  ambientes,
  isDrawingMode,
  selectedAmbienteId,
  onPageCount,
  onDrawComplete,
  onAmbienteClick,
}: PdfCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const [renderKey, setRenderKey] = useState(0);
  const [drawState, setDrawState] = useState<{
    isDrawing: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Dynamically load pdfjs
  useEffect(() => {
    const loadPdfJs = async () => {
      if ((window as any).pdfjsLib) return;
      const script = document.createElement('script');
      script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
      script.onload = () => {
        const lib = (window as any).pdfjsLib;
        lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
      };
      document.head.appendChild(script);
    };
    loadPdfJs();
  }, []);

  // Load PDF
  useEffect(() => {
    if (!pdfUrl) return;

    const tryLoad = async () => {
      const lib = (window as any).pdfjsLib;
      if (!lib) { setTimeout(tryLoad, 300); return; }

      try {
        const task = lib.getDocument({ url: pdfUrl, withCredentials: false });
        const doc = await task.promise;
        pdfDocRef.current = doc;
        onPageCount(doc.numPages);
        setRenderKey(k => k + 1);
      } catch (err) {
        console.error('PDF load error:', err);
      }
    };

    // Wait a bit for pdfjsLib to be available
    setTimeout(tryLoad, 500);
  }, [pdfUrl, onPageCount]);

  // Render page
  useEffect(() => {
    const renderPage = async () => {
      const doc = pdfDocRef.current;
      if (!doc || !canvasRef.current || !containerRef.current) return;

      try {
        const page = await doc.getPage(currentPage);
        const containerWidth = containerRef.current.clientWidth || 600;
        const viewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      } catch (err) {
        console.error('Page render error:', err);
      }
    };

    renderPage();
  }, [renderKey, currentPage]);

  const getRelativePos = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    const pos = getRelativePos(e);
    setDrawState({ isDrawing: true, startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawState?.isDrawing) return;
    e.preventDefault();
    const pos = getRelativePos(e);
    setDrawState(prev => prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawState?.isDrawing) return;
    e.preventDefault();
    const pos = getRelativePos(e);
    const x = Math.min(drawState.startX, pos.x);
    const y = Math.min(drawState.startY, pos.y);
    const w = Math.abs(pos.x - drawState.startX);
    const h = Math.abs(pos.y - drawState.startY);

    if (w > 2 && h > 2) {
      onDrawComplete({ x, y, w, h });
    }
    setDrawState(null);
  };

  const drawingRect = drawState?.isDrawing ? {
    x: Math.min(drawState.startX, drawState.currentX),
    y: Math.min(drawState.startY, drawState.currentY),
    w: Math.abs(drawState.currentX - drawState.startX),
    h: Math.abs(drawState.currentY - drawState.startY),
  } : null;

  const pageAmbientes = ambientes.filter(a => a.pagina === currentPage);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none bg-muted/30 rounded-lg overflow-hidden"
      style={{ cursor: isDrawingMode ? 'crosshair' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => drawState?.isDrawing && setDrawState(null)}
    >
      <canvas ref={canvasRef} className="w-full block shadow-sm" />

      {/* Overlay de anotações */}
      <div className="absolute inset-0 pointer-events-none">
        {pageAmbientes.map(amb => {
          const isSelected = selectedAmbienteId === amb.id;
          const totalServicos = amb.servicos.length;
          const aprovados = amb.servicos.filter(s => s.status === 'aprovado').length;
          const reprovados = amb.servicos.filter(s => s.status === 'reprovado').length;

          let borderColor = 'border-blue-500';
          let bgColor = 'bg-blue-500/10';
          let labelBg = 'bg-blue-500';

          if (reprovados > 0) { borderColor = 'border-red-500'; bgColor = 'bg-red-500/10'; labelBg = 'bg-red-500'; }
          else if (aprovados === totalServicos && totalServicos > 0) { borderColor = 'border-green-500'; bgColor = 'bg-green-500/10'; labelBg = 'bg-green-500'; }

          if (isSelected) { borderColor = 'border-primary'; bgColor = 'bg-primary/20'; labelBg = 'bg-primary'; }

          return (
            <div
              key={amb.id}
              className={`absolute border-2 rounded transition-all pointer-events-auto ${borderColor} ${bgColor} ${!isDrawingMode ? 'cursor-pointer hover:opacity-80' : ''} ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
              style={{
                left: `${amb.pos_x}%`,
                top: `${amb.pos_y}%`,
                width: `${amb.pos_w}%`,
                height: `${amb.pos_h}%`,
              }}
              onClick={() => !isDrawingMode && onAmbienteClick(amb.id)}
            >
              <div className={`absolute -top-1 left-1 ${labelBg} text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 max-w-[95%]`}>
                <span className="truncate">{amb.nome}</span>
                {totalServicos > 0 && (
                  <span className="shrink-0 opacity-90">
                    {aprovados}/{totalServicos}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Retângulo sendo desenhado */}
        {drawingRect && (
          <div
            className="absolute border-2 border-dashed border-primary bg-primary/15 rounded pointer-events-none"
            style={{
              left: `${drawingRect.x}%`,
              top: `${drawingRect.y}%`,
              width: `${drawingRect.w}%`,
              height: `${drawingRect.h}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}
