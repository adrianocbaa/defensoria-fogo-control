import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import Cropper from 'react-easy-crop';
import { ZoomIn, ZoomOut, Crosshair, Crop, Check, X, RotateCcw } from 'lucide-react';

interface Area { x: number; y: number; width: number; height: number; }
interface Point { x: number; y: number; } // 0-100 % relative to image

interface PhotoAnnotationDialogProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  /** Called with the final processed blob + optional annotation point (0–100%) */
  onConfirm: (blob: Blob, annotationPoint: Point | null) => void;
  /** Initial annotation point if editing */
  initialPoint?: Point | null;
}

// ─── helpers ───────────────────────────────────────────────────────────────
/** Load an image element from any src, waiting until fully decoded */
async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Convert any image src to a local blob URL to avoid CORS taint on canvas */
async function toLocalBlobUrl(src: string): Promise<{ url: string; owned: boolean }> {
  if (src.startsWith('blob:') || src.startsWith('data:')) return { url: src, owned: false };
  try {
    const resp = await fetch(src);
    const blob = await resp.blob();
    return { url: URL.createObjectURL(blob), owned: true };
  } catch {
    return { url: src, owned: false };
  }
}

async function getCroppedBlob(src: string, crop: Area): Promise<Blob> {
  const { url: localUrl, owned } = await toLocalBlobUrl(src);
  const image = await loadImageElement(localUrl);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(crop.width);
  canvas.height = Math.round(crop.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    image,
    Math.round(crop.x), Math.round(crop.y),
    Math.round(crop.width), Math.round(crop.height),
    0, 0,
    Math.round(crop.width), Math.round(crop.height)
  );
  if (owned) URL.revokeObjectURL(localUrl);
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('canvas vazio'))), 'image/jpeg', 0.92)
  );
}

type Mode = 'crop' | 'annotate';

export function PhotoAnnotationDialog({
  open, onClose, imageSrc, onConfirm, initialPoint,
}: PhotoAnnotationDialogProps) {
  const [mode, setMode] = useState<Mode>('crop');

  // ── crop state ──
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // ── annotate state ──
  const [annotationPoint, setAnnotationPoint] = useState<Point | null>(initialPoint ?? null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [processing, setProcessing] = useState(false);

  // reset on open
  useEffect(() => {
    if (open) {
      setMode('crop');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCroppedBlob(null);
      if (croppedPreviewUrl) { URL.revokeObjectURL(croppedPreviewUrl); }
      setCroppedPreviewUrl(null);
      setAnnotationPoint(initialPoint ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onCropComplete = useCallback((_: Area, pixelCrop: Area) => {
    setCroppedAreaPixels(pixelCrop);
  }, []);

  const handleApplyCrop = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      setCroppedBlob(blob);
      const url = URL.createObjectURL(blob);
      if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl);
      setCroppedPreviewUrl(url);
      setMode('annotate');
    } finally {
      setProcessing(false);
    }
  };

  const handleSkipCrop = () => {
    // go straight to annotate without cropping
    setCroppedBlob(null);
    setCroppedPreviewUrl(null);
    setMode('annotate');
  };

  // click on annotation image → place red dot
  const handleAnnotationClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setAnnotationPoint({ x, y });
  };

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      let finalBlob = croppedBlob;
      if (!finalBlob) {
        // no crop → fetch original as blob (handles CORS)
        const localUrl = await fetchAsBlobUrl(imageSrc);
        const resp = await fetch(localUrl);
        finalBlob = await resp.blob();
        if (!imageSrc.startsWith('blob:')) URL.revokeObjectURL(localUrl);
      }
      onConfirm(finalBlob, annotationPoint);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const displaySrc = croppedPreviewUrl ?? imageSrc;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            {mode === 'crop' ? (
              <><Crop className="h-4 w-4 text-primary" />Recortar Foto</>
            ) : (
              <><Crosshair className="h-4 w-4 text-destructive" />Marcar Problema na Foto</>
            )}
          </DialogTitle>
          {/* step indicator */}
          <div className="flex gap-2 mt-2">
            {(['crop', 'annotate'] as Mode[]).map((s, i) => (
              <div key={s} className={`flex items-center gap-1 text-xs ${mode === s ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${mode === s ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{i + 1}</span>
                {s === 'crop' ? 'Recortar' : 'Indicar problema'}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="relative bg-black" style={{ height: 380 }}>
          {mode === 'crop' ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={undefined}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="relative inline-block max-w-full max-h-full">
                <img
                  ref={imgRef}
                  src={displaySrc}
                  alt="Foto para anotação"
                  className="max-w-full max-h-[360px] object-contain cursor-crosshair select-none"
                  onClick={handleAnnotationClick}
                  draggable={false}
                />
                {annotationPoint && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${annotationPoint.x}%`,
                      top: `${annotationPoint.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {/* outer pulsing ring */}
                    <span className="absolute inset-0 rounded-full bg-destructive opacity-30 animate-ping" style={{ width: 28, height: 28, marginLeft: -4, marginTop: -4 }} />
                    {/* inner dot */}
                    <div className="w-5 h-5 rounded-full bg-destructive border-2 border-white shadow-lg flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>
                )}
              </div>
              {!annotationPoint && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                  Clique na foto para marcar onde está o problema
                </div>
              )}
              {annotationPoint && (
                <button
                  className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1 hover:bg-black/80"
                  onClick={() => setAnnotationPoint(null)}
                >
                  <RotateCcw className="h-2.5 w-2.5" /> Remover marcação
                </button>
              )}
            </div>
          )}
        </div>

        {/* Zoom slider – only in crop mode */}
        {mode === 'crop' && (
          <div className="px-4 py-2 border-t flex items-center gap-3 bg-background">
            <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider value={[zoom]} onValueChange={v => setZoom(v[0])} min={1} max={3} step={0.05} className="flex-1" />
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(zoom * 100)}%</span>
          </div>
        )}

        <DialogFooter className="px-4 py-3 border-t bg-background gap-2 flex-row">
          <Button variant="outline" size="sm" onClick={onClose} disabled={processing} className="h-8 text-xs">
            <X className="h-3 w-3 mr-1" />Cancelar
          </Button>

          {mode === 'crop' ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleSkipCrop} disabled={processing} className="h-8 text-xs ml-auto">
                Pular recorte →
              </Button>
              <Button size="sm" onClick={handleApplyCrop} disabled={processing || !croppedAreaPixels} className="h-8 text-xs">
                {processing ? 'Processando...' : <><Crop className="h-3 w-3 mr-1" />Aplicar recorte</>}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleConfirm} disabled={processing} className="h-8 text-xs ml-auto bg-primary">
              {processing ? 'Salvando...' : <><Check className="h-3 w-3 mr-1" />Confirmar foto</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
