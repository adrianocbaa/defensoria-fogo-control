import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDays, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
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
  tipo: z.enum(['Reforma', 'Construção', 'Adequações']),
  valor_total: z.number().min(0, 'Valor deve ser positivo'),
  valor_aditivado: z.number().min(0).optional(),
  valor_executado: z.number().min(0).optional(),
  data_inicio: z.string().optional(),
  tempo_obra: z.number().min(0, 'Tempo de obra deve ser positivo').optional(),
  aditivo_prazo: z.number().min(0).optional(),
  previsao_termino: z.string().optional(),
  empresa_id: z.string().optional(),
  empresa_responsavel: z.string().optional(),
  regiao: z.string().optional(),
  secretaria_responsavel: z.string().optional(),
  fiscal_id: z.string().optional(),
  responsavel_projeto_id: z.string().optional(),
  coordinates_lat: z.number().optional(),
  coordinates_lng: z.number().optional(),
  rdo_habilitado: z.boolean().default(true),
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
    fotos?: any[];
    documentos?: Document[];
  };
  onSuccess: () => void;
  onCancel: () => void;
  /** Se false, o campo Fiscal do Contrato será desabilitado. Default: true */
  canChangeFiscal?: boolean;
}

const statusOptions = [
  { value: 'planejamento', label: 'Planejamento' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'paralisada', label: 'Paralisada' },
];

const tipoOptions = ['Reforma', 'Construção', 'Adequações'];

