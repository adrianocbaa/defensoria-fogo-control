import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ImageGalleryProps {
  images: string[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export function ImageGallery({ images, isOpen, onClose, initialIndex = 0 }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Atualiza o índice quando initialIndex ou isOpen mudam
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, isOpen]);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'Escape') onClose();
  };

  if (!images.length) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="!max-w-[98vw] !w-[98vw] !h-[98vh] !max-h-[98vh] p-0 bg-black border-none overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <div className="w-full h-full flex flex-col bg-black">
          {/* Header fixo com contador e botão de fechar */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-black/80 z-10">
            <div className="text-white text-sm font-medium">
              {currentIndex + 1} de {images.length}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Área principal da imagem - ocupa o espaço restante */}
          <div className="flex-1 relative flex items-center justify-center min-h-0 p-4">
            {/* Previous button */}
            {images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={prevImage}
                className="absolute left-4 z-20 text-white hover:bg-white/20 h-10 w-10 bg-black/50"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            {/* Container da imagem */}
            <img
              src={images[currentIndex]}
              alt={`Foto ${currentIndex + 1}`}
              className="max-h-full max-w-full object-contain"
              style={{
                maxHeight: 'calc(98vh - 140px)', // header (40px) + thumbnails (60px) + padding (40px)
                maxWidth: 'calc(100% - 100px)', // espaço para botões
              }}
              loading="lazy"
            />

            {/* Next button */}
            {images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={nextImage}
                className="absolute right-4 z-20 text-white hover:bg-white/20 h-10 w-10 bg-black/50"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>

          {/* Thumbnails fixas na parte inferior */}
          {images.length > 1 && (
            <div className="flex-shrink-0 bg-black/80 py-2 px-4 z-10">
              <div className="flex gap-1 justify-center overflow-x-auto max-w-full">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`flex-shrink-0 w-10 h-10 rounded overflow-hidden border-2 transition-all ${
                      index === currentIndex 
                        ? 'border-primary opacity-100' 
                        : 'border-transparent opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Miniatura ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
