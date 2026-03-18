import React, { useEffect, useRef, useState } from 'react';
import type { ChecklistAmbiente } from '@/hooks/useChecklistDinamico';

const PDFJS_VERSION = '3.11.174';
const SNAP_THRESHOLD = 3; // units in 0-100 space

export type DrawMode = 'rect' | 'circle' | 'polyline';

export interface ShapeData {
  points?: { x: number; y: number }[];
  cx?: number; cy?: number; r?: number;
}

interface LocationPin {
  x: number;
  y: number;
  servicoId: string;
  label: string;
  fotoUrl?: string | null;
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
  onDrawComplete: (shape: {
    type: DrawMode;
    rect?: { x: number; y: number; w: number; h: number };
    shapeData?: ShapeData;
  }) => void;
  onAmbienteClick: (id: string) => void;
  onDeselect: () => void;
  onPinPlaced: (servicoId: string, pin: { x: number; y: number }) => void;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
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
  onDeselect,
  onPinPlaced,
}: PdfCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const [renderKey, setRenderKey] = useState(0);

  // Rect
  const [rectState, setRectState] = useState<{
    startX: number; startY: number; currentX: number; currentY: number;
  } | null>(null);

  // Circle
  const [circleState, setCircleState] = useState<{
    startX: number; startY: number; currentX: number; currentY: number;
  } | null>(null);

  // Polyline
  const [polyPoints, setPolyPoints] = useState<{ x: number; y: number }[]>([]);
  const [polyMouse, setPolyMouse] = useState<{ x: number; y: number } | null>(null);

  // Snap state — true when mouse is near the first polyline point
  const isSnapping =
    drawMode === 'polyline' &&
    polyPoints.length >= 2 &&
    polyMouse != null &&
    dist(polyMouse, polyPoints[0]) < SNAP_THRESHOLD;

  // ── PDF loading ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if ((window as any).pdfjsLib) return;
      const script = document.createElement('script');
      script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
      script.onload = () => {
        const lib = (window as any).pdfjsLib;
        lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
      };
      document.head.appendChild(script);
    };
    load();
  }, []);

  useEffect(() => {
    if (!pdfUrl) return;
    const tryLoad = async () => {
      const lib = (window as any).pdfjsLib;
      if (!lib) { setTimeout(tryLoad, 300); return; }
      try {
        const doc = await lib.getDocument({ url: pdfUrl, withCredentials: false }).promise;
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
        const vp0 = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: containerWidth / vp0.width });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
      } catch (err) { console.error('Page render error:', err); }
    };
    renderPage();
  }, [renderKey, currentPage]);

  // ── Coordinate helpers ─────────────────────────────────────────────────────
  const getPosFromClient = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const r = containerRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100)),
    };
  };

  const getPos = (e: React.MouseEvent<HTMLDivElement>) =>
    getPosFromClient(e.clientX, e.clientY);

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    const pos = getPos(e);
    if (drawMode === 'rect') setRectState({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
    if (drawMode === 'circle') setCircleState({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pos = getPos(e);
    if (drawMode === 'rect' && rectState) setRectState(p => p ? { ...p, currentX: pos.x, currentY: pos.y } : null);
    if (drawMode === 'circle' && circleState) setCircleState(p => p ? { ...p, currentX: pos.x, currentY: pos.y } : null);
    if (drawMode === 'polyline') setPolyMouse(pos);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pos = getPos(e);
    if (drawMode === 'rect' && rectState) {
      const x = Math.min(rectState.startX, pos.x);
      const y = Math.min(rectState.startY, pos.y);
      const w = Math.abs(pos.x - rectState.startX);
      const h = Math.abs(pos.y - rectState.startY);
      setRectState(null);
      if (w > 1.5 && h > 1.5) onDrawComplete({ type: 'rect', rect: { x, y, w, h } });
    }
    if (drawMode === 'circle' && circleState) {
      const r = dist({ x: pos.x, y: pos.y }, { x: circleState.startX, y: circleState.startY });
      setCircleState(null);
      if (r > 1.5) onDrawComplete({ type: 'circle', shapeData: { cx: circleState.startX, cy: circleState.startY, r } });
    }
  };

  // ── Touch handlers (tablet / mobile) ───────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    const t = e.touches[0];
    const pos = getPosFromClient(t.clientX, t.clientY);
    if (drawMode === 'rect') setRectState({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
    if (drawMode === 'circle') setCircleState({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    const t = e.touches[0];
    const pos = getPosFromClient(t.clientX, t.clientY);
    if (drawMode === 'rect' && rectState) setRectState(p => p ? { ...p, currentX: pos.x, currentY: pos.y } : null);
    if (drawMode === 'circle' && circleState) setCircleState(p => p ? { ...p, currentX: pos.x, currentY: pos.y } : null);
    if (drawMode === 'polyline') setPolyMouse(pos);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDrawingMode && !isPinMode) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    const pos = getPosFromClient(t.clientX, t.clientY);

    // Pin mode
    if (isPinMode && pendingPinServico) {
      onPinPlaced(pendingPinServico.id, pos);
      return;
    }

    // Polyline: add point or close
    if (drawMode === 'polyline') {
      const snapping =
        polyPoints.length >= 2 &&
        dist(pos, polyPoints[0]) < SNAP_THRESHOLD;
      if (snapping) {
        onDrawComplete({ type: 'polyline', shapeData: { points: polyPoints } });
        setPolyPoints([]);
        setPolyMouse(null);
      } else {
        setPolyPoints(prev => [...prev, pos]);
      }
      return;
    }

    // Rect
    if (drawMode === 'rect' && rectState) {
      const x = Math.min(rectState.startX, pos.x);
      const y = Math.min(rectState.startY, pos.y);
      const w = Math.abs(pos.x - rectState.startX);
      const h = Math.abs(pos.y - rectState.startY);
      setRectState(null);
      if (w > 1.5 && h > 1.5) onDrawComplete({ type: 'rect', rect: { x, y, w, h } });
      return;
    }

    // Circle
    if (drawMode === 'circle' && circleState) {
      const r = dist(pos, { x: circleState.startX, y: circleState.startY });
      setCircleState(null);
      if (r > 1.5) onDrawComplete({ type: 'circle', shapeData: { cx: circleState.startX, cy: circleState.startY, r } });
      return;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const pos = getPos(e);

    // Pin mode
    if (isPinMode && pendingPinServico) {
      onPinPlaced(pendingPinServico.id, pos);
      return;
    }

    // Polyline: add point
    if (isDrawingMode && drawMode === 'polyline') {
      if (isSnapping) {
        onDrawComplete({ type: 'polyline', shapeData: { points: polyPoints } });
        setPolyPoints([]);
        setPolyMouse(null);
        return;
      }
      setPolyPoints(prev => [...prev, pos]);
      return;
    }

    // Click on empty space (not drawing, not pin) → deselect + close pin popover
    if (!isDrawingMode && !isPinMode) {
      setActivePinId(null);
      onDeselect();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode || drawMode !== 'polyline') return;
    e.preventDefault();
    if (polyPoints.length >= 2) {
      onDrawComplete({ type: 'polyline', shapeData: { points: polyPoints } });
    }
    setPolyPoints([]);
    setPolyMouse(null);
  };

  // ── Derived shapes ─────────────────────────────────────────────────────────
  const rectPreview = rectState ? {
    x: Math.min(rectState.startX, rectState.currentX),
    y: Math.min(rectState.startY, rectState.currentY),
    w: Math.abs(rectState.currentX - rectState.startX),
    h: Math.abs(rectState.currentY - rectState.startY),
  } : null;

  const circlePreview = circleState ? {
    cx: circleState.startX,
    cy: circleState.startY,
    r: dist({ x: circleState.currentX, y: circleState.currentY }, { x: circleState.startX, y: circleState.startY }),
  } : null;

  const pageAmbientes = ambientes.filter(a => a.pagina === currentPage);

  const [activePinId, setActivePinId] = useState<string | null>(null);

  const locationPins: LocationPin[] = [];
  pageAmbientes.forEach(amb => {
    amb.servicos.forEach(s => {
      const pin = s.location_pin as { x: number; y: number } | null;
      if (pin) locationPins.push({ x: pin.x, y: pin.y, servicoId: s.id, label: s.descricao, fotoUrl: s.foto_reprovacao_url });
    });
  });

  const cursor = isPinMode ? 'crosshair'
    : isDrawingMode ? (drawMode === 'polyline' ? (isSnapping ? 'pointer' : 'cell') : 'crosshair')
    : 'default';

  // ── Colour helpers ─────────────────────────────────────────────────────────
  const getAmbienteColors = (amb: ChecklistAmbiente, isSelected: boolean) => {
    const reprovados = amb.servicos.filter(s => s.status === 'reprovado').length;
    const aprovados  = amb.servicos.filter(s => s.status === 'aprovado').length;
    const total      = amb.servicos.length;
    if (isSelected) return { stroke: '#6366f1', fill: 'rgba(99,102,241,0.15)' };
    if (reprovados > 0) return { stroke: '#ef4444', fill: 'rgba(239,68,68,0.10)' };
    if (total > 0 && aprovados === total) return { stroke: '#22c55e', fill: 'rgba(34,197,94,0.10)' };
    return { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.10)' };
  };

  const getLabelBg = (amb: ChecklistAmbiente, isSelected: boolean) => {
    const reprovados = amb.servicos.filter(s => s.status === 'reprovado').length;
    const aprovados  = amb.servicos.filter(s => s.status === 'aprovado').length;
    const total      = amb.servicos.length;
    if (isSelected) return 'bg-indigo-500';
    if (reprovados > 0) return 'bg-red-500';
    if (total > 0 && aprovados === total) return 'bg-green-500';
    return 'bg-blue-500';
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none rounded-lg overflow-hidden"
      style={{ cursor, touchAction: isDrawingMode || isPinMode ? 'none' : 'auto' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseLeave={() => {
        setRectState(null);
        setCircleState(null);
        setPolyMouse(null);
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* PDF canvas */}
      <canvas ref={canvasRef} className="w-full block shadow-sm" />

      {/* SVG overlay — IMPORTANT: no viewBox, use percentage strings correctly */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* ── Existing ambient shapes ── */}
        {pageAmbientes.map(amb => {
          const isSelected = selectedAmbienteId === amb.id;
          const { stroke, fill } = getAmbienteColors(amb, isSelected);
          const sw = isSelected ? 0.6 : 0.4;
          const shapeType = (amb as any).shape_type || 'rect';
          const shapeData = (amb as any).shape_data as ShapeData | null;
          const clickProps = {
            style: { cursor: isDrawingMode ? undefined : 'pointer', pointerEvents: isDrawingMode ? ('none' as const) : ('all' as const) },
            onClick: (e: React.MouseEvent) => {
              if (isDrawingMode) return;
              e.stopPropagation(); // prevent container handleClick from firing onDeselect
              onAmbienteClick(amb.id);
            },
          };

          if (shapeType === 'circle' && shapeData?.cx !== undefined) {
            return (
              <circle key={amb.id}
                cx={shapeData.cx} cy={shapeData.cy} r={shapeData.r}
                stroke={stroke} strokeWidth={sw} fill={fill}
                {...clickProps}
              />
            );
          }
          if (shapeType === 'polyline' && shapeData?.points?.length) {
            const pts = shapeData.points.map(p => `${p.x},${p.y}`).join(' ');
            return (
              <polygon key={amb.id} points={pts}
                stroke={stroke} strokeWidth={sw} fill={fill}
                {...clickProps}
              />
            );
          }
          // default rect
          return (
            <rect key={amb.id}
              x={amb.pos_x} y={amb.pos_y} width={amb.pos_w} height={amb.pos_h}
              stroke={stroke} strokeWidth={sw} fill={fill}
              {...clickProps}
            />
          );
        })}

        {/* ── Rect preview ── */}
        {rectPreview && (
          <rect
            x={rectPreview.x} y={rectPreview.y}
            width={rectPreview.w} height={rectPreview.h}
            stroke="#6366f1" strokeWidth={0.5} strokeDasharray="2 1"
            fill="rgba(99,102,241,0.12)"
          />
        )}

        {/* ── Circle preview ── */}
        {circlePreview && (
          <circle
            cx={circlePreview.cx} cy={circlePreview.cy} r={circlePreview.r}
            stroke="#6366f1" strokeWidth={0.5} strokeDasharray="2 1"
            fill="rgba(99,102,241,0.12)"
          />
        )}

        {/* ── Polyline in-progress ── */}
        {isDrawingMode && drawMode === 'polyline' && polyPoints.length > 0 && (() => {
          const snapTarget = isSnapping ? polyPoints[0] : null;
          const effectiveMouse = snapTarget ?? polyMouse;
          return (
            <>
              {/* Filled preview polygon when snapping */}
              {isSnapping && (
                <polygon
                  points={polyPoints.map(p => `${p.x},${p.y}`).join(' ')}
                  stroke="#6366f1" strokeWidth={0.5} fill="rgba(99,102,241,0.15)"
                />
              )}

              {/* Drawn segments */}
              <polyline
                points={polyPoints.map(p => `${p.x},${p.y}`).join(' ')}
                stroke="#6366f1" strokeWidth={0.5} fill="none"
              />

              {/* Preview segment to cursor */}
              {effectiveMouse && (
                <line
                  x1={polyPoints[polyPoints.length - 1].x}
                  y1={polyPoints[polyPoints.length - 1].y}
                  x2={effectiveMouse.x}
                  y2={effectiveMouse.y}
                  stroke={isSnapping ? '#6366f1' : '#6366f1'}
                  strokeWidth={isSnapping ? 0.5 : 0.4}
                  strokeDasharray={isSnapping ? undefined : '2 1'}
                />
              )}

              {/* Dots on each point */}
              {polyPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 1.2 : 0.7}
                  fill={i === 0 ? (isSnapping ? '#22c55e' : '#6366f1') : '#6366f1'}
                  stroke="white" strokeWidth={0.3}
                />
              ))}

              {/* Snap ring on first point */}
              {isSnapping && (
                <circle cx={polyPoints[0].x} cy={polyPoints[0].y} r={2.5}
                  fill="none" stroke="#22c55e" strokeWidth={0.6}
                  strokeDasharray="1.5 0.8"
                />
              )}
            </>
          );
        })()}
      </svg>

      {/* ── HTML overlay: labels + pins ── */}
      <div className="absolute inset-0 pointer-events-none">
        {pageAmbientes.map(amb => {
          const isSelected = selectedAmbienteId === amb.id;
          const labelBg = getLabelBg(amb, isSelected);
          const total = amb.servicos.length;
          const aprovados = amb.servicos.filter(s => s.status === 'aprovado').length;
          const shapeType = (amb as any).shape_type || 'rect';
          const shapeData = (amb as any).shape_data as ShapeData | null;

          let lx = amb.pos_x, ly = amb.pos_y;
          if (shapeType === 'circle' && shapeData?.cx !== undefined) {
            lx = shapeData.cx - (shapeData.r ?? 0);
            ly = shapeData.cy - (shapeData.r ?? 0);
          } else if (shapeType === 'polyline' && shapeData?.points?.length) {
            lx = Math.min(...shapeData.points.map(p => p.x));
            ly = Math.min(...shapeData.points.map(p => p.y));
          }

          return (
            <div key={amb.id} className="absolute" style={{ left: `${lx}%`, top: `${ly}%` }}>
              <div className={`${labelBg} text-white text-[9px] font-bold px-1 py-0.5 rounded shadow-sm flex items-center gap-1 -translate-y-full whitespace-nowrap`}>
                <span className="truncate max-w-[80px]">{amb.nome}</span>
                {total > 0 && <span className="opacity-90">{aprovados}/{total}</span>}
              </div>
            </div>
          );
        })}

        {/* Location pins for rejected services */}
        {locationPins.map(pin => {
          const isActive = activePinId === pin.servicoId;
          return (
            <div key={pin.servicoId} className="absolute"
              style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -100%)', pointerEvents: 'all', zIndex: isActive ? 50 : 10 }}>
              {/* Photo popover */}
              {isActive && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-50 w-48 rounded-lg overflow-hidden shadow-2xl border border-destructive/40 bg-popover"
                  onClick={e => e.stopPropagation()}>
                  {pin.fotoUrl ? (
                    <img src={pin.fotoUrl} alt="Foto do problema" className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-20 flex items-center justify-center bg-muted text-muted-foreground text-[10px]">
                      Sem foto registrada
                    </div>
                  )}
                  <div className="px-2 py-1.5 bg-destructive/10 border-t border-destructive/20">
                    <p className="text-[10px] font-semibold text-destructive leading-tight truncate">{pin.label}</p>
                  </div>
                </div>
              )}
              {/* Pin marker */}
              <div
                className="flex flex-col items-center cursor-pointer"
                onClick={e => { e.stopPropagation(); setActivePinId(isActive ? null : pin.servicoId); }}
              >
                <div className="bg-destructive text-destructive-foreground text-[8px] font-bold px-1 py-0.5 rounded shadow-md whitespace-nowrap max-w-[80px] truncate text-center hover:scale-110 transition-transform">
                  ⚠ {pin.label}
                </div>
                <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-destructive" />
              </div>
            </div>
          );
        })}

        {/* Polyline hint */}
        {isDrawingMode && drawMode === 'polyline' && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-2 py-1 rounded-full pointer-events-none shadow"
            style={{ background: isSnapping ? 'rgba(34,197,94,0.9)' : 'rgba(0,0,0,0.7)', color: 'white' }}>
            {isSnapping
              ? '✓ Clique para fechar a forma'
              : polyPoints.length === 0
              ? 'Clique para começar a polilinha'
              : `Clique para adicionar pontos · Duplo-clique ou feche no 1º ponto (${polyPoints.length} pts)`}
          </div>
        )}

        {/* Pin mode hint */}
        {isPinMode && pendingPinServico && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] px-2 py-1 rounded-full pointer-events-none shadow">
            Clique no PDF para marcar: {pendingPinServico.descricao}
          </div>
        )}
      </div>
    </div>
  );
}