export function ObraForm({ obraId, initialData, onSuccess, onCancel, canChangeFiscal = true }: ObraFormProps) {
  const { user } = useAuth();
  const { empresas, loading: loadingEmpresas } = useEmpresas();
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>(
    (initialData as any)?.empresa_id || ''
  );
  
  // Buscar regiões disponíveis das ATAs filtradas pela empresa selecionada
  const { data: regioes = [] } = useQuery({
    queryKey: ['regioes-ata', selectedEmpresaId],
    queryFn: async () => {
      let query = supabase
        .from('ata_polos')
        .select('polo')
        .order('polo');
      
      // Se uma empresa está selecionada, filtrar por ela
      if (selectedEmpresaId) {
        query = query.eq('empresa_id', selectedEmpresaId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Remove duplicatas
      const uniqueRegioes = [...new Set(data.map(r => r.polo))];
      return uniqueRegioes;
    }
  });

  // Buscar usuários do setor DIF para seleção de fiscal
  const { data: fiscais = [] } = useQuery({
    queryKey: ['fiscais-obras-dif'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, setores_atuantes')
        .eq('is_active', true)
        .contains('setores_atuantes', ['dif'])
        .order('display_name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Buscar arquitetos para seleção de responsável pelo projeto
  const { data: arquitetos = [] } = useQuery({
    queryKey: ['arquitetos-obras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .eq('is_active', true)
        .order('display_name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Verificar se existe planilha orçamentária importada (bloqueia campo valor_total)
  const { data: hasPlanilhaImportada = false } = useQuery({
    queryKey: ['planilha-importada', obraId],
    queryFn: async () => {
      if (!obraId || obraId === 'nova') return false;
      
      const { count, error } = await supabase
        .from('orcamento_items')
        .select('*', { count: 'exact', head: true })
        .eq('obra_id', obraId);
      
      if (error) return false;
      return (count || 0) > 0;
    },
    enabled: !!obraId && obraId !== 'nova'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [photos, setPhotos] = useState<Array<{url: string; uploadedAt: string; fileName: string; monthFolder?: string}>>(
    initialData?.fotos?.map(photo => {
      // Se já é um objeto completo, retorna ele mesmo
      if (typeof photo === 'object' && photo.url) {
        return photo;
      }
      
      // Se é apenas uma URL, tenta extrair monthFolder
      const url = typeof photo === 'string' ? photo : photo;
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
      tipo: (initialData?.tipo as "Reforma" | "Construção" | "Adequações") || 'Reforma',
      valor_total: initialData?.valor_total || 0,
      valor_aditivado: (initialData as any)?.valor_aditivado || 0,
      valor_executado: initialData?.valor_executado || 0,
      data_inicio: initialData?.data_inicio || '',
      tempo_obra: (initialData as any)?.tempo_obra || undefined,
      aditivo_prazo: (initialData as any)?.aditivo_prazo || undefined,
      previsao_termino: initialData?.previsao_termino || '',
      empresa_id: (initialData as any)?.empresa_id || '',
      empresa_responsavel: initialData?.empresa_responsavel || '',
      regiao: (initialData as any)?.regiao || '',
      secretaria_responsavel: initialData?.secretaria_responsavel || '',
      fiscal_id: (initialData as any)?.fiscal_id || '',
      responsavel_projeto_id: (initialData as any)?.responsavel_projeto_id || '',
      coordinates_lat: initialData?.coordinates_lat,
      coordinates_lng: initialData?.coordinates_lng,
      rdo_habilitado: (initialData as any)?.rdo_habilitado ?? true,
    },
  });

  const handleLocationSelect = (lat: number, lng: number) => {
    form.setValue('coordinates_lat', lat);
    form.setValue('coordinates_lng', lng);
    setShowMapSelector(false);
    toast.success('Localização selecionada com sucesso');
  };

  const handleSetCoverPhoto = (photoUrl: string) => {
    const updatedPhotos = photos.map((photo) => ({
      ...photo,
      isCover: photo.url === photoUrl
    }));
    setPhotos(updatedPhotos);
    toast.success('Foto de capa atualizada');
  };

  const handleEditAlbumDate = (oldMonthFolder: string, newMonthFolder: string) => {
    const updatedPhotos = photos.map((photo) => {
      if (photo.monthFolder === oldMonthFolder) {
        return {
          ...photo,
          monthFolder: newMonthFolder
        };
      }
      return photo;
    });
    setPhotos(updatedPhotos);
  };

  // Calcular automaticamente a previsão de término quando data_inicio, tempo_obra ou aditivo_prazo mudarem
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'data_inicio' || name === 'tempo_obra' || name === 'aditivo_prazo') {
        const dataInicio = value.data_inicio;
        const tempoObra = value.tempo_obra || 0;
        const aditivoPrazo = value.aditivo_prazo || 0;
        const prazoTotal = tempoObra + aditivoPrazo;

        if (dataInicio && prazoTotal > 0) {
          try {
            const dataInicioParsed = new Date(dataInicio);
            const dataTermino = addDays(dataInicioParsed, prazoTotal);
            const dataTerminoFormatted = format(dataTermino, 'yyyy-MM-dd');
            form.setValue('previsao_termino', dataTerminoFormatted);
          } catch (error) {
            console.error('Erro ao calcular data de término:', error);
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

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
        tempo_obra: data.tempo_obra || null,
        aditivo_prazo: data.aditivo_prazo || null,
        previsao_termino: data.previsao_termino || null,
        empresa_id: data.empresa_id || null,
        empresa_responsavel: data.empresa_responsavel || null,
        regiao: data.regiao || null,
        secretaria_responsavel: data.secretaria_responsavel || null,
        fiscal_id: data.fiscal_id || null,
        responsavel_projeto_id: data.responsavel_projeto_id || null,
        coordinates_lat: data.coordinates_lat || null,
        coordinates_lng: data.coordinates_lng || null,
        fotos: photos,
        documentos: documents,
        created_by: user.id,
        rdo_habilitado: data.rdo_habilitado,
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
                <FormItem>
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                       disabled={hasPlanilhaImportada}
                       className={hasPlanilhaImportada ? 'bg-muted cursor-not-allowed' : ''}
                     />
                  </FormControl>
                  {hasPlanilhaImportada && (
                    <FormDescription className="text-muted-foreground">
                      Campo bloqueado: planilha orçamentária já foi importada na medição.
                    </FormDescription>
                  )}
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
              name="tempo_obra"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tempo de Obra (dias)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      step="1"
                      placeholder="0" 
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="aditivo_prazo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aditivo de Prazo (dias)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      step="1"
                      placeholder="0" 
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                        field.onChange(value);
                      }}
                    />
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
                  <FormLabel>Previsão de Término (calculado automaticamente)</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="empresa_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa Responsável</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedEmpresaId(value);
                      // Limpar região se a empresa mudou
                      form.setValue('regiao', '');
                    }} 
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {empresas.map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          {empresa.razao_social}
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
              name="regiao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Região</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || ''}
                    disabled={!selectedEmpresaId || regioes.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !selectedEmpresaId 
                            ? "Selecione primeiro a empresa" 
                            : regioes.length === 0 
                              ? "Nenhuma região disponível" 
                              : "Selecione a região"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {regioes.map((regiao) => (
                        <SelectItem key={regiao} value={regiao}>
                          {regiao}
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
              name="fiscal_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fiscal do Contrato</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || ''}
                    disabled={!canChangeFiscal}
                  >
                    <FormControl>
                      <SelectTrigger className={!canChangeFiscal ? 'bg-muted cursor-not-allowed' : ''}>
                        <SelectValue placeholder="Selecione o fiscal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fiscais.map((fiscal) => (
                        <SelectItem key={fiscal.user_id} value={fiscal.user_id}>
                          {fiscal.display_name || fiscal.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!canChangeFiscal && (
                    <FormDescription className="text-muted-foreground">
                      Apenas o Fiscal Titular ou Administrador pode alterar este campo.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsavel_projeto_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável pelo Projeto</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o(a) arquiteto(a)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {arquitetos.map((arquiteto) => (
                        <SelectItem key={arquiteto.user_id} value={arquiteto.user_id}>
                          {arquiteto.display_name || arquiteto.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* RDO Habilitado Switch */}
            <FormField
              control={form.control}
              name="rdo_habilitado"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 md:col-span-2">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">RDO Habilitado</FormLabel>
                    <FormDescription>
                      Se desabilitado, não exigirá preenchimento de RDO e não contabilizará dias de atraso.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                <h3 className="text-sm font-medium">Fotos Cadastradas ({photos.length})</h3>
                <PhotoGalleryCollapsible
                  photos={photos}
                  onPhotoRemove={(photoUrl) => {
                    setPhotos(prev => prev.filter(p => p.url !== photoUrl));
                  }}
                  onSetCover={handleSetCoverPhoto}
                  onEditAlbumDate={handleEditAlbumDate}
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