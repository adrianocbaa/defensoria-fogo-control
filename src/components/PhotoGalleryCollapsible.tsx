import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Image, Calendar, FolderOpen, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ImageGallery } from '@/components/ImageGallery';

interface PhotoMetadata {
  url: string;
  uploadedAt: string;
  fileName: string;
  monthFolder?: string; // Format: YYYY-MM
}

interface PhotosByMonth {
  month: string;
  year: string;
  monthYear: string;
  photos: PhotoMetadata[];
  count: number;
}

interface PhotoGalleryCollapsibleProps {
  photos: PhotoMetadata[];
  onPhotoRemove?: (photoUrl: string) => void;
  isEditing?: boolean;
}

export function PhotoGalleryCollapsible({ 
  photos, 
  onPhotoRemove, 
  isEditing = false 
}: PhotoGalleryCollapsibleProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentViewPhotos, setCurrentViewPhotos] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Group photos by month using monthFolder (selected by user)
  const photosByMonth = useMemo(() => {
    const grouped = photos.reduce((acc, photo) => {
      // SEMPRE usar monthFolder se existir, senão pular a foto
      const monthYear = photo.monthFolder;
      if (!monthYear) return acc; // Ignorar fotos sem monthFolder
      
      const date = new Date(monthYear + '-01'); // Parse YYYY-MM format
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
    return Object.values(grouped).sort((a, b) => {
      const aDate = Object.keys(grouped).find(key => grouped[key].monthYear === a.monthYear) || '';
      const bDate = Object.keys(grouped).find(key => grouped[key].monthYear === b.monthYear) || '';
      return bDate.localeCompare(aDate);
    });
  }, [photos]);

  const openGallery = (photos: PhotoMetadata[], index: number) => {
    setCurrentViewPhotos(photos.map(p => p.url));
    setSelectedImageIndex(index);
    setGalleryOpen(true);
  };

  const toggleFolder = (monthYear: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(monthYear)) {
      newExpanded.delete(monthYear);
    } else {
      newExpanded.add(monthYear);
    }
    setExpandedFolders(newExpanded);
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
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-primary" />
        <span className="font-medium">Álbum de Fotos</span>
        <Badge variant="outline">
          {photos.length} foto{photos.length !== 1 ? 's' : ''} em {photosByMonth.length} pasta{photosByMonth.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {photosByMonth.map((monthData) => (
        <Card key={monthData.monthYear} className="overflow-hidden">
          <Collapsible 
            open={expandedFolders.has(monthData.monthYear)}
            onOpenChange={() => toggleFolder(monthData.monthYear)}
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
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
                <div className="flex items-center gap-2">
                  {/* Mini preview thumbnails */}
                  <div className="flex gap-1">
                    {monthData.photos.slice(0, 3).map((photo, index) => (
                      <div key={index} className="w-8 h-8 rounded overflow-hidden bg-muted">
                        <img
                          src={photo.url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                    {monthData.count > 3 && (
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        <span className="text-xs">+{monthData.count - 3}</span>
                      </div>
                    )}
                  </div>
                  {expandedFolders.has(monthData.monthYear) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {monthData.photos.map((photo, index) => (
                    <div 
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden group"
                    >
                      <img 
                        src={photo.url} 
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 cursor-pointer"
                        loading="lazy"
                        onClick={() => openGallery(monthData.photos, index)}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                      
                      {/* Action buttons overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex gap-2">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="shadow-lg"
                            onClick={() => openGallery(monthData.photos, index)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {isEditing && onPhotoRemove && (
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="shadow-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPhotoRemove(photo.url);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
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
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}

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