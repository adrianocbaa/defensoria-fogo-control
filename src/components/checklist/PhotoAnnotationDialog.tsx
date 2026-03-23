import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import Cropper from 'react-easy-crop';
import { ZoomIn, ZoomOut, Crosshair, Crop, Check, X, RotateCcw, Loader2 } from 'lucide-react';

interface Area { x: number; y: number; width: number; height: number; }
interface Point { x: number; y: number; }

interface PhotoAnnotationDialogProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onConfirm: (blob: Blob, annotationPoint: Point | null) => void;
  initialPoint?: Point | null;
}

// ─── helpers ───────────────────────────────────────────────────────────────

/** Always returns a blob: URL so canvas operations are never CORS-tainted */
async function toLocalBlob(src: string): Promise<{ url: string; blob: Blob }> {
  if (src.startsWith('data:')) {
    // data URI → blob
    const res = await fetch(src);
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), blob };
  }
  if (src.startsWith('blob:')) {
    const res = await fetch(src);
    const blob = await res.blob();
    return { url: src, blob };
  }
  // Remote URL (Supabase, etc.) — fetch with no-cors override not needed because
  // we're fetching server-side-like; the browser allows it as long as CORS headers exist.
  const res = await fetch(src);
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), blob };
}

/** Crop a blob: URL with canvas — safe because source is always local */
async function getCroppedBlob(blobUrl: string, cropPx: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(cropPx.width);
      canvas.height = Math.round(cropPx.height);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(
        img,
        Math.round(cropPx.x), Math.round(cropPx.y),
        Math.round(cropPx.width), Math.round(cropPx.height),
        0, 0,
        Math.round(cropPx.width), Math.round(cropPx.height),
      );
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('canvas vazio'))),
        'image/jpeg', 0.92,
      );
    };
    img.onerror = reject;
    img.src = blobUrl;
  });
}

type Mode = 'crop' | 'annotate';

export function PhotoAnnotationDialog({
  open, onClose, imageSrc, onConfirm, initialPoint,
}: PhotoAnnotationDialogProps) {
  const [mode, setMode] = useState<Mode>('crop');

  // local blob URL used for both Cropper and canvas operations
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const [loadingBlob, setLoadingBlob] = useState(false);

  // crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [savedCropPx, setSavedCropPx] = useState<Area | null>(null);

  // annotate state
  const [annotationPoint, setAnnotationPoint] = useState<Point | null>(initialPoint ?? null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [processing, setProcessing] = useState(false);

  // When dialog opens, load the image as a local blob
  useEffect(() => {
    if (!open) return;

    // Reset all state
    setMode('crop');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setSavedCropPx(null);
    setAnnotationPoint(initialPoint ?? null);
    setLocalBlobUrl(null);

    setLoadingBlob(true);
    toLocalBlob(imageSrc)
      .then(({ url }) => setLocalBlobUrl(url))
      .catch(err => console.error('PhotoAnnotationDialog: failed to load image', err))
      .finally(() => setLoadingBlob(false));

    // Revoke blob URL on close
    return () => {
      setLocalBlobUrl(prev => {
        if (prev && prev.startsWith('blob:') && prev !== imageSrc) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onCropComplete = useCallback((_: Area, pixelCrop: Area) => {
    setCroppedAreaPixels(pixelCrop);
  }, []);

  const handleApplyCrop = () => {
    if (!croppedAreaPixels) return;
    setSavedCropPx(croppedAreaPixels);
    setMode('annotate');
  };

  const handleSkipCrop = () => {
    setSavedCropPx(null);
    setMode('annotate');
  };

  const handleAnnotationClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setAnnotationPoint({ x, y });
  };

  const handleConfirm = async () => {
    if (!localBlobUrl) return;
    setProcessing(true);
    try {
      let finalBlob: Blob;
      if (savedCropPx) {
        finalBlob = await getCroppedBlob(localBlobUrl, savedCropPx);
      } else {
        const res = await fetch(localBlobUrl);
        finalBlob = await res.blob();
      }
      onConfirm(finalBlob, annotationPoint);
      onClose();
    } catch (err) {
      console.error('PhotoAnnotationDialog confirm error:', err);
    } finally {
      setProcessing(false);
    }
  };

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
          {loadingBlob || !localBlobUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            </div>
          ) : mode === 'crop' ? (
            <Cropper
              image={localBlobUrl}
              crop={crop}
              zoom={zoom}
              aspect={undefined}
              minZoom={0.5}
              maxZoom={5}
              zoomSpeed={0.2}
              restrictPosition={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{ containerStyle: { background: '#000' } }}
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <div className="relative">
                <img
                  ref={imgRef}
                  src={localBlobUrl}
                  alt="Foto para anotação"
                  className="max-w-full max-h-[380px] object-contain cursor-crosshair select-none block"
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
                    <span className="absolute rounded-full bg-destructive opacity-30 animate-ping" style={{ width: 28, height: 28, top: -4, left: -4 }} />
                    <div className="w-5 h-5 rounded-full bg-destructive border-2 border-white shadow-lg flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
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
              {!annotationPoint && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                  Clique na foto para marcar onde está o problema
                </div>
              )}
              {savedCropPx && (
                <div className="absolute top-2 left-2 bg-primary/80 text-primary-foreground text-[10px] px-2 py-1 rounded flex items-center gap-1 pointer-events-none">
                  <Crop className="h-2.5 w-2.5" /> Recorte aplicado
                </div>
              )}
            </div>
          )}
        </div>

        {mode === 'crop' && (
          <div className="px-4 py-2 border-t flex items-center gap-3 bg-background">
            <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider value={[zoom]} onValueChange={v => setZoom(v[0])} min={0.5} max={5} step={0.05} className="flex-1" />
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
              <Button variant="ghost" size="sm" onClick={handleSkipCrop} disabled={processing || loadingBlob} className="h-8 text-xs ml-auto">
                Pular recorte →
              </Button>
              <Button size="sm" onClick={handleApplyCrop} disabled={processing || loadingBlob || !croppedAreaPixels} className="h-8 text-xs">
                <Crop className="h-3 w-3 mr-1" />Aplicar recorte
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleConfirm} disabled={processing} className="h-8 text-xs ml-auto bg-primary">
              {processing ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Salvando...</> : <><Check className="h-3 w-3 mr-1" />Confirmar foto</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
