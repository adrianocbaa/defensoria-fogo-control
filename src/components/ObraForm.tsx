import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { MapPin, Upload } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { MapSelector } from './MapSelector';
import { PhotoUpload } from './PhotoUpload';
import { DocumentsUpload } from './DocumentsUpload';
import { PhotoGalleryCollapsible } from './PhotoGalleryCollapsible';

const obraSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  municipio: z.string().min(1, 'Município é obrigatório'),
  n_contrato: z.string().min(1, 'Número do contrato é obrigatório'),
  status: z.enum(['planejamento', 'em_andamento', 'concluida', 'paralisada']),
  tipo: z.enum(['Reforma', 'Construção']),
  valor_total: z.number().min(0, 'Valor deve ser positivo'),
  valor_aditivado: z.number().min(0).optional(),
  valor_executado: z.number().min(0).optional(),
  data_inicio: z.string().optional(),
  previsao_termino: z.string().optional(),
  empresa_responsavel: z.string().optional(),
  secretaria_responsavel: z.string().optional(),
  coordinates_lat: z.number().optional(),
  coordinates_lng: z.number().optional(),
});

type ObraFormData = z.infer<typeof obraSchema>;

interface Document {
  name: string;
  type: string;
  url: string;
}

interface ObraFormProps {
  obraId?: string;
  initialData?: Partial<ObraFormData> & {
    fotos?: string[];
    documentos?: Document[];
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const statusOptions = [
  { value: 'planejamento', label: 'Planejamento' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'paralisada', label: 'Paralisada' },
];

const tipoOptions = ['Reforma', 'Construção'];

export function ObraForm({ obraId, initialData, onSuccess, onCancel }: ObraFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [photos, setPhotos] = useState<Array<{url: string; uploadedAt: string; fileName: string; monthFolder?: string}>>(
    initialData?.fotos?.map(url => {
      // Extrair monthFolder da URL se possível (formato: /obras/YYYY-MM/)
      const monthMatch = url.match(/\/obras\/(\d{4}-\d{2})\//);
      return {
        url,
        uploadedAt: new Date().toISOString(),
        fileName: url.split('/').pop() || '',
        monthFolder: monthMatch ? monthMatch[1] : undefined
      };
    }) || []
  );
  const [documents, setDocuments] = useState<Document[]>(initialData?.documentos || []);

  const form = useForm<ObraFormData>({
    resolver: zodResolver(obraSchema),
    defaultValues: {
      nome: initialData?.nome || '',
      municipio: initialData?.municipio || '',
      n_contrato: initialData?.n_contrato || '',
      status: initialData?.status || 'planejamento',
      tipo: (initialData?.tipo as "Reforma" | "Construção") || 'Reforma',
      valor_total: initialData?.valor_total || 0,
      valor_aditivado: (initialData as any)?.valor_aditivado || 0,
      valor_executado: initialData?.valor_executado || 0,
      data_inicio: initialData?.data_inicio || '',
      previsao_termino: initialData?.previsao_termino || '',
      empresa_responsavel: initialData?.empresa_responsavel || '',
      secretaria_responsavel: initialData?.secretaria_responsavel || '',
      coordinates_lat: initialData?.coordinates_lat,
      coordinates_lng: initialData?.coordinates_lng,
    },
  });

  const handleLocationSelect = (lat: number, lng: number) => {
    form.setValue('coordinates_lat', lat);
    form.setValue('coordinates_lng', lng);
    setShowMapSelector(false);
    toast.success('Localização selecionada com sucesso');
  };

  const onSubmit = async (data: ObraFormData) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const obraData: any = {
        nome: data.nome,
        municipio: data.municipio,
        n_contrato: data.n_contrato,
        status: data.status,
        tipo: data.tipo,
        valor_total: data.valor_total,
        valor_aditivado: data.valor_aditivado || 0,
        valor_executado: data.valor_executado || 0,
        data_inicio: data.data_inicio || null,
        previsao_termino: data.previsao_termino || null,
        empresa_responsavel: data.empresa_responsavel || null,
        secretaria_responsavel: data.secretaria_responsavel || null,
        coordinates_lat: data.coordinates_lat || null,
        coordinates_lng: data.coordinates_lng || null,
        fotos: photos.map(p => p.url),
        documentos: documents,
        created_by: user.id,
      };

      if (obraId && obraId !== 'nova') {
        // Atualizar obra existente
        const { error } = await supabase
          .from('obras')
          .update(obraData)
          .eq('id', obraId);

        if (error) throw error;
        toast.success('Obra atualizada com sucesso!');
      } else {
        // Criar nova obra
        const { error } = await supabase
          .from('obras')
          .insert([obraData]);

        if (error) throw error;
        toast.success('Obra criada com sucesso!');
      }

      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar obra:', error);
      toast.error('Erro ao salvar obra. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const coordinates = form.watch(['coordinates_lat', 'coordinates_lng']);
  const hasCoordinates = coordinates[0] && coordinates[1];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {obraId && obraId !== 'nova' ? 'Editar Obra' : 'Nova Obra'}
        </h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Obra *</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome da obra" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="municipio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Município *</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o município" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="n_contrato"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Número do Contrato *</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o número do contrato" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tipoOptions.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valor_total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Inicial do Contrato (R$) *</FormLabel>
                  <FormControl>
                     <Input 
                       type="number" 
                       step="0.01"
                       placeholder="0,00" 
                       {...field}
                       onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                     />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valor_aditivado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Aditivado (R$)</FormLabel>
                  <FormControl>
                     <Input 
                       type="number" 
                       step="0.01"
                       placeholder="0,00" 
                       {...field}
                       onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                     />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valor_executado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Pago (R$)</FormLabel>
                  <FormControl>
                     <Input 
                       type="number" 
                       step="0.01"
                       placeholder="0,00" 
                       {...field}
                       onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                     />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Início</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="previsao_termino"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Previsão de Término</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="empresa_responsavel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa Responsável</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite a empresa responsável" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secretaria_responsavel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fiscal do Contrato</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o fiscal do contrato" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Localização</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMapSelector(true)}
                className="flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                {hasCoordinates ? 'Alterar Localização' : 'Selecionar no Mapa'}
              </Button>
            </div>
            
            {hasCoordinates && (
              <div className="text-sm text-muted-foreground">
                Coordenadas: {coordinates[0]?.toFixed(6)}, {coordinates[1]?.toFixed(6)}
              </div>
            )}
          </div>

          {/* Photos Upload */}
          <div className="space-y-4">
            <PhotoUpload
              photos={photos}
              onPhotosChange={setPhotos}
            />
            
            {/* Collapsible Photo Gallery for editing */}
            {photos.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Fotos Cadastradas</h3>
                <PhotoGalleryCollapsible
                  photos={photos}
                  onPhotoRemove={(photoUrl) => {
                    setPhotos(prev => prev.filter(p => p.url !== photoUrl));
                  }}
                  isEditing={true}
                />
              </div>
            )}
          </div>

          {/* Documents Upload */}
          <DocumentsUpload
            documents={documents}
            onDocumentsChange={setDocuments}
          />

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Obra'}
            </Button>
          </div>
        </form>
      </Form>

      {showMapSelector && (
        <div className="fixed inset-0 z-50">
          <MapSelector
            onLocationSelect={handleLocationSelect}
            initialCoordinates={hasCoordinates ? { lat: coordinates[0]!, lng: coordinates[1]! } : undefined}
          />
        </div>
      )}
    </div>
  );
}