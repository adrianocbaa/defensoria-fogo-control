import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Image, Calendar, FolderOpen, Eye, Trash2, Star, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ImageGallery } from '@/components/ImageGallery';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface PhotoMetadata {
  url: string;
  uploadedAt: string;
  fileName: string;
  monthFolder?: string; // Format: YYYY-MM
  isCover?: boolean;
}

interface PhotosByMonth {
  month: string;
  year: string;
  monthYear: string;
  monthFolder: string; // Original YYYY-MM format
  photos: PhotoMetadata[];
  count: number;
}

interface PhotoGalleryCollapsibleProps {
  photos: PhotoMetadata[];
  onPhotoRemove?: (photoUrl: string) => void;
  onSetCover?: (photoUrl: string) => void;
  onEditAlbumDate?: (oldMonthFolder: string, newMonthFolder: string) => void;
  isEditing?: boolean;
}

export function PhotoGalleryCollapsible({ 
  photos, 
  onPhotoRemove,
  onSetCover,
  onEditAlbumDate,
  isEditing = false 
}: PhotoGalleryCollapsibleProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentViewPhotos, setCurrentViewPhotos] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMonthFolder, setEditingMonthFolder] = useState('');
  const [newMonth, setNewMonth] = useState('');
  const [newYear, setNewYear] = useState('');
  
  // Group photos by month using monthFolder (selected by user)
  const photosByMonth = useMemo(() => {
    const grouped = photos.reduce((acc, photo) => {
      // SEMPRE usar monthFolder se existir, senão pular a foto
      const monthYear = photo.monthFolder;
      if (!monthYear) return acc; // Ignorar fotos sem monthFolder
      
      // Parse month string (YYYY-MM) corretamente
      const [year, monthNum] = monthYear.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase();
      
      if (!acc[monthYear]) {
        acc[monthYear] = {
          month: date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
          year: date.getFullYear().toString(),
          monthYear: monthName,
          monthFolder: monthYear, // Store original YYYY-MM format
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
      return b.monthFolder.localeCompare(a.monthFolder);
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

  const handleEditAlbumDate = (monthFolder: string) => {
    const [year, month] = monthFolder.split('-');
    setEditingMonthFolder(monthFolder);
    setNewMonth(month);
    setNewYear(year);
    setEditDialogOpen(true);
  };

  const handleSaveAlbumDate = () => {
    if (!newMonth || !newYear) {
      toast.error('Selecione mês e ano');
      return;
    }

    const newMonthFolder = `${newYear}-${newMonth}`;
    
    if (onEditAlbumDate) {
      onEditAlbumDate(editingMonthFolder, newMonthFolder);
    }
    
    setEditDialogOpen(false);
    toast.success('Data do álbum atualizada com sucesso');
  };

  // Generate month and year options
  const months = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i + 1);

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
            <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-3 flex-1 cursor-pointer">
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
              </CollapsibleTrigger>
              <div className="flex items-center gap-2">
                {isEditing && onEditAlbumDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAlbumDate(monthData.monthFolder);
                    }}
                    className="h-8"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                )}
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
            
            <CollapsibleContent>
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {monthData.photos.map((photo, index) => (
                    <div 
                      key={index}
                      className={`relative aspect-square rounded-lg overflow-hidden group ${photo.isCover ? 'ring-2 ring-primary' : ''}`}
                    >
                      <img 
                        src={photo.url} 
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 cursor-pointer"
                        loading="lazy"
                        onClick={() => openGallery(monthData.photos, index)}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                      
                      {/* Cover badge */}
                      {photo.isCover && (
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Capa
                        </div>
                      )}
                      
                      {/* Action buttons overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex gap-2">
                          <Button 
                            type="button"
                            variant="secondary" 
                            size="sm" 
                            className="shadow-lg"
                            onClick={() => openGallery(monthData.photos, index)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {isEditing && onSetCover && !photo.isCover && (
                            <Button 
                              type="button"
                              variant="default" 
                              size="sm" 
                              className="shadow-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSetCover(photo.url);
                              }}
                            >
                              <Star className="h-3 w-3" />
                            </Button>
                          )}
                          {isEditing && onPhotoRemove && (
                            <Button 
                              type="button"
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

      {/* Edit Album Date Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Data do Álbum</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mês</label>
              <Select value={newMonth} onValueChange={setNewMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ano</label>
              <Select value={newYear} onValueChange={setNewYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAlbumDate}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}