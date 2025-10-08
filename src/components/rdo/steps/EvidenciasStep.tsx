import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Video, FileUp, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useDebounce } from "@/hooks/useDebounce";

interface Media {
  id: string;
  tipo: 'foto' | 'video' | 'anexo';
  file_url: string;
  thumb_url?: string;
  descricao?: string;
}

interface EvidenciasStepProps {
  reportId?: string;
  obraId: string;
  data: string;
}

export function EvidenciasStep({ reportId, obraId, data }: EvidenciasStepProps) {
  const queryClient = useQueryClient();
  const { uploadFile, uploading } = useFileUpload();
  const [activeTab, setActiveTab] = useState<'foto' | 'video' | 'anexo'>('foto');
  const [localDescriptions, setLocalDescriptions] = useState<Record<string, string>>({});
  const debouncedDescriptions = useDebounce(localDescriptions, 500);

  const { data: media = [], isLoading } = useQuery({
    queryKey: ['rdo-media', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('rdo_media')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Media[];
    },
    enabled: !!reportId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rdo_media')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-media', reportId] });
      toast.success('Arquivo removido');
    },
  });

  const updateDescMutation = useMutation({
    mutationFn: async ({ id, descricao }: { id: string; descricao: string }) => {
      const { error } = await supabase
        .from('rdo_media')
        .update({ descricao })
        .eq('id', id);
      
      if (error) throw error;
    },
    onMutate: async (variables: { id: string; descricao: string }) => {
      await queryClient.cancelQueries({ queryKey: ['rdo-media', reportId] });
      const previous = queryClient.getQueryData<Media[]>(['rdo-media', reportId]);
      if (previous) {
        const next = previous.map((m) =>
          m.id === variables.id ? { ...m, descricao: variables.descricao } : m
        );
        queryClient.setQueryData(['rdo-media', reportId], next);
      }
      return { previous, id: variables.id };
    },
    onError: (_err, _variables, context) => {
      if ((context as any)?.previous) {
        queryClient.setQueryData(['rdo-media', reportId], (context as any).previous);
      }
      toast.error('Não foi possível salvar a descrição.');
    },
    onSuccess: (_data, variables) => {
      const { id } = variables as { id: string; descricao: string };
      setLocalDescriptions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-media', reportId] });
    },
  });

  useEffect(() => {
    Object.entries(debouncedDescriptions).forEach(([id, descricao]) => {
      updateDescMutation.mutate({ id, descricao });
    });
  }, [debouncedDescriptions]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'foto' | 'video' | 'anexo') => {
    if (!reportId) {
      toast.error('Salve o RDO antes de adicionar evidências');
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    let successCount = 0;
    let errorCount = 0;

    for (const file of filesArray) {
      // Validações
      if (tipo === 'video') {
        if (!file.type.includes('video')) {
          toast.error(`${file.name}: Apenas arquivos de vídeo são permitidos`);
          errorCount++;
          continue;
        }
        if (file.size > 100 * 1024 * 1024) {
          toast.error(`${file.name}: Vídeo deve ter no máximo 100MB`);
          errorCount++;
          continue;
        }
      } else if (tipo === 'foto') {
        if (!file.type.includes('image')) {
          toast.error(`${file.name}: Apenas arquivos de imagem são permitidos`);
          errorCount++;
          continue;
        }
      }

      const folder = `rdo-media/${obraId}/${reportId}/${data}`;
      const result = await uploadFile(file, 'service-photos', folder);

      if (result.error) {
        toast.error(`${file.name}: ${result.error}`);
        errorCount++;
        continue;
      }

      // Salvar no banco
      const { error } = await supabase.from('rdo_media').insert([{
        report_id: reportId,
        tipo,
        file_url: result.url!,
        thumb_url: tipo === 'foto' ? result.url : undefined,
      }] as any);

      if (error) {
        toast.error(`${file.name}: Erro ao salvar evidência`);
        errorCount++;
        continue;
      }

      successCount++;
    }

    queryClient.invalidateQueries({ queryKey: ['rdo-media', reportId] });
    
    if (successCount > 0) {
      toast.success(`${successCount} arquivo(s) enviado(s) com sucesso`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} arquivo(s) com erro`);
    }

    // Reset input
    e.target.value = '';
  };

  const fotos = media.filter((m) => m.tipo === 'foto');
  const videos = media.filter((m) => m.tipo === 'video');
  const anexos = media.filter((m) => m.tipo === 'anexo');

  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Evidências</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Evidências (Fotos, Vídeos e Anexos)</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="foto">
              <Camera className="h-4 w-4 mr-2" />
              Fotos ({fotos.length})
            </TabsTrigger>
            <TabsTrigger value="video">
              <Video className="h-4 w-4 mr-2" />
              Vídeos ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="anexo">
              <FileUp className="h-4 w-4 mr-2" />
              Anexos ({anexos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="foto" className="space-y-4">
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileUpload(e, 'foto')}
                className="hidden"
                id="upload-foto"
                disabled={uploading}
              />
              <label htmlFor="upload-foto">
                <Button asChild disabled={uploading}>
                  <span>
                    <Camera className="h-4 w-4 mr-2" />
                    {uploading ? 'Enviando...' : 'Adicionar Fotos'}
                  </span>
                </Button>
              </label>
            </div>

            {fotos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma foto adicionada
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {fotos.map((foto) => (
                  <div key={foto.id} className="space-y-2">
                    <div className="relative aspect-square rounded-lg overflow-hidden border">
                      <img
                        src={foto.thumb_url || foto.file_url}
                        alt="Foto RDO"
                        className="object-cover w-full h-full"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => deleteMutation.mutate(foto.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Descrição..."
                      value={(localDescriptions[foto.id] ?? foto.descricao) || ''}
                      onChange={(e) =>
                        setLocalDescriptions(prev => ({ ...prev, [foto.id]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="video" className="space-y-4">
            <div>
              <input
                type="file"
                accept="video/*"
                multiple
                onChange={(e) => handleFileUpload(e, 'video')}
                className="hidden"
                id="upload-video"
                disabled={uploading}
              />
              <label htmlFor="upload-video">
                <Button asChild disabled={uploading}>
                  <span>
                    <Video className="h-4 w-4 mr-2" />
                    {uploading ? 'Enviando...' : 'Adicionar Vídeos (max 100MB cada)'}
                  </span>
                </Button>
              </label>
            </div>

            {videos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum vídeo adicionado
              </div>
            ) : (
              <div className="space-y-3">
                {videos.map((video) => (
                  <div key={video.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <a
                        href={video.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2"
                      >
                        <Video className="h-4 w-4" />
                        Ver vídeo
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(video.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Descrição..."
                      value={(localDescriptions[video.id] ?? video.descricao) || ''}
                      onChange={(e) =>
                        setLocalDescriptions(prev => ({ ...prev, [video.id]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="anexo" className="space-y-4">
            <div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                multiple
                onChange={(e) => handleFileUpload(e, 'anexo')}
                className="hidden"
                id="upload-anexo"
                disabled={uploading}
              />
              <label htmlFor="upload-anexo">
                <Button asChild disabled={uploading}>
                  <span>
                    <FileUp className="h-4 w-4 mr-2" />
                    {uploading ? 'Enviando...' : 'Adicionar Anexos'}
                  </span>
                </Button>
              </label>
            </div>

            {anexos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum anexo adicionado
              </div>
            ) : (
              <div className="space-y-3">
                {anexos.map((anexo) => (
                  <div key={anexo.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <a
                        href={anexo.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2"
                      >
                        <FileUp className="h-4 w-4" />
                        Abrir arquivo
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(anexo.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Descrição..."
                      value={(localDescriptions[anexo.id] ?? anexo.descricao) || ''}
                      onChange={(e) =>
                        setLocalDescriptions(prev => ({ ...prev, [anexo.id]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
