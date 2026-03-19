import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { ChecklistAmbiente } from '@/hooks/useChecklistDinamico';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PDFJS_VERSION = '3.11.174';
const SNAP_THRESHOLD = 3; // units in 0-100 space
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const ZOOM_STEP = 0.4;

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
  status: string;
  fotoUrl?: string | null;
  fotoCorrecaoUrl?: string | null;
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

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
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
  const innerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const [renderKey, setRenderKey] = useState(0);

  // ── Zoom / pan state ───────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  // Pinch tracking
  const lastPinchDistRef = useRef<number | null>(null);
  const lastPinchCenterRef = useRef<{ x: number; y: number } | null>(null);

  // Clamp pan so the canvas can't go fully off-screen
  const clampPan = useCallback((px: number, py: number, z: number) => {
    const c = containerRef.current;
    if (!c) return { x: px, y: py };
    const cw = c.clientWidth;
    const ch = c.clientHeight;
    const iw = cw * z;
    const ih = ch * z;
    const maxX = Math.max(0, (iw - cw) / 2);
    const maxY = Math.max(0, (ih - ch) / 2);
    return { x: clamp(px, -maxX, maxX), y: clamp(py, -maxY, maxY) };
  }, []);

  const applyZoom = useCallback((newZoom: number, focalX?: number, focalY?: number) => {
    const z = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
    setZoom(prev => {
      const c = containerRef.current;
      if (!c) { setPan(p => clampPan(p.x, p.y, z)); return z; }
      const cw = c.clientWidth;
      const ch = c.clientHeight;
      const fx = focalX ?? cw / 2;
      const fy = focalY ?? ch / 2;
      setPan(prevPan => {
        // Adjust pan so the focal point stays fixed
        const scale = z / prev;
        const newPx = fx - scale * (fx - prevPan.x);
        const newPy = fy - scale * (fy - prevPan.y);
        return clampPan(newPx, newPy, z);
      });
      return z;
    });
  }, [clampPan]);

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

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

  // Reset zoom when page or PDF changes
  useEffect(() => { resetZoom(); }, [pdfUrl, currentPage]);

  useEffect(() => {
    let cancelled = false;
    const renderPage = async () => {
      const doc = pdfDocRef.current;
      if (!doc || !canvasRef.current || !containerRef.current) return;

      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (_) {}
        renderTaskRef.current = null;
      }

      try {
        const page = await doc.getPage(currentPage);
        if (cancelled) return;
        const containerWidth = containerRef.current.clientWidth || 600;
        const vp0 = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: containerWidth / vp0.width });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx || cancelled) return;
        canvas.width = vp.width;
        canvas.height = vp.height;
        const task = page.render({ canvasContext: ctx, viewport: vp });
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Page render error:', err);
        }
      }
    };
    renderPage();
    return () => { cancelled = true; };
  }, [renderKey, currentPage]);

  // ── Coordinate helpers (accounts for zoom/pan) ────────────────────────────
  const getPosFromClient = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const r = containerRef.current.getBoundingClientRect();
    // Adjust for pan and zoom
    const localX = clientX - r.left - r.width / 2 - pan.x;
    const localY = clientY - r.top - r.height / 2 - pan.y;
    const scaledW = r.width * zoom;
    const scaledH = r.height * zoom;
    return {
      x: Math.max(0, Math.min(100, (localX / scaledW + 0.5) * 100)),
      y: Math.max(0, Math.min(100, (localY / scaledH + 0.5) * 100)),
    };
  }, [zoom, pan]);

  const getPos = (e: React.MouseEvent<HTMLDivElement>) =>
    getPosFromClient(e.clientX, e.clientY);

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const c = containerRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const focalX = e.clientX - r.left - r.width / 2;
    const focalY = e.clientY - r.top - r.height / 2;
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(prev => {
      const z = clamp(prev + delta, MIN_ZOOM, MAX_ZOOM);
      const scale = z / prev;
      setPan(prevPan => clampPan(
        focalX - scale * (focalX - prevPan.x),
        focalY - scale * (focalY - prevPan.y),
        z
      ));
      return z;
    });
  }, [clampPan]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Mouse pan (middle-click drag OR space+drag) ────────────────────────────
  const isSpaceRef = useRef(false);
  useEffect(() => {
    const isTypingTarget = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (isTypingTarget(e)) return; // never block typing in inputs
        e.preventDefault();
        isSpaceRef.current = true;
      }
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') isSpaceRef.current = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Middle-click or space+left = pan
    if (e.button === 1 || (e.button === 0 && isSpaceRef.current) || (zoom > 1 && !isDrawingMode && !isPinMode && e.button === 0)) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, panX: pan.x, panY: pan.y };
      return;
    }
    if (!isDrawingMode) return;
    e.preventDefault();
    const pos = getPos(e);
    if (drawMode === 'rect') setRectState({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
    if (drawMode === 'circle') setCircleState({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.mouseX;
      const dy = e.clientY - panStartRef.current.mouseY;
      setPan(clampPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy, zoom));
      return;
    }
    e.preventDefault();
    const pos = getPos(e);
    if (drawMode === 'rect' && rectState) setRectState(p => p ? { ...p, currentX: pos.x, currentY: pos.y } : null);
    if (drawMode === 'circle' && circleState) setCircleState(p => p ? { ...p, currentX: pos.x, currentY: pos.y } : null);
    if (drawMode === 'polyline') setPolyMouse(pos);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }
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
    if (e.touches.length === 2) {
      // Pinch start
      e.preventDefault();
      const a = e.touches[0], b = e.touches[1];
      lastPinchDistRef.current = dist({ x: a.clientX, y: a.clientY }, { x: b.clientX, y: b.clientY });
      const c = containerRef.current!.getBoundingClientRect();
      lastPinchCenterRef.current = {
        x: (a.clientX + b.clientX) / 2 - c.left - c.width / 2,
        y: (a.clientY + b.clientY) / 2 - c.top - c.height / 2,
      };
      return;
    }
    if (!isDrawingMode) return;
    e.preventDefault();
    const t = e.touches[0];
    const pos = getPosFromClient(t.clientX, t.clientY);
    if (drawMode === 'rect') setRectState({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
    if (drawMode === 'circle') setCircleState({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const a = e.touches[0], b = e.touches[1];
      const newDist = dist({ x: a.clientX, y: a.clientY }, { x: b.clientX, y: b.clientY });
      if (lastPinchDistRef.current !== null && lastPinchCenterRef.current) {
        const scale = newDist / lastPinchDistRef.current;
        const fc = lastPinchCenterRef.current;
        setZoom(prev => {
          const z = clamp(prev * scale, MIN_ZOOM, MAX_ZOOM);
          const s = z / prev;
          setPan(pp => clampPan(fc.x - s * (fc.x - pp.x), fc.y - s * (fc.y - pp.y), z));
          return z;
        });
        lastPinchDistRef.current = newDist;
      }
      return;
    }
    if (!isDrawingMode) return;
    e.preventDefault();
    const t = e.touches[0];
    const pos = getPosFromClient(t.clientX, t.clientY);
    if (drawMode === 'rect' && rectState) setRectState(p => p ? { ...p, currentX: pos.x, currentY: pos.y } : null);
    if (drawMode === 'circle' && circleState) setCircleState(p => p ? { ...p, currentX: pos.x, currentY: pos.y } : null);
    if (drawMode === 'polyline') setPolyMouse(pos);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    lastPinchDistRef.current = null;
    lastPinchCenterRef.current = null;

    if (!isDrawingMode && !isPinMode) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    const pos = getPosFromClient(t.clientX, t.clientY);

    if (isPinMode && pendingPinServico) {
      onPinPlaced(pendingPinServico.id, pos);
      return;
    }

    if (drawMode === 'polyline') {
      const snapping = polyPoints.length >= 2 && dist(pos, polyPoints[0]) < SNAP_THRESHOLD;
      if (snapping) {
        onDrawComplete({ type: 'polyline', shapeData: { points: polyPoints } });
        setPolyPoints([]);
        setPolyMouse(null);
      } else {
        setPolyPoints(prev => [...prev, pos]);
      }
      return;
    }

    if (drawMode === 'rect' && rectState) {
      const x = Math.min(rectState.startX, pos.x);
      const y = Math.min(rectState.startY, pos.y);
      const w = Math.abs(pos.x - rectState.startX);
      const h = Math.abs(pos.y - rectState.startY);
      setRectState(null);
      if (w > 1.5 && h > 1.5) onDrawComplete({ type: 'rect', rect: { x, y, w, h } });
      return;
    }

    if (drawMode === 'circle' && circleState) {
      const r = dist(pos, { x: circleState.startX, y: circleState.startY });
      setCircleState(null);
      if (r > 1.5) onDrawComplete({ type: 'circle', shapeData: { cx: circleState.startX, cy: circleState.startY, r } });
      return;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanningRef.current) return;
    const pos = getPos(e);

    if (isPinMode && pendingPinServico) {
      onPinPlaced(pendingPinServico.id, pos);
      return;
    }

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
      if (pin) locationPins.push({
        x: pin.x, y: pin.y, servicoId: s.id, label: s.descricao,
        status: s.status,
        fotoUrl: s.foto_reprovacao_url,
        fotoCorrecaoUrl: s.foto_correcao_url,
      });
    });
  });

  const isPanning = isPanningRef.current;
  const canPan = zoom > 1 && !isDrawingMode && !isPinMode;
  const cursor = isPinMode ? 'crosshair'
    : isDrawingMode ? (drawMode === 'polyline' ? (isSnapping ? 'pointer' : 'cell') : 'crosshair')
    : canPan ? (isPanning ? 'grabbing' : 'grab')
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

  const zoomPct = Math.round(zoom * 100);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none rounded-lg overflow-hidden bg-muted/30"
      style={{ cursor, touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        isPanningRef.current = false;
        setRectState(null);
        setCircleState(null);
        setPolyMouse(null);
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Zoom controls ────────────────────────────────────────────────────── */}
      <div className="absolute top-2 right-2 z-30 flex flex-col items-center gap-1 pointer-events-auto">
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 shadow-md opacity-90 hover:opacity-100"
          onClick={e => { e.stopPropagation(); applyZoom(zoom + ZOOM_STEP); }}
          title="Ampliar"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <div className="bg-background/90 border text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shadow text-foreground min-w-[36px] text-center">
          {zoomPct}%
        </div>
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 shadow-md opacity-90 hover:opacity-100"
          onClick={e => { e.stopPropagation(); applyZoom(zoom - ZOOM_STEP); }}
          title="Reduzir"
          disabled={zoom <= MIN_ZOOM}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        {zoom > 1 && (
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 shadow-md opacity-90 hover:opacity-100"
            onClick={e => { e.stopPropagation(); resetZoom(); }}
            title="Resetar zoom"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* ── Zoomable / pannable inner layer ──────────────────────────────────── */}
      <div
        ref={innerRef}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        {/* PDF canvas */}
        <canvas ref={canvasRef} className="w-full block shadow-sm" />

        {/* SVG overlay */}
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
              style: { cursor: (isDrawingMode || isPinMode) ? undefined : 'pointer', pointerEvents: (isDrawingMode || isPinMode) ? ('none' as const) : ('all' as const) },
              onClick: (e: React.MouseEvent) => {
                if (isDrawingMode || isPinMode) return;
                e.stopPropagation();
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
                {isSnapping && (
                  <polygon
                    points={polyPoints.map(p => `${p.x},${p.y}`).join(' ')}
                    stroke="#6366f1" strokeWidth={0.5} fill="rgba(99,102,241,0.15)"
                  />
                )}
                <polyline
                  points={polyPoints.map(p => `${p.x},${p.y}`).join(' ')}
                  stroke="#6366f1" strokeWidth={0.5} fill="none"
                />
                {effectiveMouse && (
                  <line
                    x1={polyPoints[polyPoints.length - 1].x}
                    y1={polyPoints[polyPoints.length - 1].y}
                    x2={effectiveMouse.x}
                    y2={effectiveMouse.y}
                    stroke="#6366f1"
                    strokeWidth={isSnapping ? 0.5 : 0.4}
                    strokeDasharray={isSnapping ? undefined : '2 1'}
                  />
                )}
                {polyPoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 1.2 : 0.7}
                    fill={i === 0 ? (isSnapping ? '#22c55e' : '#6366f1') : '#6366f1'}
                    stroke="white" strokeWidth={0.3}
                  />
                ))}
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

          {/* Location pins */}
          {locationPins.map(pin => {
            const isActive = activePinId === pin.servicoId;
            const isAprovado = pin.status === 'aprovado';
            const photoUrl = isAprovado ? pin.fotoCorrecaoUrl : pin.fotoUrl;
            const pinBg = isAprovado ? 'bg-green-600' : 'bg-destructive';
            const pinTriangle = isAprovado ? 'border-t-green-600' : 'border-t-destructive';
            const popoverBorder = isAprovado ? 'border-green-500/40' : 'border-destructive/40';
            const popoverFooterBg = isAprovado ? 'bg-green-500/10 border-t border-green-500/20' : 'bg-destructive/10 border-t border-destructive/20';
            const popoverLabel = isAprovado ? 'text-green-700' : 'text-destructive';
            const icon = isAprovado ? '✓' : '⚠';

            return (
              <div key={pin.servicoId} className="absolute"
                style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -100%)', pointerEvents: 'all', zIndex: isActive ? 50 : 10 }}>
                {isActive && (
                  <div className={`absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-50 w-48 rounded-lg overflow-hidden shadow-2xl border ${popoverBorder} bg-popover`}
                    onClick={e => e.stopPropagation()}>
                    {photoUrl ? (
                      <img src={photoUrl} alt={isAprovado ? 'Correção' : 'Problema'} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-20 flex items-center justify-center bg-muted text-muted-foreground text-[10px]">
                        Sem foto registrada
                      </div>
                    )}
                    <div className={`px-2 py-1.5 ${popoverFooterBg}`}>
                      <p className={`text-[10px] font-semibold ${popoverLabel} leading-tight truncate`}>{pin.label}</p>
                    </div>
                  </div>
                )}
                <div
                  className="flex flex-col items-center cursor-pointer"
                  onClick={e => { e.stopPropagation(); setActivePinId(isActive ? null : pin.servicoId); }}
                >
                  <div className={`${pinBg} text-white text-[8px] font-bold px-1 py-0.5 rounded shadow-md whitespace-nowrap max-w-[80px] truncate text-center hover:scale-110 transition-transform`}>
                    {icon} {pin.label}
                  </div>
                  <div className={`w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent ${pinTriangle}`} />
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

      {/* Pan hint when zoomed */}
      {zoom > 1 && !isDrawingMode && !isPinMode && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full pointer-events-none shadow">
          Arraste para mover · Scroll para zoom
        </div>
      )}
    </div>
  );
}
