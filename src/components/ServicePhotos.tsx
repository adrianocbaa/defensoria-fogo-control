import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload, X, FileImage } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ServicePhoto {
  id: string;
  url: string;
  description: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface ServicePhotosProps {
  photos: ServicePhoto[];
  onPhotosChange: (photos: ServicePhoto[]) => void;
}

export function ServicePhotos({ photos, onPhotosChange }: ServicePhotosProps) {
  const [description, setDescription] = useState('');
  const { uploadFile, uploading } = useFileUpload();
  const { user } = useAuth();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast.error('Apenas arquivos de imagem são permitidos');
        continue;
      }

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB');
        continue;
      }

      try {
        const result = await uploadFile(file, 'service-photos', 'maintenance');
        
        if (result.url) {
          const newPhoto: ServicePhoto = {
            id: crypto.randomUUID(),
            url: result.url,
            description: description || 'Sem descrição',
            uploadedAt: new Date().toLocaleString('pt-BR'),
            uploadedBy: user.email || 'Usuário'
          };

          onPhotosChange([...photos, newPhoto]);
          toast.success('Foto enviada com sucesso!');
        } else if (result.error) {
          toast.error(result.error);
        }
      } catch (error) {
        toast.error('Erro ao enviar foto');
      }
    }

    // Limpar campos
    setDescription('');
    event.target.value = '';
  };

  const handleCameraCapture = () => {
    // Para dispositivos móveis, o input com capture="environment" abrirá a câmera
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Usar câmera traseira por padrão
    input.onchange = (e) => handleFileSelect(e as any);
    input.click();
  };

  const removePhoto = (photoId: string) => {
    onPhotosChange(photos.filter(photo => photo.id !== photoId));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileImage className="h-4 w-4" />
          Fotos dos Serviços
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload de fotos */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="photo-description">Descrição da Foto</Label>
            <Textarea
              id="photo-description"
              placeholder="Descreva o que mostra na foto..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="file-upload" className="sr-only">
                Selecionar arquivos
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Enviando...' : 'Selecionar Fotos'}
              </Button>
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleCameraCapture}
              disabled={uploading}
            >
              <Camera className="h-4 w-4 mr-2" />
              Câmera
            </Button>
          </div>
        </div>

        {/* Lista de fotos */}
        {photos.length > 0 && (
          <div className="space-y-2">
            <Label>Fotos Enviadas ({photos.length})</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={photo.url}
                      alt={photo.description}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePhoto(photo.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  
                  <div className="mt-1 text-xs text-muted-foreground">
                    <p className="font-medium truncate">{photo.description}</p>
                    <p>{photo.uploadedAt} - {photo.uploadedBy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}