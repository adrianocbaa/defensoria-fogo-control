import React, { useState } from 'react';
import { Upload, Image, Loader2, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  isCover?: boolean; // Marca se é a foto de capa
}

interface PhotoUploadProps {
  photos: PhotoMetadata[];
  onPhotosChange: (photos: PhotoMetadata[]) => void;
  maxPhotos?: number;
  onSetCover?: (photoIndex: number) => void;
}

// Generate year options (current year and +/- 3 years)
const generateYearOptions = () => {
  const options = [];
  const currentYear = new Date().getFullYear();
  
  for (let i = -3; i <= 3; i++) {
    const year = currentYear + i;
    options.push({ value: year.toString(), label: year.toString() });
  }
  
  return options;
};

// Month names in Portuguese
const monthOptions = [
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

export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 100, onSetCover }: PhotoUploadProps) {
  const { uploadFile, uploading } = useFileUpload();
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => {
    return new Date().getFullYear().toString();
  });
  const [selectedMonthNum, setSelectedMonthNum] = useState(() => {
    return String(new Date().getMonth() + 1).padStart(2, '0');
  });
  
  // Combine year and month into the expected format
  const selectedMonth = `${selectedYear}-${selectedMonthNum}`;

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
              monthFolder: selectedMonth // SEMPRE usar o mês selecionado pelo usuário
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

  const yearOptions = generateYearOptions();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Fotos da Obra</label>
        <span className="text-xs text-muted-foreground">
          {photos.length}/{maxPhotos} fotos
        </span>
      </div>

      {/* Month and Year Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          📅 Mês e Ano da Pasta *
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="month-selector" className="text-xs text-muted-foreground mb-1 block">
              Mês
            </Label>
            <Select value={selectedMonthNum} onValueChange={setSelectedMonthNum}>
              <SelectTrigger id="month-selector">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="year-selector" className="text-xs text-muted-foreground mb-1 block">
              Ano
            </Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger id="year-selector">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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

      {/* Photos Grid with Cover Selection */}
      {photos.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Fotos Enviadas ({photos.length})
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <div className={`relative aspect-video rounded-lg overflow-hidden border-2 ${photo.isCover ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}>
                  <img 
                    src={photo.url} 
                    alt={photo.fileName}
                    className="w-full h-full object-cover"
                  />
                  {photo.isCover && (
                    <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                      Capa
                    </div>
                  )}
                  {onSetCover && !photo.isCover && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white hover:bg-black/70"
                      onClick={() => onSetCover(index)}
                    >
                      Definir como Capa
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate" title={photo.fileName}>
                  {photo.fileName}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {photos.some(p => p.isCover) 
              ? 'A foto marcada como "Capa" será exibida na visualização principal da obra.' 
              : 'Clique em uma foto para defini-la como capa da obra.'}
          </p>
        </div>
      )}
    </div>
  );
}