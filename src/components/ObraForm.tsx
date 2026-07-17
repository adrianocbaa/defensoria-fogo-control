import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// react-router useBlocker requires a data router; we rely on beforeunload only.
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
import { MapPin, Upload, CheckCircle2, ChevronLeft, ChevronRight, AlertCircle, Circle, Pencil, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { MapSelector } from './MapSelector';
import { PhotoUpload } from './PhotoUpload';
import { DocumentsUpload } from './DocumentsUpload';
import { PhotoGalleryCollapsible } from './PhotoGalleryCollapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const obraSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  municipio: z.string().min(1, 'Município é obrigatório'),
  n_contrato: z.string().optional(),
  sei_numero: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d{4}\.\d{1}\.\d{9}-\d{1}$/.test(v),
      'Formato inválido. Use AAAA.D.DDDDDDDDD-D (ex.: 2025.0.000024717-0)'
    ),
  status: z.enum(['planejamento', 'em_andamento', 'concluida', 'paralisada']),
  tipo: z.enum(['Reforma', 'Construção', 'Adequações']),
  valor_total: z.number().min(0, 'Valor deve ser positivo'),
  valor_aditivado: z.number().min(0).optional(),
  valor_executado: z.number().min(0).optional(),
  data_inicio: z.string().optional(),
  tempo_obra: z.number().min(0, 'Tempo de obra deve ser positivo').optional(),
  aditivo_prazo: z.number().min(0).optional(),
  previsao_termino: z.string().optional(),
  data_termino_real: z.string().optional(),
  empresa_id: z.string().optional(),
  empresa_responsavel: z.string().optional(),
  regiao: z.string().optional(),
  secretaria_responsavel: z.string().optional(),
  fiscal_id: z.string().optional(),
  fiscal_substituto_id: z.string().optional(),
  responsavel_projeto_id: z.string().optional(),
  coordinates_lat: z.number().optional(),
  coordinates_lng: z.number().optional(),
  rdo_habilitado: z.boolean().default(true),
  endereco_completo: z.string().optional(),
  
  data_recebimento_provisorio: z.string().optional(),
  data_recebimento_definitivo: z.string().optional(),
  objeto_contrato: z.string().optional(),
  descricao_imovel: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.status !== 'planejamento' && !data.n_contrato?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['n_contrato'],
      message: 'Número do contrato é obrigatório',
    });
  }
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

type StepKey = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface StepDef {
  key: StepKey;
  label: string;
  short: string;
  fields: (keyof ObraFormData)[];
}

const STEPS: StepDef[] = [
  { key: 1, label: 'Identificação', short: 'Identificação', fields: ['nome', 'municipio', 'sei_numero', 'status', 'tipo'] },
  { key: 2, label: 'Contrato e Valores', short: 'Contrato', fields: ['n_contrato', 'valor_total', 'valor_aditivado', 'valor_executado', 'empresa_id', 'regiao'] },
  { key: 3, label: 'Prazos', short: 'Prazos', fields: ['data_inicio', 'tempo_obra', 'aditivo_prazo', 'previsao_termino'] },
  { key: 4, label: 'Responsáveis', short: 'Responsáveis', fields: ['fiscal_id', 'fiscal_substituto_id', 'responsavel_projeto_id'] },
  { key: 5, label: 'Configurações', short: 'Configurações', fields: ['rdo_habilitado'] },
  { key: 6, label: 'Fotos e Documentos', short: 'Anexos', fields: [] },
  { key: 7, label: 'Revisão', short: 'Revisão', fields: [] },
];

