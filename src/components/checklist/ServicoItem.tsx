import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  Image as ImageIcon,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  MapPin,
  X,
  Mic,
  MicOff,
  Loader2,
  AlertTriangle,
  Minus,
  Paintbrush,
  ListChecks,
  ZoomIn,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ChecklistServico } from '@/hooks/useChecklistDinamico';
import { useChecklistOcorrencias, type ChecklistOcorrencia } from '@/hooks/useChecklistOcorrencias';
import { OcorrenciaItem } from './OcorrenciaItem';
import { PhotoAnnotationDialog } from './PhotoAnnotationDialog';
import { PhotoZoomDialog } from './PhotoZoomDialog';

interface ServicoItemProps {
  servico: ChecklistServico;
  obraId: string;
  onUpdate: (id: string, updates: Partial<ChecklistServico>) => void;
  onDelete: (id: string) => void;
  onUploadFoto: (file: File, servicoId: string, tipo: 'reprovacao' | 'correcao') => Promise<string | null>;
  onPinRequest: (id: string, descricao: string, isOcorrencia?: boolean, servicoId?: string) => void;
}

type Gravidade = 'critico' | 'medio' | 'estetico';

const GRAVIDADE_CONFIG: Record<Gravidade, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  critico:  { label: 'Crítico',  color: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-400',    Icon: AlertTriangle },
  medio:    { label: 'Médio',    color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-400', Icon: Minus },
  estetico: { label: 'Estético', color: 'text-blue-700',   bg: 'bg-blue-100',   border: 'border-blue-400',   Icon: Paintbrush },
};

interface Point { x: number; y: number; }

export function ServicoItem({ servico, obraId, onUpdate, onDelete, onUploadFoto, onPinRequest }: ServicoItemProps) {
  const [expanded, setExpanded] = useState(servico.status === 'reprovado');
  const [ocorrenciasExpanded, setOcorrenciasExpanded] = useState(false);
  const [observacao, setObservacao] = useState(servico.observacao ?? '');
  const [uploadingRepro, setUploadingRepro] = useState(false);
  const [uploadingCorrecao, setUploadingCorrecao] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const reproInputRef = useRef<HTMLInputElement>(null);
  const correcaoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // annotation dialog state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFileSrc, setPendingFileSrc] = useState<string | null>(null);
  const [pendingTipo, setPendingTipo] = useState<'reprovacao' | 'correcao'>('reprovacao');
  const [annotationOpen, setAnnotationOpen] = useState(false);
  const [reproPoint, setReproPoint] = useState<Point | null>(servico.foto_reprovacao_pin ?? null);
  const [correcaoPoint, setCorrecaoPoint] = useState<Point | null>((servico as any).foto_correcao_pin ?? null);

  // Sync annotation points when servico data is refreshed from DB
  useEffect(() => {
    setReproPoint(servico.foto_reprovacao_pin ?? null);
    setCorrecaoPoint((servico as any).foto_correcao_pin ?? null);
  }, [servico.foto_reprovacao_pin, (servico as any).foto_correcao_pin]);

  // zoom dialog state
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [zoomPoint, setZoomPoint] = useState<Point | null>(null);
  const [zoomTitle, setZoomTitle] = useState('');

  const { ocorrenciasPorServico, fetchOcorrencias, addOcorrencia, updateOcorrencia, deleteOcorrencia, uploadFotoOcorrencia } = useChecklistOcorrencias(obraId);
  const ocorrencias = ocorrenciasPorServico[servico.id] ?? [];

  useEffect(() => {
    fetchOcorrencias(servico.id);
  }, [servico.id, fetchOcorrencias]);

  // Escuta evento de re-fetch disparado após pin de ocorrência ser salvo
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.servicoId === servico.id) {
        fetchOcorrencias(servico.id);
      }
    };
    window.addEventListener('checklist:refresh-ocorrencias', handler);
    return () => window.removeEventListener('checklist:refresh-ocorrencias', handler);
  }, [servico.id, fetchOcorrencias]);

  const gravidade: Gravidade = (servico.gravidade as Gravidade) ?? 'medio';

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => { stream.getTracks().forEach(t => t.stop()); await transcribeAudio(new Blob(audioChunksRef.current, { type: 'audio/webm' })); };
      mediaRecorder.start();
      setIsRecording(true);
    } catch { toast.error('Não foi possível acessar o microfone'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); setIsTranscribing(true); }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const mimeType = audioBlob.type || 'audio/webm';
      const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') || mimeType.includes('m4a') ? 'mp4' : mimeType.includes('wav') ? 'wav' : 'webm';
      const formData = new FormData();
      formData.append('audio', audioBlob, `audio.${ext}`);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: formData,
      });
      const result = await response.json();
      if (result.text) {
        const newText = observacao ? `${observacao} ${result.text}` : result.text;
        setObservacao(newText);
        onUpdate(servico.id, { observacao: newText });
        toast.success('Áudio transcrito com sucesso!');
      } else {
        toast.error(result.error ?? 'Não foi possível transcrever o áudio');
      }
    } catch { toast.error('Erro ao enviar áudio para transcrição'); }
    finally { setIsTranscribing(false); }
  };

  const statusClass = {
    pendente: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800',
    aprovado: 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800',
    reprovado: 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800',
  }[servico.status] ?? 'border-border bg-muted/20';

  const StatusIcon = servico.status === 'aprovado' ? CheckCircle2 : servico.status === 'reprovado' ? XCircle : Clock;
  const iconClass = servico.status === 'aprovado' ? 'text-green-600' : servico.status === 'reprovado' ? 'text-destructive' : 'text-yellow-600';

  const handleStatus = (status: 'aprovado' | 'reprovado' | 'pendente') => {
    onUpdate(servico.id, { status });
    if (status === 'reprovado') setExpanded(true);
  };

  const handleGravidade = (g: Gravidade) => {
    onUpdate(servico.id, { gravidade: g } as any);
  };

  const handleObservacaoBlur = () => {
    if (observacao !== (servico.observacao ?? '')) onUpdate(servico.id, { observacao });
  };

  const pickFoto = (tipo: 'reprovacao' | 'correcao') => {
    setPendingTipo(tipo);
    if (tipo === 'reprovacao') reproInputRef.current?.click();
    else correcaoInputRef.current?.click();
  };

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'reprovacao' | 'correcao') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingFileSrc(src);
    setPendingTipo(tipo);
    setAnnotationOpen(true);
    e.target.value = '';
  };

  const handleAnnotationConfirm = async (blob: Blob, point: Point | null) => {
    if (!pendingFile) return;
    const tipo = pendingTipo;
    const processedFile = new File([blob], pendingFile.name, { type: 'image/jpeg' });

    if (tipo === 'reprovacao') setUploadingRepro(true);
    else setUploadingCorrecao(true);

    const url = await onUploadFoto(processedFile, servico.id, tipo);
    if (url) {
      if (tipo === 'reprovacao') {
        setReproPoint(point);
        onUpdate(servico.id, { foto_reprovacao_url: url, foto_reprovacao_pin: point } as any);
      } else {
        setCorrecaoPoint(point);
        onUpdate(servico.id, { foto_correcao_url: url, foto_correcao_pin: point } as any);
      }
    }

    if (tipo === 'reprovacao') setUploadingRepro(false);
    else setUploadingCorrecao(false);

    if (pendingFileSrc) URL.revokeObjectURL(pendingFileSrc);
    setPendingFile(null);
    setPendingFileSrc(null);
  };

  const openZoom = (src: string, point: Point | null, title: string) => {
    setZoomSrc(src);
    setZoomPoint(point);
    setZoomTitle(title);
  };

  const hasPin = !!servico.location_pin;
  const gConfig = GRAVIDADE_CONFIG[gravidade];
  const GravidadeIcon = gConfig.Icon;

  return (
    <div className={`border rounded-lg transition-all ${statusClass}`}>
      {/* Header */}
      <div className="flex items-start gap-2 p-3">
        <StatusIcon className={`h-4 w-4 mt-0.5 shrink-0 ${iconClass}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{servico.descricao}</p>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {servico.is_padrao && <Badge variant="outline" className="text-[10px] h-4">Padrão</Badge>}
            {/* Gravidade badge */}
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 rounded-full border ${gConfig.bg} ${gConfig.color} ${gConfig.border}`}>
              <GravidadeIcon className="h-2.5 w-2.5" />
              {gConfig.label}
            </span>
            {servico.foto_correcao_url && <Badge className="text-[10px] h-4 bg-green-600">Corrigido</Badge>}
            {hasPin && (
              <Badge variant="outline" className="text-[10px] h-4 border-destructive text-destructive gap-0.5">
                <MapPin className="h-2.5 w-2.5" /> Localizado
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 hover:text-destructive" onClick={() => onDelete(servico.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Status buttons */}
      <div className="flex gap-2 px-3 pb-3">
        <Button
          size="sm"
          variant={servico.status === 'aprovado' ? 'default' : 'outline'}
          className={`flex-1 h-7 text-xs ${servico.status === 'aprovado' ? 'bg-green-600 hover:bg-green-700 border-green-600' : ''}`}
          onClick={() => handleStatus(servico.status === 'aprovado' ? 'pendente' : 'aprovado')}
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          Aprovar
        </Button>
        <Button
          size="sm"
          variant={servico.status === 'reprovado' ? 'destructive' : 'outline'}
          className="flex-1 h-7 text-xs"
          onClick={() => handleStatus(servico.status === 'reprovado' ? 'pendente' : 'reprovado')}
        >
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Reprovar
        </Button>
      </div>

      {/* Expanded area */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">

          {/* Gravidade */}
          <div>
            <Label className="text-xs font-medium flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
              Gravidade do Serviço
            </Label>
            <div className="flex gap-1.5 mt-1">
              {(Object.entries(GRAVIDADE_CONFIG) as [Gravidade, typeof GRAVIDADE_CONFIG[Gravidade]][]).map(([key, cfg]) => {
                const Icon = cfg.Icon;
                return (
                  <button
                    key={key}
                    onClick={() => handleGravidade(key)}
                    className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 rounded-md border transition-all ${
                      gravidade === key
                        ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm`
                        : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Localizar no PDF */}
          <div>
            <Label className="text-xs font-medium flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-destructive" />
              Localização no Projeto
            </Label>
            {hasPin ? (
              <div className="mt-1 flex items-center justify-between bg-destructive/10 border border-destructive/30 rounded px-2 py-1.5">
                <span className="text-[11px] text-destructive font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Pin marcado no PDF
                </span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive hover:bg-destructive/10" title="Reposicionar pin" onClick={() => onPinRequest(servico.id, servico.descricao)}>
                    <MapPin className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-5 w-5 hover:text-destructive" title="Remover pin" onClick={() => onUpdate(servico.id, { location_pin: null })}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="mt-1 h-7 text-xs w-full border-dashed border-destructive/50 text-destructive hover:bg-destructive/5" onClick={() => onPinRequest(servico.id, servico.descricao)}>
                <MapPin className="h-3.5 w-3.5 mr-1" />
                Marcar localização no PDF
              </Button>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Observação Geral</Label>
              <Button size="icon" variant={isRecording ? 'destructive' : 'outline'} className="h-6 w-6" title={isRecording ? 'Parar gravação' : 'Gravar observação por voz'} onClick={isRecording ? stopRecording : startRecording} disabled={isTranscribing}>
                {isTranscribing ? <Loader2 className="h-3 w-3 animate-spin" /> : isRecording ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </Button>
            </div>
            {isRecording && <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />Gravando... toque no botão para parar</p>}
            {isTranscribing && <p className="text-[10px] text-muted-foreground mt-0.5">Transcrevendo áudio...</p>}
            <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} onBlur={handleObservacaoBlur} placeholder="Observação geral sobre o serviço..." rows={3} className="mt-1 text-sm resize-none min-h-[80px]" />
          </div>

          {/* Foto do problema */}
          <div>
            <Label className="text-xs font-medium flex items-center gap-1">
              <Camera className="h-3.5 w-3.5 text-destructive" />
              Foto Geral do Problema
            </Label>
            {servico.foto_reprovacao_url ? (
              <div className="mt-1 relative group">
                <div
                  className="relative cursor-pointer"
                  onClick={() => openZoom(servico.foto_reprovacao_url!, reproPoint, 'Foto do Problema')}
                >
                  <img src={servico.foto_reprovacao_url} alt="Foto do problema" className="w-full h-32 object-cover rounded-md border" />
                  {reproPoint && (
                    <div className="absolute pointer-events-none" style={{ left: `${reproPoint.x}%`, top: `${reproPoint.y}%`, transform: 'translate(-50%,-50%)' }}>
                      <div className="w-4 h-4 rounded-full bg-destructive border-2 border-white shadow-md flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-white" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-md flex items-center justify-center">
                    <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="flex gap-1 mt-1">
                  <Button size="sm" variant="outline" className="flex-1 h-6 text-[10px]" onClick={() => pickFoto('reprovacao')}>
                    <Camera className="h-2.5 w-2.5 mr-1" />Trocar foto
                  </Button>
                  <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => { onUpdate(servico.id, { foto_reprovacao_url: null }); setReproPoint(null); }}>
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="mt-1 h-8 text-xs w-full border-dashed" disabled={uploadingRepro} onClick={() => pickFoto('reprovacao')}>
                {uploadingRepro ? 'Enviando...' : <><Plus className="h-3.5 w-3.5 mr-1" />Adicionar foto do problema</>}
              </Button>
            )}
            <input ref={reproInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChosen(e, 'reprovacao')} />
          </div>

          {/* Foto da correção */}
          {servico.status === 'reprovado' && (
            <>
              <Separator className="opacity-40" />
              <div>
                <Label className="text-xs font-medium flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5 text-green-600" />
                  Foto Geral da Correção
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">Registre após o serviço ser corrigido pela empresa.</p>
                {servico.foto_correcao_url ? (
                  <div className="mt-1 relative group">
                    <div
                      className="relative cursor-pointer"
                      onClick={() => openZoom(servico.foto_correcao_url!, correcaoPoint, 'Foto da Correção')}
                    >
                      <img src={servico.foto_correcao_url} alt="Foto da correção" className="w-full h-32 object-cover rounded-md border-2 border-green-400" />
                      {correcaoPoint && (
                        <div className="absolute pointer-events-none" style={{ left: `${correcaoPoint.x}%`, top: `${correcaoPoint.y}%`, transform: 'translate(-50%,-50%)' }}>
                          <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-md flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-white" />
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-md flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="flex gap-1 mt-1">
                      <Button size="sm" variant="outline" className="flex-1 h-6 text-[10px]" onClick={() => pickFoto('correcao')}>
                        <Camera className="h-2.5 w-2.5 mr-1" />Trocar foto
                      </Button>
                      <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => { onUpdate(servico.id, { foto_correcao_url: null } as any); setCorrecaoPoint(null); }}>
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="mt-1 h-8 text-xs w-full border-dashed border-green-500 text-green-700 hover:bg-green-50" disabled={uploadingCorrecao} onClick={() => pickFoto('correcao')}>
                    {uploadingCorrecao ? 'Enviando...' : <><Plus className="h-3.5 w-3.5 mr-1" />Registrar foto da correção</>}
                  </Button>
                )}
                <input ref={correcaoInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChosen(e, 'correcao')} />
              </div>
            </>
          )}

          {/* ── Ocorrências internas ── */}
          <Separator className="opacity-40" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium flex items-center gap-1">
                <ListChecks className="h-3.5 w-3.5 text-primary" />
                Ocorrências Específicas
                {ocorrencias.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[9px] font-bold bg-primary text-primary-foreground">
                    {ocorrencias.length}
                  </span>
                )}
              </Label>
              <div className="flex items-center gap-1">
                {ocorrencias.length > 0 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground"
                    onClick={() => setOcorrenciasExpanded(!ocorrenciasExpanded)}
                    title={ocorrenciasExpanded ? 'Recolher ocorrências' : 'Expandir ocorrências'}
                  >
                    {ocorrenciasExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] border-dashed border-primary/50 text-primary hover:bg-primary/5"
                  onClick={async () => {
                    await addOcorrencia(servico.id);
                    setOcorrenciasExpanded(true);
                  }}
                >
                  <Plus className="h-3 w-3 mr-0.5" />
                  Ocorrência
                </Button>
              </div>
            </div>

            {ocorrencias.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic py-1">
                Nenhuma ocorrência registrada. Use para detalhar problemas específicos (ex: parede 1, parede 2...).
              </p>
            )}

            {ocorrencias.length > 0 && (ocorrenciasExpanded || ocorrencias.length <= 2) && (
              <div className="space-y-2 mt-1">
                {ocorrencias.map((oc, idx) => (
                  <OcorrenciaItem
                    key={oc.id}
                    ocorrencia={oc}
                    index={idx}
                    onUpdate={(id, updates) => updateOcorrencia(id, servico.id, updates)}
                    onDelete={(id) => deleteOcorrencia(id, servico.id)}
                    onUploadFoto={uploadFotoOcorrencia}
                    onPinRequest={(ocId, desc) => onPinRequest(ocId, desc, true)}
                  />
                ))}
              </div>
            )}

            {ocorrencias.length > 2 && !ocorrenciasExpanded && (
              <button
                className="text-[10px] text-primary underline mt-1"
                onClick={() => setOcorrenciasExpanded(true)}
              >
                Ver todas as {ocorrencias.length} ocorrências
              </button>
            )}
          </div>
        </div>
      )}

      {/* Annotation dialog */}
      {pendingFileSrc && (
        <PhotoAnnotationDialog
          open={annotationOpen}
          onClose={() => {
            setAnnotationOpen(false);
            if (pendingFileSrc) URL.revokeObjectURL(pendingFileSrc);
            setPendingFile(null);
            setPendingFileSrc(null);
          }}
          imageSrc={pendingFileSrc}
          onConfirm={handleAnnotationConfirm}
          initialPoint={pendingTipo === 'reprovacao' ? reproPoint : null}
        />
      )}

      {/* Zoom dialog */}
      {zoomSrc && (
        <PhotoZoomDialog
          open={!!zoomSrc}
          onClose={() => setZoomSrc(null)}
          src={zoomSrc}
          annotationPoint={zoomPoint}
          annotationColor={zoomTitle.includes('Correção') ? 'green' : 'red'}
          title={zoomTitle}
        />
      )}
    </div>
  );
}
