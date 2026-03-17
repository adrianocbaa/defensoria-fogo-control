import React, { useEffect, useRef, useState } from 'react';
import type { ChecklistAmbiente, ChecklistServico } from '@/hooks/useChecklistDinamico';

const PDFJS_VERSION = '3.11.174';

export type DrawMode = 'rect' | 'circle' | 'polyline';

export interface ShapeData {
  points?: { x: number; y: number }[]; // polyline
  cx?: number; cy?: number; r?: number; // circle
}

interface LocationPin {
  x: number;
  y: number;
  servicoId: string;
  label: string;
}

interface PdfCanvasProps {
  pdfUrl: string;
  currentPage: number;
  ambientes: ChecklistAmbiente[];
  isDrawingMode: boolean;
  drawMode: DrawMode;
  selectedAmbienteId: string | null;
  isPinMode: boolean;
  pendingPinServico: { id: string; descricao: string } | null;
  onPageCount: (count: number) => void;
  onDrawComplete: (shape: { type: DrawMode; rect?: { x: number; y: number; w: number; h: number }; shapeData?: ShapeData }) => void;
  onAmbienteClick: (id: string) => void;
  onPinPlaced: (servicoId: string, pin: { x: number; y: number }) => void;
}

export function PdfCanvas({
  pdfUrl,
  currentPage,
  ambientes,
  isDrawingMode,
  drawMode,
  selectedAmbienteId,
  isPinMode,
  pendingPinServico,
  onPageCount,
  onDrawComplete,
  onAmbienteClick,
  onPinPlaced,
}: PdfCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const [renderKey, setRenderKey] = useState(0);

  // Rect drawing
  const [rectState, setRectState] = useState<{ isDrawing: boolean; startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  // Circle drawing
  const [circleState, setCircleState] = useState<{ isDrawing: boolean; startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  // Polyline drawing
  const [polyPoints, setPolyPoints] = useState<{ x: number; y: number }[]>([]);
  const [polyMousePos, setPolyMousePos] = useState<{ x: number; y: number } | null>(null);

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
      } catch (err) { console.error('PDF load error:', err); }
    };
    setTimeout(tryLoad, 500);
  }, [pdfUrl, onPageCount]);

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
      } catch (err) { console.error('Page render error:', err); }
    };
    renderPage();
  }, [renderKey, currentPage]);

  const getPos = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  };

  // --- Mouse handlers ---
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    const pos = getPos(e);

    if (drawMode === 'rect') {
      setRectState({ isDrawing: true, startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
    } else if (drawMode === 'circle') {
      setCircleState({ isDrawing: true, startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pos = getPos(e);
    if (drawMode === 'rect' && rectState?.isDrawing) {
      setRectState(prev => prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null);
    } else if (drawMode === 'circle' && circleState?.isDrawing) {
      setCircleState(prev => prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null);
    } else if (drawMode === 'polyline' && isDrawingMode && polyPoints.length > 0) {
      setPolyMousePos(pos);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pos = getPos(e);

    if (drawMode === 'rect' && rectState?.isDrawing) {
      const x = Math.min(rectState.startX, pos.x);
      const y = Math.min(rectState.startY, pos.y);
      const w = Math.abs(pos.x - rectState.startX);
      const h = Math.abs(pos.y - rectState.startY);
      setRectState(null);
      if (w > 1.5 && h > 1.5) {
        onDrawComplete({ type: 'rect', rect: { x, y, w, h } });
      }
    } else if (drawMode === 'circle' && circleState?.isDrawing) {
      const dx = pos.x - circleState.startX;
      const dy = pos.y - circleState.startY;
      const r = Math.sqrt(dx * dx + dy * dy);
      setCircleState(null);
      if (r > 1.5) {
        onDrawComplete({ type: 'circle', shapeData: { cx: circleState.startX, cy: circleState.startY, r } });
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const pos = getPos(e);

    // Pin mode
    if (isPinMode && pendingPinServico) {
      onPinPlaced(pendingPinServico.id, pos);
      return;
    }

    // Polyline: add point on click
    if (isDrawingMode && drawMode === 'polyline') {
      setPolyPoints(prev => [...prev, pos]);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode || drawMode !== 'polyline') return;
    e.preventDefault();
    if (polyPoints.length >= 2) {
      onDrawComplete({ type: 'polyline', shapeData: { points: polyPoints } });
    }
    setPolyPoints([]);
    setPolyMousePos(null);
  };

  // --- Derived overlay shapes ---
  const rectPreview = rectState?.isDrawing ? {
    x: Math.min(rectState.startX, rectState.currentX),
    y: Math.min(rectState.startY, rectState.currentY),
    w: Math.abs(rectState.currentX - rectState.startX),
    h: Math.abs(rectState.currentY - rectState.startY),
  } : null;

  const circlePreview = circleState?.isDrawing ? {
    cx: circleState.startX,
    cy: circleState.startY,
    r: Math.sqrt(
      (circleState.currentX - circleState.startX) ** 2 +
      (circleState.currentY - circleState.startY) ** 2
    ),
  } : null;

  const pageAmbientes = ambientes.filter(a => a.pagina === currentPage);

  // Collect all location pins for rejected services on this page
  const locationPins: LocationPin[] = [];
  pageAmbientes.forEach(amb => {
    amb.servicos.forEach(s => {
      const pin = s.location_pin as { x: number; y: number } | null;
      if (pin) {
        locationPins.push({ x: pin.x, y: pin.y, servicoId: s.id, label: s.descricao });
      }
    });
  });

  const cursor = isPinMode ? 'crosshair' :
    isDrawingMode ? (drawMode === 'polyline' ? 'cell' : 'crosshair') : 'default';

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none bg-muted/30 rounded-lg overflow-hidden"
      style={{ cursor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseLeave={() => {
        if (rectState?.isDrawing) setRectState(null);
        if (circleState?.isDrawing) setCircleState(null);
        setPolyMousePos(null);
      }}
    >
      <canvas ref={canvasRef} className="w-full block shadow-sm" />

      {/* SVG overlay for circles, polylines and previews */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Existing ambiente shapes */}
        {pageAmbientes.map(amb => {
          const isSelected = selectedAmbienteId === amb.id;
          const reprovados = amb.servicos.filter(s => s.status === 'reprovado').length;
          const aprovados = amb.servicos.filter(s => s.status === 'aprovado').length;
          const total = amb.servicos.length;

          let stroke = '#3b82f6';
          let fill = 'rgba(59,130,246,0.08)';
          if (reprovados > 0) { stroke = '#ef4444'; fill = 'rgba(239,68,68,0.08)'; }
          else if (total > 0 && aprovados === total) { stroke = '#22c55e'; fill = 'rgba(34,197,94,0.08)'; }
          if (isSelected) { stroke = 'hsl(var(--primary))'; fill = 'hsla(var(--primary),0.15)'; }

          const shapeType = (amb as any).shape_type || 'rect';
          const shapeData = (amb as any).shape_data as ShapeData | null;

          if (shapeType === 'circle' && shapeData?.cx !== undefined) {
            return (
              <circle
                key={amb.id}
                cx={`${shapeData.cx}%`}
                cy={`${shapeData.cy}%`}
                r={`${shapeData.r}%`}
                stroke={stroke}
                strokeWidth="0.4"
                fill={fill}
                className={isSelected ? '' : ''}
                style={{ cursor: isDrawingMode ? undefined : 'pointer', pointerEvents: isDrawingMode ? 'none' : 'all' }}
                onClick={() => !isDrawingMode && onAmbienteClick(amb.id)}
              />
            );
          }

          if (shapeType === 'polyline' && shapeData?.points?.length) {
            const pts = shapeData.points.map(p => `${p.x},${p.y}`).join(' ');
            return (
              <polygon
                key={amb.id}
                points={pts}
                stroke={stroke}
                strokeWidth="0.4"
                fill={fill}
                style={{ cursor: isDrawingMode ? undefined : 'pointer', pointerEvents: isDrawingMode ? 'none' : 'all' }}
                onClick={() => !isDrawingMode && onAmbienteClick(amb.id)}
              />
            );
          }

          // default rect
          return (
            <rect
              key={amb.id}
              x={`${amb.pos_x}%`}
              y={`${amb.pos_y}%`}
              width={`${amb.pos_w}%`}
              height={`${amb.pos_h}%`}
              stroke={stroke}
              strokeWidth="0.4"
              fill={fill}
              style={{ cursor: isDrawingMode ? undefined : 'pointer', pointerEvents: isDrawingMode ? 'none' : 'all' }}
              onClick={() => !isDrawingMode && onAmbienteClick(amb.id)}
            />
          );
        })}

        {/* Rect preview */}
        {rectPreview && (
          <rect
            x={`${rectPreview.x}%`} y={`${rectPreview.y}%`}
            width={`${rectPreview.w}%`} height={`${rectPreview.h}%`}
            stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="2,1"
            fill="hsla(var(--primary),0.12)"
          />
        )}

        {/* Circle preview */}
        {circlePreview && (
          <circle
            cx={`${circlePreview.cx}%`} cy={`${circlePreview.cy}%`} r={`${circlePreview.r}%`}
            stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="2,1"
            fill="hsla(var(--primary),0.12)"
          />
        )}

        {/* Polyline preview */}
        {isDrawingMode && drawMode === 'polyline' && polyPoints.length > 0 && (
          <>
            {/* Completed segments */}
            <polyline
              points={polyPoints.map(p => `${p.x},${p.y}`).join(' ')}
              stroke="hsl(var(--primary))" strokeWidth="0.5" fill="none"
            />
            {/* Preview segment to mouse */}
            {polyMousePos && (
              <line
                x1={`${polyPoints[polyPoints.length - 1].x}%`}
                y1={`${polyPoints[polyPoints.length - 1].y}%`}
                x2={`${polyMousePos.x}%`} y2={`${polyMousePos.y}%`}
                stroke="hsl(var(--primary))" strokeWidth="0.4" strokeDasharray="2,1"
              />
            )}
            {/* Dots */}
            {polyPoints.map((p, i) => (
              <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r="0.6"
                fill="hsl(var(--primary))" />
            ))}
          </>
        )}
      </svg>

      {/* Ambiente name labels (HTML overlay) */}
      <div className="absolute inset-0 pointer-events-none">
        {pageAmbientes.map(amb => {
          const isSelected = selectedAmbienteId === amb.id;
          const reprovados = amb.servicos.filter(s => s.status === 'reprovado').length;
          const aprovados = amb.servicos.filter(s => s.status === 'aprovado').length;
          const total = amb.servicos.length;
          let labelBg = 'bg-blue-500';
          if (reprovados > 0) labelBg = 'bg-red-500';
          else if (total > 0 && aprovados === total) labelBg = 'bg-green-500';
          if (isSelected) labelBg = 'bg-primary';

          const shapeType = (amb as any).shape_type || 'rect';
          const shapeData = (amb as any).shape_data as ShapeData | null;

          let labelX = amb.pos_x;
          let labelY = amb.pos_y;
          if (shapeType === 'circle' && shapeData?.cx !== undefined) {
            labelX = shapeData.cx - shapeData.r!;
            labelY = shapeData.cy - shapeData.r!;
          } else if (shapeType === 'polyline' && shapeData?.points?.length) {
            labelX = Math.min(...shapeData.points.map(p => p.x));
            labelY = Math.min(...shapeData.points.map(p => p.y));
          }

          return (
            <div
              key={amb.id}
              className="absolute"
              style={{ left: `${labelX}%`, top: `${labelY}%` }}
            >
              <div className={`${labelBg} text-white text-[9px] font-bold px-1 py-0.5 rounded shadow-sm flex items-center gap-1 -translate-y-full`}>
                <span className="truncate max-w-[80px]">{amb.nome}</span>
                {total > 0 && (
                  <span className="shrink-0 opacity-90">{aprovados}/{total}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Location pins for rejected services */}
        {locationPins.map(pin => (
          <div
            key={pin.servicoId}
            className="absolute pointer-events-none"
            style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -100%)' }}
          >
            <div className="flex flex-col items-center">
              <div className="bg-destructive text-destructive-foreground text-[8px] font-bold px-1 py-0.5 rounded shadow-md whitespace-nowrap max-w-[80px] truncate text-center">
                ⚠ {pin.label}
              </div>
              <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-destructive" />
            </div>
          </div>
        ))}

        {/* Polyline hint */}
        {isDrawingMode && drawMode === 'polyline' && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full pointer-events-none">
            Clique para adicionar pontos · Duplo-clique para finalizar
            {polyPoints.length > 0 && ` (${polyPoints.length} pts)`}
          </div>
        )}

        {/* Pin mode hint */}
        {isPinMode && pendingPinServico && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-[10px] px-2 py-1 rounded-full pointer-events-none">
            Clique no PDF para marcar a localização: {pendingPinServico.descricao}
          </div>
        )}
      </div>
    </div>
  );
}