export function ObraForm({ obraId, initialData, onSuccess, onCancel, canChangeFiscal = true }: ObraFormProps) {
  const { user } = useAuth();
  const { empresas, loading: loadingEmpresas } = useEmpresas();
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>(
    (initialData as any)?.empresa_id || ''
  );

  const [currentStep, setCurrentStep] = useState<StepKey>(1);
  const [visitedSteps, setVisitedSteps] = useState<Set<StepKey>>(new Set([1]));
  const [stepsWithErrors, setStepsWithErrors] = useState<Set<StepKey>>(new Set());

  // Regiões filtradas por empresa (mesmo hook original)
  const { data: regioes = [] } = useQuery({
    queryKey: ['regioes-ata', selectedEmpresaId],
    queryFn: async () => {
      let query = supabase.from('ata_polos').select('polo').order('polo');
      if (selectedEmpresaId) query = query.eq('empresa_id', selectedEmpresaId);
      const { data, error } = await query;
      if (error) throw error;
      return [...new Set(data.map(r => r.polo))];
    }
  });

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

  const { data: arquitetos = [] } = useQuery({
    queryKey: ['arquitetos-obras-dif'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .eq('is_active', true)
        .contains('setores_atuantes', ['dif'])
        .order('display_name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: substitutoAtualId } = useQuery({
    queryKey: ['obra-fiscal-substituto', obraId],
    queryFn: async () => {
      if (!obraId || obraId === 'nova') return '';
      const { data } = await supabase
        .from('obra_fiscal_substitutos')
        .select('substitute_user_id')
        .eq('obra_id', obraId)
        .limit(1)
        .maybeSingle();
      return data?.substitute_user_id || '';
    },
    enabled: !!obraId && obraId !== 'nova',
  });

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

  const { data: valoresCalculados } = useQuery({
    queryKey: ['valores-calculados-obra', obraId],
    queryFn: async () => {
      if (!obraId || obraId === 'nova') return null;
      const { data: aditivoSessions } = await supabase
        .from('aditivo_sessions')
        .select('id')
        .eq('obra_id', obraId)
        .eq('status', 'bloqueada');
      let totalAditivo = 0;
      if (aditivoSessions && aditivoSessions.length > 0) {
        const sessionIds = aditivoSessions.map(s => s.id);
        const { data: aditivoItems } = await supabase
          .from('aditivo_items')
          .select('total')
          .in('aditivo_id', sessionIds);
        totalAditivo = aditivoItems?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
      }
      const { data: medicaoSessions } = await supabase
        .from('medicao_sessions')
        .select('id')
        .eq('obra_id', obraId);
      let valorPago = 0;
      if (medicaoSessions && medicaoSessions.length > 0) {
        const sessionIds = medicaoSessions.map(s => s.id);
        const { data: medicaoItems } = await supabase
          .from('medicao_items')
          .select('total, total_congelado')
          .in('medicao_id', sessionIds);
        valorPago = medicaoItems?.reduce((sum, item: any) => sum + (Number(item.total_congelado ?? item.total) || 0), 0) || 0;
      }
      return { totalAditivo, valorPago };
    },
    enabled: !!obraId && obraId !== 'nova' && hasPlanilhaImportada
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [showConclusaoDialog, setShowConclusaoDialog] = useState(false);
  const [dataTerminoReal, setDataTerminoReal] = useState<string>(
    (initialData as any)?.data_termino_real || format(new Date(), 'yyyy-MM-dd')
  );
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Array<{url: string; uploadedAt: string; fileName: string; monthFolder?: string}>>(
    initialData?.fotos?.map(photo => {
      if (typeof photo === 'object' && photo.url) return photo;
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
  const initialCounts = useMemo(() => ({
    photos: initialData?.fotos?.length ?? 0,
    docs: initialData?.documentos?.length ?? 0,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const form = useForm<ObraFormData>({
    resolver: zodResolver(obraSchema),
    defaultValues: {
      nome: initialData?.nome || '',
      municipio: initialData?.municipio || '',
      n_contrato: initialData?.n_contrato || '',
      sei_numero: (initialData as any)?.sei_numero || '',
      status: initialData?.status || 'planejamento',
      tipo: (initialData?.tipo as "Reforma" | "Construção" | "Adequações") || 'Reforma',
      valor_total: initialData?.valor_total || 0,
      valor_aditivado: (initialData as any)?.valor_aditivado || 0,
      valor_executado: initialData?.valor_executado || 0,
      data_inicio: initialData?.data_inicio || '',
      tempo_obra: (initialData as any)?.tempo_obra || undefined,
      aditivo_prazo: (initialData as any)?.aditivo_prazo || undefined,
      previsao_termino: initialData?.previsao_termino || '',
      data_termino_real: (initialData as any)?.data_termino_real || '',
      empresa_id: (initialData as any)?.empresa_id || '',
      empresa_responsavel: initialData?.empresa_responsavel || '',
      regiao: (initialData as any)?.regiao || '',
      secretaria_responsavel: initialData?.secretaria_responsavel || '',
      fiscal_id: (initialData as any)?.fiscal_id || '',
      fiscal_substituto_id: '',
      responsavel_projeto_id: (initialData as any)?.responsavel_projeto_id || '',
      coordinates_lat: initialData?.coordinates_lat,
      coordinates_lng: initialData?.coordinates_lng,
      rdo_habilitado: (initialData as any)?.rdo_habilitado ?? true,
      endereco_completo: (initialData as any)?.endereco_completo || '',
      
      data_recebimento_provisorio: (initialData as any)?.data_recebimento_provisorio || '',
      data_recebimento_definitivo: (initialData as any)?.data_recebimento_definitivo || '',
      objeto_contrato: (initialData as any)?.objeto_contrato || '',
      descricao_imovel: (initialData as any)?.descricao_imovel || '',
    },
  });

  const handleLocationSelect = (lat: number, lng: number) => {
    form.setValue('coordinates_lat', lat, { shouldDirty: true });
    form.setValue('coordinates_lng', lng, { shouldDirty: true });
    setShowMapSelector(false);
    toast.success('Localização selecionada com sucesso');
  };

  const handleSetCoverPhoto = (photoUrl: string) => {
    setPhotos(prev => prev.map(p => ({ ...p, isCover: (p as any).url === photoUrl } as any)));
    toast.success('Foto de capa atualizada');
  };

  const handleEditAlbumDate = (oldMonthFolder: string, newMonthFolder: string) => {
    setPhotos(prev => prev.map(p => p.monthFolder === oldMonthFolder ? { ...p, monthFolder: newMonthFolder } : p));
  };

  useEffect(() => {
    if (substitutoAtualId !== undefined) {
      form.setValue('fiscal_substituto_id', substitutoAtualId || '');
    }
  }, [substitutoAtualId, form]);

  // Recálculo automático da previsão de término (regra atual preservada)
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
            form.setValue('previsao_termino', format(dataTermino, 'yyyy-MM-dd'));
          } catch (error) {
            console.error('Erro ao calcular data de término:', error);
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // === Dirty tracking + proteção contra saída não intencional ===
  const isDirty = form.formState.isDirty
    || photos.length !== initialCounts.photos
    || documents.length !== initialCounts.docs;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, isSubmitting]);

  const blocker: { state: string; reset?: () => void; proceed?: () => void } = { state: 'unblocked' };

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
        n_contrato: data.status === 'planejamento' ? (data.n_contrato?.trim() || null) : data.n_contrato,
        sei_numero: data.sei_numero?.trim() || null,
        status: data.status,
        tipo: data.tipo,
        valor_total: data.valor_total,
        valor_aditivado: data.valor_aditivado || 0,
        valor_executado: data.valor_executado || 0,
        data_inicio: data.status === 'planejamento' ? null : (data.data_inicio || null),
        tempo_obra: data.tempo_obra || null,
        aditivo_prazo: data.aditivo_prazo || null,
        previsao_termino: data.previsao_termino || null,
        data_termino_real: data.status === 'concluida' ? (data.data_termino_real || dataTerminoReal || null) : null,
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
        endereco_completo: data.endereco_completo?.trim() || null,
        
        data_recebimento_provisorio: data.data_recebimento_provisorio || null,
        data_recebimento_definitivo: data.data_recebimento_definitivo || null,
        objeto_contrato: data.objeto_contrato?.trim() || null,
        descricao_imovel: data.descricao_imovel?.trim() || null,
      };


      let savedObraId = obraId;
      if (obraId && obraId !== 'nova') {
        const { error } = await supabase.from('obras').update(obraData).eq('id', obraId);
        if (error) throw error;
        toast.success('Obra atualizada com sucesso!');
      } else {
        const { data: inserted, error } = await supabase
          .from('obras')
          .insert([obraData])
          .select('id')
          .single();
        if (error) throw error;
        savedObraId = inserted?.id;
        toast.success('Obra criada com sucesso!');
      }

      if (savedObraId) {
        const { error: delErr } = await supabase
          .from('obra_fiscal_substitutos')
          .delete()
          .eq('obra_id', savedObraId);
        if (delErr) console.error('Erro ao limpar substitutos:', delErr);

        if (data.fiscal_substituto_id) {
          const { error: insErr } = await supabase
            .from('obra_fiscal_substitutos')
            .insert([{
              obra_id: savedObraId,
              substitute_user_id: data.fiscal_substituto_id,
              created_by: user.id,
            }]);
          if (insErr) console.error('Erro ao salvar fiscal substituto:', insErr);
        }
      }

      // Marca como salvo para não bloquear navegação
      form.reset(data);
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

  const values = form.watch();

  // Navegação entre etapas
  const goToStep = useCallback((step: StepKey) => {
    setCurrentStep(step);
    setVisitedSteps(prev => new Set(prev).add(step));
    // scroll top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const validateStep = useCallback(async (step: StepKey): Promise<boolean> => {
    const def = STEPS.find(s => s.key === step);
    if (!def || def.fields.length === 0) return true;
    const ok = await form.trigger(def.fields as any, { shouldFocus: true });
    setStepsWithErrors(prev => {
      const next = new Set(prev);
      if (ok) next.delete(step); else next.add(step);
      return next;
    });
    return ok;
  }, [form]);

  const handleNext = async () => {
    const ok = await validateStep(currentStep);
    if (!ok) return;
    if (currentStep < 7) goToStep((currentStep + 1) as StepKey);
  };

  const handlePrev = () => {
    if (currentStep > 1) goToStep((currentStep - 1) as StepKey);
  };

  const handleStepClick = async (step: StepKey) => {
    if (step === currentStep) return;
    // Permite ir livremente para etapas já visitadas ou anteriores; para avançar valida
    if (step < currentStep || visitedSteps.has(step)) {
      goToStep(step);
      return;
    }
    const ok = await validateStep(currentStep);
    if (ok) goToStep(step);
  };

  const handleFinalSubmit = async () => {
    // Validação integral (schema completo, inclui superRefine)
    const ok = await form.trigger();
    if (!ok) {
      // Marca todas as etapas com campos inválidos
      const errored: Set<StepKey> = new Set();
      const errs = form.formState.errors as Record<string, any>;
      for (const s of STEPS) {
        if (s.fields.some(f => (errs as any)[f as string])) errored.add(s.key);
      }
      setStepsWithErrors(errored);
      // Vai para a primeira etapa com erro
      const first = [...errored].sort((a, b) => a - b)[0];
      if (first) goToStep(first);
      toast.error('Existem campos inválidos. Revise as etapas destacadas.');
      return;
    }
    await form.handleSubmit(onSubmit)();
  };

  // ==== Derivados para o resumo lateral e revisão ====
  const empresaLabel = useMemo(() => {
    const e = empresas.find(e => e.id === values.empresa_id);
    return e?.razao_social || values.empresa_responsavel || '—';
  }, [empresas, values.empresa_id, values.empresa_responsavel]);

  const fiscalLabel = useMemo(() => {
    const f = fiscais.find(f => f.user_id === values.fiscal_id);
    return f?.display_name || f?.email || '—';
  }, [fiscais, values.fiscal_id]);

  const substitutoLabel = useMemo(() => {
    const f = fiscais.find(f => f.user_id === values.fiscal_substituto_id);
    return f?.display_name || f?.email || '—';
  }, [fiscais, values.fiscal_substituto_id]);

  const gestorLabel = useMemo(() => {
    const a = arquitetos.find(a => a.user_id === values.responsavel_projeto_id);
    return a?.display_name || a?.email || '—';
  }, [arquitetos, values.responsavel_projeto_id]);

  const valorFinal = (values.valor_total || 0) + (values.valor_aditivado || 0);
  const statusLabel = statusOptions.find(s => s.value === values.status)?.label || values.status;

  // Progresso de preenchimento (heurístico dos campos principais)
  const fillProgress = useMemo(() => {
    const required: Array<[boolean, number]> = [
      [!!values.nome, 1],
      [!!values.municipio, 1],
      [!!values.status, 1],
      [!!values.tipo, 1],
      [values.valor_total > 0, 1],
      [values.status === 'planejamento' ? true : !!values.n_contrato, 1],
      [!!values.empresa_id || !!values.empresa_responsavel, 1],
      [!!values.data_inicio || values.status === 'planejamento', 1],
      [!!values.fiscal_id, 1],
      [!!hasCoordinates, 1],
    ];
    const total = required.reduce((s, [_, w]) => s + w, 0);
    const done = required.reduce((s, [ok, w]) => s + (ok ? w : 0), 0);
    return Math.round((done / total) * 100);
  }, [values, hasCoordinates]);

  const isEdit = obraId && obraId !== 'nova';

  // ==== UI helpers ====
  const StepIcon = ({ step }: { step: StepDef }) => {
    const done = visitedSteps.has(step.key) && step.key < currentStep && !stepsWithErrors.has(step.key);
    const active = currentStep === step.key;
    const hasError = stepsWithErrors.has(step.key);
    return (
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors',
        active && 'border-primary bg-primary text-primary-foreground',
        !active && done && 'border-primary/60 bg-primary/10 text-primary',
        !active && !done && !hasError && 'border-border bg-background text-muted-foreground',
        hasError && 'border-destructive bg-destructive/10 text-destructive'
      )}>
        {hasError ? <AlertCircle className="h-4 w-4" /> : done ? <CheckCircle2 className="h-4 w-4" /> : step.key}
      </div>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* ====== COLUNA PRINCIPAL ====== */}
      <div className="min-w-0 space-y-6">
        {/* Stepper */}
        <Card>
          <CardContent className="p-4">
            <ol className="flex flex-wrap items-center gap-2">
              {STEPS.map((s, idx) => (
                <li key={s.key} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStepClick(s.key)}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted',
                      currentStep === s.key && 'bg-muted'
                    )}
                    aria-current={currentStep === s.key ? 'step' : undefined}
                  >
                    <StepIcon step={s} />
                    <span className={cn(
                      'hidden font-medium sm:inline',
                      currentStep === s.key ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {s.short}
                    </span>
                  </button>
                  {idx < STEPS.length - 1 && <span className="hidden text-muted-foreground sm:inline">›</span>}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6">
            {/* ============ ETAPA 1 — IDENTIFICAÇÃO ============ */}
            <section className={cn(currentStep !== 1 && 'hidden')}>
              <Card>
                <CardHeader>
                  <CardTitle>Identificação</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField control={form.control} name="nome" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nome da Obra *</FormLabel>
                      <FormControl><Input placeholder="Digite o nome da obra" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="municipio" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Município *</FormLabel>
                      <FormControl><Input placeholder="Digite o município" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="endereco_completo" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Endereço Completo</FormLabel>
                      <FormControl><Input placeholder="Rua, número, bairro, CEP — usado nos documentos de encerramento" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="sei_numero" render={({ field }) => {
                    const formatSei = (raw: string) => {
                      const d = raw.replace(/\D/g, '').slice(0, 15);
                      let out = d.slice(0, 4);
                      if (d.length > 4) out += '.' + d.slice(4, 5);
                      if (d.length > 5) out += '.' + d.slice(5, 14);
                      if (d.length > 14) out += '-' + d.slice(14, 15);
                      return out;
                    };
                    return (
                      <FormItem>
                        <FormLabel>Número do Procedimento SEI</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex.: 2025.0.000024717-0"
                            inputMode="numeric"
                            maxLength={17}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(formatSei(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }} />

                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          if (value === 'concluida' && field.value !== 'concluida') {
                            setPendingStatusChange(value);
                            setShowConclusaoDialog(true);
                          } else {
                            field.onChange(value);
                            if (field.value === 'concluida' && value !== 'concluida') {
                              form.setValue('data_termino_real', '');
                            }
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="tipo" render={({ field }) => {
                    const natureza = field.value === 'Adequações' ? 'Custeio' : 'Investimento';
                    const naturezaClass = natureza === 'Custeio'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
                    return (
                      <FormItem>
                        <FormLabel>Tipo *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tipoOptions.map((tipo) => (
                              <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {field.value && (
                          <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${naturezaClass}`}>
                              Natureza: {natureza}
                            </span>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }} />

                  {/* Localização */}
                  <div className="md:col-span-2 space-y-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Localização no Mapa</div>
                        <div className="text-xs text-muted-foreground">
                          {hasCoordinates
                            ? `Coordenadas: ${coordinates[0]?.toFixed(6)}, ${coordinates[1]?.toFixed(6)}`
                            : 'Nenhuma localização selecionada'}
                        </div>
                      </div>
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
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* ============ ETAPA 2 — CONTRATO E VALORES ============ */}
            <section className={cn(currentStep !== 2 && 'hidden')}>
              <Card>
                <CardHeader>
                  <CardTitle>Contrato e Valores</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField control={form.control} name="n_contrato" render={({ field }) => {
                    const isPlanejamento = form.watch('status') === 'planejamento';
                    return (
                      <FormItem>
                        <FormLabel>Número do Contrato {!isPlanejamento && '*'}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={isPlanejamento ? 'Disponível após "Em Andamento"' : 'Digite o número do contrato'}
                            disabled={isPlanejamento}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }} />

                  <FormField control={form.control} name="empresa_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa Responsável</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedEmpresaId(value);
                          form.setValue('regiao', '');
                        }}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {empresas.map((empresa) => (
                            <SelectItem key={empresa.id} value={empresa.id}>{empresa.razao_social}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />


                  <FormField control={form.control} name="regiao" render={({ field }) => (
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
                            <SelectItem key={regiao} value={regiao}>{regiao}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="valor_total" render={({ field }) => (
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
                        <FormDescription>Campo bloqueado: planilha orçamentária já foi importada na medição.</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="valor_aditivado" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Aditivado (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          {...field}
                          value={hasPlanilhaImportada && valoresCalculados ? valoresCalculados.totalAditivo : field.value}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          disabled={hasPlanilhaImportada}
                          className={hasPlanilhaImportada ? 'bg-muted cursor-not-allowed' : ''}
                        />
                      </FormControl>
                      {hasPlanilhaImportada && (
                        <FormDescription className="text-xs">Calculado automaticamente a partir dos aditivos bloqueados.</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="valor_executado" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Pago (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          {...field}
                          value={hasPlanilhaImportada && valoresCalculados ? valoresCalculados.valorPago : field.value}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          disabled={hasPlanilhaImportada}
                          className={hasPlanilhaImportada ? 'bg-muted cursor-not-allowed' : ''}
                        />
                      </FormControl>
                      {hasPlanilhaImportada && (
                        <FormDescription className="text-xs">Calculado automaticamente a partir das medições.</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="md:col-span-2 rounded-lg border bg-muted/40 p-4">
                    <div className="text-sm text-muted-foreground">Valor Final (Inicial + Aditivado)</div>
                    <div className="text-2xl font-semibold">{formatCurrency(valorFinal)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">Exibição derivada. Não altera dados armazenados.</p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* ============ ETAPA 3 — PRAZOS ============ */}
            <section className={cn(currentStep !== 3 && 'hidden')}>
              <Card>
                <CardHeader>
                  <CardTitle>Prazos</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField control={form.control} name="data_inicio" render={({ field }) => {
                    const isPlanejamento = form.watch('status') === 'planejamento';
                    return (
                      <FormItem>
                        <FormLabel>Data de Início</FormLabel>
                        <FormControl>
                          <Input type="date" disabled={isPlanejamento} {...field} />
                        </FormControl>
                        {isPlanejamento && (
                          <FormDescription>Disponível após mudar o status para "Em Andamento"</FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }} />

                  <FormField control={form.control} name="tempo_obra" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo de Obra (dias)</FormLabel>
                      <FormControl>
                        <Input
                          type="number" min="0" step="1" placeholder="0"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="aditivo_prazo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aditivo de Prazo (dias)</FormLabel>
                      <FormControl>
                        <Input
                          type="number" min="0" step="1" placeholder="0"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="previsao_termino" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previsão de Término</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled className="bg-muted cursor-not-allowed" />
                      </FormControl>
                      <FormDescription>Calculado automaticamente com base na data de início + prazos.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="md:col-span-2 rounded-lg border bg-muted/40 p-4 text-sm">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      <div><div className="text-xs text-muted-foreground">Início</div><div className="font-medium">{values.data_inicio || '—'}</div></div>
                      <div><div className="text-xs text-muted-foreground">Prazo inicial</div><div className="font-medium">{values.tempo_obra ?? 0} d</div></div>
                      <div><div className="text-xs text-muted-foreground">Aditivo</div><div className="font-medium">{values.aditivo_prazo ?? 0} d</div></div>
                      <div><div className="text-xs text-muted-foreground">Prazo total</div><div className="font-medium">{(values.tempo_obra ?? 0) + (values.aditivo_prazo ?? 0)} d</div></div>
                      <div><div className="text-xs text-muted-foreground">Término previsto</div><div className="font-medium">{values.previsao_termino || '—'}</div></div>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-3">Encerramento da Obra</h4>
                    <p className="text-xs text-muted-foreground mb-3">Datas usadas na geração de TRP e TRD. As ARTs/RRTs são gerenciadas na aba <strong>Encerramento</strong> do módulo de Medição.</p>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <FormField control={form.control} name="data_recebimento_provisorio" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recebimento Provisório (TRP)</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="data_recebimento_definitivo" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recebimento Definitivo (TRD)</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-6">
                      <FormField control={form.control} name="objeto_contrato" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Objeto do contrato</FormLabel>
                          <FormControl><Textarea rows={4} placeholder="Ex.: Contratação de empresa especializada para prestação de serviços de reforma predial..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="descricao_imovel" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição do imóvel</FormLabel>
                          <FormControl><Textarea rows={3} placeholder="Ex.: Edificação térrea composta de sistema de materiais mistos, com rede lógica cabeada e instalações elétricas de baixa tensão." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* ============ ETAPA 4 — RESPONSÁVEIS ============ */}
            <section className={cn(currentStep !== 4 && 'hidden')}>
              <Card>
                <CardHeader>
                  <CardTitle>Responsáveis</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField control={form.control} name="fiscal_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fiscal Titular</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''} disabled={!canChangeFiscal}>
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
                        <FormDescription>Apenas o Fiscal Titular ou Administrador pode alterar este campo.</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="fiscal_substituto_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fiscal Substituto</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                        value={field.value || '__none__'}
                        disabled={!canChangeFiscal}
                      >
                        <FormControl>
                          <SelectTrigger className={!canChangeFiscal ? 'bg-muted cursor-not-allowed' : ''}>
                            <SelectValue placeholder="Selecione o fiscal substituto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {fiscais
                            .filter((f) => f.user_id !== form.watch('fiscal_id'))
                            .map((fiscal) => (
                              <SelectItem key={fiscal.user_id} value={fiscal.user_id}>
                                {fiscal.display_name || fiscal.email}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="responsavel_projeto_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gestor(a) do Contrato</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione o(a) gestor(a) do contrato" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {arquitetos.map((a) => (
                            <SelectItem key={a.user_id} value={a.user_id}>{a.display_name || a.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                </CardContent>
              </Card>
            </section>

            {/* ============ ETAPA 5 — CONFIGURAÇÕES ============ */}
            <section className={cn(currentStep !== 5 && 'hidden')}>
              <Card>
                <CardHeader>
                  <CardTitle>Configurações</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField control={form.control} name="rdo_habilitado" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5 pr-4">
                        <FormLabel className="text-base">RDO Habilitado</FormLabel>
                        <FormDescription>
                          Quando habilitado, o RDO será utilizado no acompanhamento da execução física e nas regras atuais do sistema.
                          Quando desabilitado, não exigirá preenchimento de RDO e não contabilizará dias de atraso.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </section>

            {/* ============ ETAPA 6 — FOTOS E DOCUMENTOS ============ */}
            <section className={cn(currentStep !== 6 && 'hidden')}>
              <Card>
                <CardHeader>
                  <CardTitle>Fotos e Documentos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <PhotoUpload photos={photos} onPhotosChange={setPhotos} />
                    {photos.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Fotos Cadastradas ({photos.length})</h3>
                        <PhotoGalleryCollapsible
                          photos={photos}
                          onPhotoRemove={(photoUrl) => setPhotos(prev => prev.filter(p => p.url !== photoUrl))}
                          onSetCover={handleSetCoverPhoto}
                          onEditAlbumDate={handleEditAlbumDate}
                          isEditing={true}
                        />
                      </div>
                    )}
                  </div>
                  <DocumentsUpload documents={documents} onDocumentsChange={setDocuments} />
                </CardContent>
              </Card>
            </section>

            {/* ============ ETAPA 7 — REVISÃO ============ */}
            <section className={cn(currentStep !== 7 && 'hidden')}>
              <Card>
                <CardHeader>
                  <CardTitle>Revisão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ReviewBlock title="Identificação" onEdit={() => goToStep(1)}>
                    <ReviewRow label="Nome" value={values.nome} />
                    <ReviewRow label="Município" value={values.municipio} />
                    <ReviewRow label="SEI" value={values.sei_numero} />
                    <ReviewRow label="Status" value={statusLabel} />
                    <ReviewRow label="Tipo" value={values.tipo} />
                    <ReviewRow label="Localização" value={hasCoordinates ? `${coordinates[0]?.toFixed(6)}, ${coordinates[1]?.toFixed(6)}` : 'Não informada'} warn={!hasCoordinates} />
                  </ReviewBlock>
                  <ReviewBlock title="Contrato e Valores" onEdit={() => goToStep(2)}>
                    <ReviewRow label="Nº Contrato" value={values.n_contrato} warn={values.status !== 'planejamento' && !values.n_contrato} />
                    <ReviewRow label="Empresa" value={empresaLabel} />
                    <ReviewRow label="Região" value={values.regiao} />
                    <ReviewRow label="Valor Inicial" value={formatCurrency(values.valor_total || 0)} />
                    <ReviewRow label="Valor Aditivado" value={formatCurrency(values.valor_aditivado || 0)} />
                    <ReviewRow label="Valor Pago" value={formatCurrency(values.valor_executado || 0)} />
                    <ReviewRow label="Valor Final" value={formatCurrency(valorFinal)} strong />
                  </ReviewBlock>
                  <ReviewBlock title="Prazos" onEdit={() => goToStep(3)}>
                    <ReviewRow label="Início" value={values.data_inicio} />
                    <ReviewRow label="Tempo de Obra" value={values.tempo_obra ? `${values.tempo_obra} dias` : '—'} />
                    <ReviewRow label="Aditivo de Prazo" value={values.aditivo_prazo ? `${values.aditivo_prazo} dias` : '—'} />
                    <ReviewRow label="Previsão de Término" value={values.previsao_termino} />
                    {values.status === 'concluida' && (
                      <ReviewRow label="Término Real" value={values.data_termino_real || dataTerminoReal} />
                    )}
                  </ReviewBlock>
                  <ReviewBlock title="Responsáveis" onEdit={() => goToStep(4)}>
                    <ReviewRow label="Fiscal Titular" value={fiscalLabel} />
                    <ReviewRow label="Fiscal Substituto" value={substitutoLabel} />
                    <ReviewRow label="Gestor(a) do Contrato" value={gestorLabel} />
                    
                  </ReviewBlock>
                  <ReviewBlock title="Configurações" onEdit={() => goToStep(5)}>
                    <ReviewRow label="RDO Habilitado" value={values.rdo_habilitado ? 'Sim' : 'Não'} />
                  </ReviewBlock>
                  <ReviewBlock title="Anexos" onEdit={() => goToStep(6)}>
                    <ReviewRow label="Fotos" value={`${photos.length}`} />
                    <ReviewRow label="Documentos" value={`${documents.length}`} />
                  </ReviewBlock>
                </CardContent>
              </Card>
            </section>

            {/* Barra de ações */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={handlePrev}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                  </Button>
                )}
                {currentStep < 7 && (
                  <Button type="button" onClick={handleNext}>
                    {currentStep === 6 ? 'Ir para Revisão' : 'Próxima etapa'} <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
                {currentStep === 7 && (
                  <Button type="button" onClick={handleFinalSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : (isEdit ? 'Salvar Alterações' : 'Criar Obra')}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>

      {/* ====== RESUMO LATERAL ====== */}
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <Badge variant="secondary" className="mt-1">{statusLabel}</Badge>
            </div>
            <SummaryRow label="Valor Final" value={formatCurrency(valorFinal)} />
            <SummaryRow label="Previsão de Término" value={values.previsao_termino || '—'} />
            <SummaryRow label="Empresa" value={empresaLabel} />
            <SummaryRow label="Fiscal" value={fiscalLabel} />
            <SummaryRow label="Localização" value={hasCoordinates ? 'Definida' : 'Não definida'} />
            <SummaryRow label="RDO" value={values.rdo_habilitado ? 'Habilitado' : 'Desabilitado'} />
            <SummaryRow label="Fotos" value={`${photos.length}`} />
            <SummaryRow label="Documentos" value={`${documents.length}`} />
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Preenchimento</span>
                <span>{fillProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${fillProgress}%` }} />
              </div>
            </div>
            {isDirty && (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">
                <Circle className="h-2 w-2 fill-current" /> Alterações não salvas
              </div>
            )}
          </CardContent>
        </Card>
      </aside>

      {/* Map Selector (controlled) */}
      <MapSelector
        open={showMapSelector}
        onOpenChange={setShowMapSelector}
        hideTrigger
        onLocationSelect={handleLocationSelect}
        initialCoordinates={hasCoordinates ? { lat: coordinates[0]!, lng: coordinates[1]! } : undefined}
      />


      {/* Dialog de Conclusão (preservado) */}
      <Dialog open={showConclusaoDialog} onOpenChange={setShowConclusaoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Concluir Obra
            </DialogTitle>
            <DialogDescription>
              Informe a data real de término da obra. Esta data será exibida no resumo da obra junto com o prazo contratual previsto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="data_termino_real">Data de Término da Obra *</Label>
              <Input
                id="data_termino_real"
                type="date"
                value={dataTerminoReal}
                onChange={(e) => setDataTerminoReal(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
              <p className="text-xs text-muted-foreground">Data em que a obra foi efetivamente concluída</p>
            </div>
            {form.getValues('previsao_termino') && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm font-medium">Comparativo:</p>
                <p className="text-xs text-muted-foreground">
                  Prazo previsto: {format(new Date(form.getValues('previsao_termino') + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                {dataTerminoReal && (
                  <p className="text-xs text-muted-foreground">
                    Término real: {format(new Date(dataTerminoReal + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowConclusaoDialog(false); setPendingStatusChange(null); }}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!dataTerminoReal) { toast.error('Informe a data de término da obra'); return; }
                form.setValue('status', 'concluida', { shouldDirty: true });
                form.setValue('data_termino_real', dataTerminoReal, { shouldDirty: true });
                setShowConclusaoDialog(false);
                setPendingStatusChange(null);
                toast.success('Status alterado para Concluída. Salve para confirmar.');
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar Conclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={blocker.state === 'blocked'} onOpenChange={(open) => { if (!open) blocker.reset?.(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Se sair agora, elas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>Sair sem salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==== Auxiliares de UI ====

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-medium">{title}</h4>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
        </Button>
      </div>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

function ReviewRow({ label, value, strong, warn }: { label: string; value?: React.ReactNode; strong?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn(
        'text-right text-sm',
        strong && 'font-semibold',
        warn && 'text-destructive'
      )}>
        {value || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
