import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Upload, X, Loader2, ImageIcon, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ImageProcessor } from '@/components/ImageProcessor';
import { Dialog, DialogContent } from '@/components/ui/dialog';

type UploadStatus = 'uploading' | 'done' | 'error';
interface UploadItem {
  id: string;
  name: string;
  previewUrl: string;
  status: UploadStatus;
  error?: string;
}

export interface TaskPhoto {
  id: string;
  url: string;
  path: string;
  description?: string;
  uploaded_at: string;
  uploaded_by?: string | null;
  uploaded_by_name?: string | null;
}

interface Props {
  photos: TaskPhoto[];
  onChange: (photos: TaskPhoto[]) => void;
  /**
   * 'reference' — foto de briefing (fiscal → manutenção), sem marca d'água.
   * 'execution' — comprovação de execução (manutenção → fiscal), com marca d'água SIDIF.
   */
  mode?: 'reference' | 'execution';
  disabled?: boolean;
  /** Somente leitura: exibe fotos, sem controles de upload/remover. */
  readOnly?: boolean;
  /** Pasta lógica para organizar no bucket. */
  folder?: string;
  /** Label opcional. */
  label?: string;
  /** Compacto: sem título/label externo. */
  compact?: boolean;
}

function sanitize(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Redesenha a imagem em um canvas e devolve um Blob JPEG.
 * Resolve dois problemas no celular:
 * - iPhone envia HEIC/HEIF, que o bucket rejeita.
 * - Alguns navegadores mandam mime vazio ao usar a câmera.
 * Reduz também para no máximo 2560px no lado maior.
 */
async function normalizeToJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = (e) => reject(e);
      el.src = url;
    });
    const maxSide = 2560;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d indisponível');
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob vazio'))),
        'image/jpeg',
        0.9,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function TaskPhotoUploader({
  photos,
  onChange,
  mode = 'reference',
  disabled = false,
  readOnly = false,
  folder = 'maintenance',
  label,
  compact = false,
}: Props) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<TaskPhoto | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const applyWatermark = mode === 'execution';

  const updateQueueItem = (id: string, patch: Partial<UploadItem>) => {
    setUploadQueue((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      console.warn('[TaskPhotoUploader] Nenhum arquivo selecionado.');
      return;
    }
    if (!user) {
      toast({
        title: 'Sessão expirada',
        description: 'Faça login novamente para enviar fotos.',
        variant: 'destructive',
      });
      return;
    }
    setUploading(true);

    // Build initial queue with local previews
    const queueItems: (UploadItem & { file: File })[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      status: 'uploading' as UploadStatus,
      file,
    }));
    setUploadQueue((prev) => [...prev, ...queueItems.map(({ file: _f, ...rest }) => rest)]);

    const newPhotos: TaskPhoto[] = [];
    let userName: string | null = null;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      userName = profile?.display_name ?? user.email ?? null;
    } catch { /* ignore */ }

    for (let i = 0; i < queueItems.length; i++) {
      const item = queueItems[i];
      const file = item.file;
      if (!file.type.startsWith('image/')) {
        updateQueueItem(item.id, { status: 'error', error: 'Tipo inválido' });
        toast({ title: 'Tipo inválido', description: `${file.name} não é imagem.`, variant: 'destructive' });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        updateQueueItem(item.id, { status: 'error', error: 'Arquivo > 10MB' });
        toast({ title: 'Arquivo muito grande', description: `${file.name} passa de 10MB.`, variant: 'destructive' });
        continue;
      }
      try {
        let blob: Blob = file;
        let contentType = 'image/jpeg';
        if (applyWatermark) {
          try {
            blob = await ImageProcessor.processImageWithWatermark(file);
          } catch (err) {
            console.warn('Falha ao aplicar marca d\'água, normalizando sem marca', err);
            blob = await normalizeToJpeg(file);
          }
        } else {
          try {
            blob = await normalizeToJpeg(file);
          } catch (err) {
            console.warn('Falha ao normalizar imagem, enviando original', err);
            blob = file;
            contentType = file.type || 'image/jpeg';
          }
        }
        const cleanName = sanitize(file.name).replace(/\.(heic|heif|HEIC|HEIF)$/i, '.jpg');
        const path = `${folder}/${user.id}/${mode}/${Date.now()}_${i}_${cleanName}`;
        console.log('[TaskPhotoUploader] Upload iniciado', { path, size: blob.size, contentType });
        const { error: upErr } = await supabase.storage
          .from('service-photos')
          .upload(path, blob, { upsert: false, contentType });
        if (upErr) {
          console.error('[TaskPhotoUploader] Erro no upload storage:', upErr);
          throw upErr;
        }
        const { data: pub } = supabase.storage.from('service-photos').getPublicUrl(path);
        newPhotos.push({
          id: crypto.randomUUID(),
          url: pub.publicUrl,
          path,
          uploaded_at: new Date().toISOString(),
          uploaded_by: user.id,
          uploaded_by_name: userName,
        });
        updateQueueItem(item.id, { status: 'done' });
      } catch (err: any) {
        console.error('[TaskPhotoUploader] Erro no upload:', err);
        const msg = err?.message ?? err?.error ?? 'Falha ao enviar foto.';
        updateQueueItem(item.id, { status: 'error', error: String(msg) });
        toast({
          title: 'Erro no upload',
          description: String(msg),
          variant: 'destructive',
        });
      }
    }
    if (newPhotos.length > 0) {
      onChange([...photos, ...newPhotos]);
      toast({
        title: 'Fotos enviadas',
        description: `${newPhotos.length} foto(s) adicionada(s). Lembre-se de clicar em SALVAR para gravar as fotos no procedimento.`,
      });
    }
    setUploading(false);

    // Auto-clear successful items after a short delay; keep errors visible
    setTimeout(() => {
      setUploadQueue((prev) => {
        const toRevoke = prev.filter((it) => it.status === 'done' && queueItems.some((q) => q.id === it.id));
        toRevoke.forEach((it) => URL.revokeObjectURL(it.previewUrl));
        return prev.filter((it) => !(it.status === 'done' && queueItems.some((q) => q.id === it.id)));
      });
    }, 2500);
  };

  const dismissQueueItem = (id: string) => {
    setUploadQueue((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
  };

  const removePhoto = async (photo: TaskPhoto) => {
    onChange(photos.filter(p => p.id !== photo.id));
    if (photo.path) {
      try {
        await supabase.storage.from('service-photos').remove([photo.path]);
      } catch (err) {
        console.warn('Não foi possível apagar do storage:', err);
      }
    }
  };


  const removePhoto = async (photo: TaskPhoto) => {
    onChange(photos.filter(p => p.id !== photo.id));
    if (photo.path) {
      try {
        await supabase.storage.from('service-photos').remove([photo.path]);
      } catch (err) {
        console.warn('Não foi possível apagar do storage:', err);
      }
    }
  };

  const showControls = !readOnly && !disabled;
  const badgeText = mode === 'execution' ? 'Execução' : 'Referência';
  const badgeClass = mode === 'execution'
    ? 'bg-emerald-600 text-white'
    : 'bg-amber-500 text-white';

  return (
    <div className="space-y-2">
      {label && !compact && (
        <div className="flex items-center gap-2">
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeClass}`}>{badgeText}</span>
        </div>
      )}

      {showControls && (
        <div className="flex gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }}
          />
          <Input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Camera className="h-3.5 w-3.5 mr-1.5" />}
            Câmera
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Enviar
          </Button>
        </div>
      )}

      {photos.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">
          {readOnly ? 'Nenhuma foto anexada.' : 'Nenhuma foto ainda. Use câmera ou envie do dispositivo.'}
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
              <img
                src={photo.url}
                alt={photo.description ?? 'foto'}
                className="w-full h-full object-cover cursor-pointer"
                loading="lazy"
                onClick={() => setPreview(photo)}
              />
              <button
                type="button"
                onClick={() => setPreview(photo)}
                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors"
                aria-label="Ver foto"
              >
                <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100" />
              </button>
              {showControls && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-80"
                  onClick={(e) => { e.stopPropagation(); removePhoto(photo); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              {photo.uploaded_by_name && (
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate">
                  {photo.uploaded_by_name}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          {preview && (
            <div className="space-y-2">
              <img src={preview.url} alt="Foto" className="w-full max-h-[70vh] object-contain rounded" />
              <div className="text-xs text-muted-foreground">
                {preview.uploaded_by_name && <>Enviada por <strong>{preview.uploaded_by_name}</strong> · </>}
                {new Date(preview.uploaded_at).toLocaleString('pt-BR')}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
