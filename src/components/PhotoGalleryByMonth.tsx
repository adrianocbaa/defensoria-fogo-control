import React, { useState, useMemo } from 'react';
import { ChevronRight, Image, Calendar, FolderOpen, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageGallery } from '@/components/ImageGallery';

interface PhotoMetadata {
  url: string;
  uploadedAt: string;
  fileName: string;
}

interface PhotosByMonth {
  month: string;
  year: string;
  monthYear: string;
  photos: PhotoMetadata[];
  count: number;
}

interface PhotoGalleryByMonthProps {
  photos: PhotoMetadata[];
  maxRecentPhotos?: number;
}

export function PhotoGalleryByMonth({ photos, maxRecentPhotos = 20 }: PhotoGalleryByMonthProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentViewPhotos, setCurrentViewPhotos] = useState<string[]>([]);

  // Group photos by month
  const photosByMonth = useMemo(() => {
    const grouped = photos.reduce((acc, photo) => {
      const date = new Date(photo.uploadedAt);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase();
      
      if (!acc[monthYear]) {
        acc[monthYear] = {
          month: date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
          year: date.getFullYear().toString(),
          monthYear: monthName,
          photos: [],
          count: 0
        };
      }
      
      acc[monthYear].photos.push(photo);
      acc[monthYear].count++;
      
      return acc;
    }, {} as Record<string, PhotosByMonth>);

    // Sort by date (most recent first)
    return Object.values(grouped).sort((a, b) => b.monthYear.localeCompare(a.monthYear));
  }, [photos]);

  // Get most recent photos
  const recentPhotos = useMemo(() => {
    if (photosByMonth.length === 0) return [];
    return photosByMonth[0].photos.slice(0, maxRecentPhotos);
  }, [photosByMonth, maxRecentPhotos]);

  const currentMonth = photosByMonth[0]?.monthYear || '';

  const openGallery = (photos: PhotoMetadata[], index: number) => {
    setCurrentViewPhotos(photos.map(p => p.url));
    setSelectedImageIndex(index);
    setGalleryOpen(true);
  };

  const openMonthGallery = (monthData: PhotosByMonth, index: number = 0) => {
    setCurrentViewPhotos(monthData.photos.map(p => p.url));
    setSelectedImageIndex(index);
    setGalleryOpen(true);
  };

  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma foto cadastrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with current month indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="font-medium">Álbum de Fotos</span>
          {currentMonth && (
            <Badge variant="outline" className="ml-2">
              Visualizando {currentMonth}
            </Badge>
          )}
        </div>
        
        {photosByMonth.length > 1 && (
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Escolher mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Mais recente</SelectItem>
                {photosByMonth.map((monthData) => (
                  <SelectItem key={monthData.monthYear} value={monthData.monthYear}>
                    {monthData.monthYear} ({monthData.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Ver por mês
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Álbum por Mês</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-3">
                  {photosByMonth.map((monthData) => (
                    <Card 
                      key={monthData.monthYear} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => openMonthGallery(monthData)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <FolderOpen className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{monthData.monthYear}</p>
                              <p className="text-sm text-muted-foreground">
                                {monthData.count} foto{monthData.count !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        
                        {/* Mini preview */}
                        <div className="mt-3 grid grid-cols-4 gap-1">
                          {monthData.photos.slice(0, 4).map((photo, index) => (
                            <div key={index} className="aspect-square rounded overflow-hidden bg-muted">
                              <img
                                src={photo.url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>

      {/* Main photo grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {(selectedMonth ? 
          photosByMonth.find(m => m.monthYear === selectedMonth)?.photos || [] : 
          recentPhotos
        ).map((photo, index) => (
          <div 
            key={index}
            className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
            onClick={() => openGallery(
              selectedMonth ? 
                photosByMonth.find(m => m.monthYear === selectedMonth)?.photos || [] : 
                recentPhotos, 
              index
            )}
          >
            <img 
              src={photo.url} 
              alt={`Foto ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button variant="secondary" size="sm" className="shadow-lg pointer-events-none">
                <Eye className="h-3 w-3 mr-1" />
                Ver
              </Button>
            </div>
            
            {/* Date badge */}
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {new Date(photo.uploadedAt).toLocaleDateString('pt-BR', { 
                day: '2-digit',
                month: 'short' 
              }).toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* Show more photos indicator */}
      {!selectedMonth && photosByMonth.length > 0 && photosByMonth[0].photos.length > maxRecentPhotos && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Mostrando {recentPhotos.length} de {photosByMonth[0].photos.length} fotos de {currentMonth}
          </p>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <FolderOpen className="h-4 w-4 mr-2" />
                Ver todas as fotos ({photosByMonth[0].photos.length - maxRecentPhotos} restantes)
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Todas as fotos de {currentMonth}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 grid grid-cols-2 gap-2">
                {photosByMonth[0].photos.map((photo, index) => (
                  <div 
                    key={index}
                    className="aspect-square rounded overflow-hidden cursor-pointer"
                    onClick={() => openMonthGallery(photosByMonth[0], index)}
                  >
                    <img
                      src={photo.url}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-110 transition-transform"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Total photos summary */}
      {photosByMonth.length > 1 && (
        <div className="text-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Total: {photos.length} fotos em {photosByMonth.length} mês{photosByMonth.length !== 1 ? 'es' : ''}
          </p>
        </div>
      )}

      {/* Image Gallery Modal */}
      <ImageGallery
        images={currentViewPhotos}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialIndex={selectedImageIndex}
      />
    </div>
  );
}