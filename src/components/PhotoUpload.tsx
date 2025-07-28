import React, { useState, useMemo } from 'react';
import { X, Upload, Image, Loader2, Calendar, AlertCircle, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFileUpload } from '@/hooks/useFileUpload';
import { ImageProcessor } from '@/components/ImageProcessor';
import { toast } from 'sonner';

interface PhotoMetadata {
  url: string;
  uploadedAt: string;
  fileName: string;
  monthFolder?: string; // Format: YYYY-MM
}

interface PhotoUploadProps {
  photos: PhotoMetadata[];
  onPhotosChange: (photos: PhotoMetadata[]) => void;
  maxPhotos?: number;
}

// Generate month options for the current year and 6 months before
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  
  for (let i = -6; i <= 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const displayName = date.toLocaleDateString('pt-BR', { 
      month: 'long', 
      year: 'numeric' 
    });
    options.push({ value: yearMonth, label: displayName });
  }
  
  return options;
};

export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 100 }: PhotoUploadProps) {
  const { uploadFile, uploading } = useFileUpload();
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;

    const photoFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    if (photos.length + photoFiles.length > maxPhotos) {
      toast.error(`Máximo de ${maxPhotos} fotos permitidas`);
      return;
    }

    if (!selectedMonth) {
      toast.error('Selecione o mês de referência antes de adicionar fotos.');
      return;
    }

    setProcessing(true);
    const newPhotos: PhotoMetadata[] = [];

    // Process files in batches of 5 to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < photoFiles.length; i += batchSize) {
      const batch = photoFiles.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (file) => {
        try {
          if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error(`Arquivo ${file.name} é muito grande. Máximo: 5MB`);
            return;
          }

          // Process image with watermark
          toast.info(`Processando ${file.name}...`);
          const processedBlob = await ImageProcessor.processImageWithWatermark(file);
          
          // Create a new file from the processed blob
          const processedFile = new File([processedBlob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          // Upload to specific month folder
          const folderPath = `obras/${selectedMonth}`;
          const result = await uploadFile(processedFile, 'service-photos', folderPath);
          
          if (result.error) {
            toast.error(`Erro ao fazer upload de ${file.name}: ${result.error}`);
          } else if (result.url) {
            newPhotos.push({
              url: result.url,
              uploadedAt: new Date().toISOString(),
              fileName: file.name,
              monthFolder: selectedMonth
            });
            toast.success(`Foto ${file.name} processada e enviada com sucesso`);
          }
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          toast.error(`Erro ao processar ${file.name}`);
        }
      }));
      
      // Small delay between batches
      if (i + batchSize < photoFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (newPhotos.length > 0) {
      onPhotosChange([...photos, ...newPhotos]);
      toast.success(`${newPhotos.length} foto${newPhotos.length !== 1 ? 's' : ''} enviada${newPhotos.length !== 1 ? 's' : ''} para pasta ${selectedMonth}`);
    }
    
    setProcessing(false);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // Validação obrigatória antes do drop
    if (!selectedMonth) {
      toast.error('Selecione o mês de referência antes de adicionar fotos');
      return;
    }
    handleFileSelect(e.dataTransfer.files);
  };

  // Group photos by month for organized display
  const photosByMonth = useMemo(() => {
    const grouped = photos.reduce((acc, photo) => {
      const month = photo.monthFolder || selectedMonth;
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(photo);
      return acc;
    }, {} as Record<string, PhotoMetadata[]>);

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a)) // Sort by month descending
      .map(([month, monthPhotos]) => ({
        month,
        monthLabel: new Date(month + '-01').toLocaleDateString('pt-BR', { 
          month: 'long', 
          year: 'numeric' 
        }),
        photos: monthPhotos,
        count: monthPhotos.length
      }));
  }, [photos, selectedMonth]);

  const monthOptions = generateMonthOptions();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Fotos da Obra</label>
        <span className="text-xs text-muted-foreground">
          {photos.length}/{maxPhotos} fotos
        </span>
      </div>

      {/* Month Selection */}
      <div className="space-y-2">
        <Label htmlFor="month-selector" className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          📅 Mês da Pasta *
        </Label>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger id="month-selector">
            <SelectValue placeholder="Selecione o mês para organizar as fotos" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          As fotos serão organizadas na pasta: <code>/obras/{selectedMonth}/</code>
        </p>
      </div>

      {/* Upload Area */}
      <Card 
        className={`border-dashed transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="p-3 rounded-full bg-muted">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Adicionar fotos</p>
              <p className="text-xs text-muted-foreground">
                Arraste e solte ou clique para selecionar
              </p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id="photo-upload"
              disabled={uploading || processing || photos.length >= maxPhotos}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading || processing || photos.length >= maxPhotos || !selectedMonth}
              onClick={() => document.getElementById('photo-upload')?.click()}
              className="flex items-center gap-2"
            >
              {uploading || processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Image className="h-4 w-4" />
              )}
              {uploading || processing ? 'Processando...' : 'Selecionar Fotos'}
            </Button>
            {!selectedMonth && (
              <p className="text-xs text-destructive mt-1">
                Selecione um mês antes de fazer upload das fotos
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Alert */}
      {!selectedMonth && photos.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Selecione o mês de referência antes de adicionar fotos para organização adequada.
          </AlertDescription>
        </Alert>
      )}

      {/* Photo Gallery Grouped by Month */}
      {photosByMonth.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Fotos Organizadas por Mês</span>
          </div>
          
          {photosByMonth.map((monthGroup) => (
            <Card key={monthGroup.month}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {monthGroup.monthLabel}
                  </div>
                  <span className="text-sm font-normal text-muted-foreground">
                    {monthGroup.count} foto{monthGroup.count !== 1 ? 's' : ''}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {monthGroup.photos.map((photo, photoIndex) => {
                    const globalIndex = photos.findIndex(p => p.url === photo.url);
                    return (
                      <div key={photoIndex} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                          <img
                            src={photo.url}
                            alt={`${monthGroup.monthLabel} - Foto ${photoIndex + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removePhoto(globalIndex)}
                        >
                          <X className="h-2 w-2" />
                        </Button>
                        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                          {new Date(photo.uploadedAt).toLocaleDateString('pt-BR', { 
                            day: '2-digit'
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {photos.length === 0 && selectedMonth && (
        <Card>
          <CardContent className="p-6 text-center">
            <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">Nenhuma foto adicionada</p>
            <p className="text-xs text-muted-foreground">
              Pasta de destino selecionada: <code>/obras/{selectedMonth}/</code>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}