import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Point { x: number; y: number; }

interface PhotoZoomDialogProps {
  open: boolean;
  onClose: () => void;
  src: string;
  annotationPoint?: Point | null;
  annotationColor?: 'red' | 'green';
  title?: string;
}

export function PhotoZoomDialog({ open, onClose, src, annotationPoint, annotationColor = 'red', title }: PhotoZoomDialogProps) {
  const isGreen = annotationColor === 'green';
  const pingColor = isGreen ? 'bg-green-500' : 'bg-destructive';
  const dotColor  = isGreen ? 'bg-green-500' : 'bg-destructive';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 gap-0 bg-black border-none overflow-hidden">
        <div className="relative flex items-center justify-center w-full h-full" style={{ minHeight: 300 }}>
          <div className="relative inline-block">
            <img
              src={src}
              alt={title ?? 'Foto ampliada'}
              className="max-w-[88vw] max-h-[85vh] object-contain rounded"
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
                <span className={`absolute rounded-full ${pingColor} opacity-30 animate-ping`} style={{ width: 36, height: 36, top: -8, left: -8 }} />
                <div className={`w-6 h-6 rounded-full ${dotColor} border-2 border-white shadow-xl flex items-center justify-center`}>
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
            )}
          </div>

          <Button
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white hover:bg-black/80"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          {title && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap">
              {title}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
