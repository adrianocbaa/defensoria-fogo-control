import { useState, useRef } from 'react';
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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ChecklistServico } from '@/hooks/useChecklistDinamico';

interface ServicoItemProps {
  servico: ChecklistServico;
  onUpdate: (id: string, updates: Partial<ChecklistServico>) => void;
  onDelete: (id: string) => void;
  onUploadFoto: (file: File, servicoId: string, tipo: 'reprovacao' | 'correcao') => Promise<string | null>;
  onPinRequest: (servicoId: string, descricao: string) => void;
}

type Gravidade = 'critico' | 'medio' | 'estetico';

const GRAVIDADE_CONFIG: Record<Gravidade, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  critico:  { label: 'Crítico',  color: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-400',    Icon: AlertTriangle },
  medio:    { label: 'Médio',    color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-400', Icon: Minus },
  estetico: { label: 'Estético', color: 'text-blue-700',   bg: 'bg-blue-100',   border: 'border-blue-400',   Icon: Paintbrush },
};

export function ServicoItem({ servico, onUpdate, onDelete, onUploadFoto, onPinRequest }: ServicoItemProps) {
  const [expanded, setExpanded] = useState(servico.status === 'reprovado');
  const [observacao, setObservacao] = useState(servico.observacao ?? '');
  const [uploadingRepro, setUploadingRepro] = useState(false);
  const [uploadingCorrecao, setUploadingCorrecao] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const reproInputRef = useRef<HTMLInputElement>(null);
  const correcaoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  const handlePrazoBlur = () => {
    const val = prazoCorrecao.trim() === '' ? null : parseInt(prazoCorrecao, 10);
    onUpdate(servico.id, { prazo_correcao: val } as any);
  };

  const handleResponsavelBlur = () => {
    const val = responsavelCorrecao.trim() || null;
    onUpdate(servico.id, { responsavel_correcao: val } as any);
  };

  const handleFotoReprovacao = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRepro(true);
    const url = await onUploadFoto(file, servico.id, 'reprovacao');
    if (url) onUpdate(servico.id, { foto_reprovacao_url: url });
    setUploadingRepro(false);
    e.target.value = '';
  };

  const handleFotoCorrecao = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCorrecao(true);
    const url = await onUploadFoto(file, servico.id, 'correcao');
    if (url) onUpdate(servico.id, { foto_correcao_url: url });
    setUploadingCorrecao(false);
    e.target.value = '';
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
            {(servico as any).prazo_correcao != null && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 rounded-full bg-muted text-muted-foreground border">
                <CalendarClock className="h-2.5 w-2.5" />
                {(servico as any).prazo_correcao}d
              </span>
            )}
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
              Gravidade
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

          {/* Prazo e Responsável — mostrar somente quando reprovado */}
          {servico.status === 'reprovado' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5 text-orange-500" />
                  Prazo (dias)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={prazoCorrecao}
                  onChange={e => setPrazoCorrecao(e.target.value)}
                  onBlur={handlePrazoBlur}
                  placeholder="Ex: 5"
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-blue-500" />
                  Responsável
                </Label>
                <Input
                  type="text"
                  value={responsavelCorrecao}
                  onChange={e => setResponsavelCorrecao(e.target.value)}
                  onBlur={handleResponsavelBlur}
                  placeholder="Ex: Contratada"
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>
          )}

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
              <Label className="text-xs font-medium">Observação</Label>
              <Button size="icon" variant={isRecording ? 'destructive' : 'outline'} className="h-6 w-6" title={isRecording ? 'Parar gravação' : 'Gravar observação por voz'} onClick={isRecording ? stopRecording : startRecording} disabled={isTranscribing}>
                {isTranscribing ? <Loader2 className="h-3 w-3 animate-spin" /> : isRecording ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </Button>
            </div>
            {isRecording && <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />Gravando... toque no botão para parar</p>}
            {isTranscribing && <p className="text-[10px] text-muted-foreground mt-0.5">Transcrevendo áudio...</p>}
            <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} onBlur={handleObservacaoBlur} placeholder="Descreva o problema encontrado..." rows={2} className="mt-1 text-xs resize-none" />
          </div>

          {/* Foto do problema */}
          <div>
            <Label className="text-xs font-medium flex items-center gap-1">
              <Camera className="h-3.5 w-3.5 text-destructive" />
              Foto do Problema
            </Label>
            {servico.foto_reprovacao_url ? (
              <div className="mt-1 relative">
                <img src={servico.foto_reprovacao_url} alt="Foto do problema" className="w-full h-32 object-cover rounded-md border" />
                <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6" onClick={() => onUpdate(servico.id, { foto_reprovacao_url: null })}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="mt-1 h-8 text-xs w-full border-dashed" disabled={uploadingRepro} onClick={() => reproInputRef.current?.click()}>
                {uploadingRepro ? 'Enviando...' : <><Plus className="h-3.5 w-3.5 mr-1" />Adicionar foto do problema</>}
              </Button>
            )}
            <input ref={reproInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotoReprovacao} />
          </div>

          {/* Foto da correção */}
          {servico.status === 'reprovado' && (
            <>
              <Separator className="opacity-40" />
              <div>
                <Label className="text-xs font-medium flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5 text-green-600" />
                  Foto da Correção
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">Registre após o serviço ser corrigido pela empresa.</p>
                {servico.foto_correcao_url ? (
                  <div className="mt-1 relative">
                    <img src={servico.foto_correcao_url} alt="Foto da correção" className="w-full h-32 object-cover rounded-md border-2 border-green-400" />
                    <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6" onClick={() => onUpdate(servico.id, { foto_correcao_url: null })}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="mt-1 h-8 text-xs w-full border-dashed border-green-500 text-green-700 hover:bg-green-50" disabled={uploadingCorrecao} onClick={() => correcaoInputRef.current?.click()}>
                    {uploadingCorrecao ? 'Enviando...' : <><Plus className="h-3.5 w-3.5 mr-1" />Registrar foto da correção</>}
                  </Button>
                )}
                <input ref={correcaoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotoCorrecao} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
