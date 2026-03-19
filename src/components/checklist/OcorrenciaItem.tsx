import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2, XCircle, Clock, Camera, Image as ImageIcon,
  Trash2, Plus, ChevronDown, ChevronUp, AlertTriangle, Minus, Paintbrush, MapPin, X,
} from 'lucide-react';
import type { ChecklistOcorrencia } from '@/hooks/useChecklistOcorrencias';

type Gravidade = 'critico' | 'medio' | 'estetico';

const GRAVIDADE_CONFIG: Record<Gravidade, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  critico:  { label: 'Crítico',  color: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-400',    Icon: AlertTriangle },
  medio:    { label: 'Médio',    color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-400', Icon: Minus },
  estetico: { label: 'Estético', color: 'text-blue-700',   bg: 'bg-blue-100',   border: 'border-blue-400',   Icon: Paintbrush },
};

interface OcorrenciaItemProps {
  ocorrencia: ChecklistOcorrencia;
  index: number;
  onUpdate: (id: string, updates: Partial<ChecklistOcorrencia>) => void;
  onDelete: (id: string) => void;
  onUploadFoto: (file: File, id: string, tipo: 'reprovacao' | 'correcao') => Promise<string | null>;
  onPinRequest: (ocorrenciaId: string, descricao: string) => void;
}

export function OcorrenciaItem({
  ocorrencia, index, onUpdate, onDelete, onUploadFoto, onPinRequest,
}: OcorrenciaItemProps) {
  const [expanded, setExpanded] = useState(true);
  const [observacao, setObservacao] = useState(ocorrencia.observacao ?? '');
  const [descricao, setDescricao] = useState(ocorrencia.descricao ?? '');
  const [uploadingRepro, setUploadingRepro] = useState(false);
  const [uploadingCorrecao, setUploadingCorrecao] = useState(false);
  const reproRef = useRef<HTMLInputElement>(null);
  const correcaoRef = useRef<HTMLInputElement>(null);

  const gravidade: Gravidade = (ocorrencia.gravidade as Gravidade) ?? 'medio';
  const gConfig = GRAVIDADE_CONFIG[gravidade];
  const GIcon = gConfig.Icon;

  const statusColors = {
    pendente: 'border-yellow-200 bg-yellow-50',
    aprovado: 'border-green-200 bg-green-50',
    reprovado: 'border-red-200 bg-red-50',
  };
  const StatusIcon = ocorrencia.status === 'aprovado' ? CheckCircle2 : ocorrencia.status === 'reprovado' ? XCircle : Clock;
  const iconColor = ocorrencia.status === 'aprovado' ? 'text-green-600' : ocorrencia.status === 'reprovado' ? 'text-destructive' : 'text-yellow-600';

  const handleFotoRepro = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRepro(true);
    const url = await onUploadFoto(file, ocorrencia.id, 'reprovacao');
    if (url) onUpdate(ocorrencia.id, { foto_reprovacao_url: url });
    setUploadingRepro(false);
    e.target.value = '';
  };

  const handleFotoCorrecao = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCorrecao(true);
    const url = await onUploadFoto(file, ocorrencia.id, 'correcao');
    if (url) onUpdate(ocorrencia.id, { foto_correcao_url: url });
    setUploadingCorrecao(false);
    e.target.value = '';
  };

  return (
    <div className={`border rounded-lg text-sm ${statusColors[ocorrencia.status] ?? 'border-border bg-muted/20'}`}>
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground shrink-0`}>
          {index + 1}
        </div>
        <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />
        <div className="flex-1 min-w-0">
          {expanded ? (
            <Input
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              onBlur={() => onUpdate(ocorrencia.id, { descricao: descricao || null })}
              placeholder="Descreva esta ocorrência..."
              className="h-8 text-xs"
            />
          ) : (
            <p className="text-xs font-medium truncate">{descricao || `Ocorrência ${index + 1}`}</p>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 rounded-full border ${gConfig.bg} ${gConfig.color} ${gConfig.border}`}>
              <GIcon className="h-2 w-2" />{gConfig.label}
            </span>
            {ocorrencia.foto_correcao_url && (
              <Badge className="text-[9px] h-3.5 bg-green-600 px-1">Corrigido</Badge>
            )}
            {ocorrencia.location_pin && (
              <Badge variant="outline" className="text-[9px] h-3.5 border-destructive text-destructive px-1 gap-0.5">
                <MapPin className="h-2 w-2" />Pin
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 hover:text-destructive" onClick={() => onDelete(ocorrencia.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className="flex gap-1.5 px-3 pb-2">
        {(['aprovado', 'reprovado', 'pendente'] as const).map(s => (
          <button
            key={s}
            onClick={() => onUpdate(ocorrencia.id, { status: s })}
            className={`flex-1 flex items-center justify-center gap-0.5 text-[10px] font-medium py-1 rounded border transition-all ${
              ocorrencia.status === s
                ? s === 'aprovado' ? 'bg-green-600 text-white border-green-600'
                  : s === 'reprovado' ? 'bg-destructive text-destructive-foreground border-destructive'
                  : 'bg-yellow-500 text-white border-yellow-500'
                : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
            }`}
          >
            {s === 'aprovado' ? <CheckCircle2 className="h-2.5 w-2.5" /> : s === 'reprovado' ? <XCircle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Detalhes expandidos */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t pt-2.5">
          {/* Gravidade */}
          <div>
            <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Gravidade</Label>
            <div className="flex gap-1 mt-1">
              {(Object.entries(GRAVIDADE_CONFIG) as [Gravidade, typeof GRAVIDADE_CONFIG[Gravidade]][]).map(([key, cfg]) => {
                const Ic = cfg.Icon;
                return (
                  <button
                    key={key}
                    onClick={() => onUpdate(ocorrencia.id, { gravidade: key })}
                    className={`flex-1 flex items-center justify-center gap-0.5 text-[10px] font-medium py-1 rounded border transition-all ${
                      gravidade === key
                        ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm`
                        : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
                    }`}
                  >
                    <Ic className="h-2.5 w-2.5" />{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pin */}
          <div>
            <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Localização</Label>
            {ocorrencia.location_pin ? (
              <div className="mt-1 flex items-center justify-between bg-destructive/10 border border-destructive/30 rounded px-2 py-1">
                <span className="text-[10px] text-destructive font-medium flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5" /> Pin marcado
                </span>
                <div className="flex gap-0.5">
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => onPinRequest(ocorrencia.id, descricao || `Ocorrência ${index + 1}`)}>
                    <MapPin className="h-2.5 w-2.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-5 w-5 hover:text-destructive" onClick={() => onUpdate(ocorrencia.id, { location_pin: null })}>
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="mt-1 h-6 text-[10px] w-full border-dashed border-destructive/50 text-destructive hover:bg-destructive/5" onClick={() => onPinRequest(ocorrencia.id, descricao || `Ocorrência ${index + 1}`)}>
                <MapPin className="h-2.5 w-2.5 mr-1" /> Marcar no projeto
              </Button>
            )}
          </div>

          {/* Observação */}
          <div>
            <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Observação</Label>
            <Textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              onBlur={() => { if (observacao !== (ocorrencia.observacao ?? '')) onUpdate(ocorrencia.id, { observacao }); }}
              placeholder="Descreva o problema..."
              rows={3}
              className="mt-1 text-sm resize-none min-h-[72px]"
            />
          </div>

          {/* Foto do problema */}
          <div>
            <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Camera className="h-2.5 w-2.5 text-destructive" /> Foto do Problema
            </Label>
            {ocorrencia.foto_reprovacao_url ? (
              <div className="mt-1 relative">
                <img src={ocorrencia.foto_reprovacao_url} alt="Foto problema" className="w-full h-28 object-cover rounded border" />
                <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-5 w-5" onClick={() => onUpdate(ocorrencia.id, { foto_reprovacao_url: null })}>
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="mt-1 h-7 text-[10px] w-full border-dashed" disabled={uploadingRepro} onClick={() => reproRef.current?.click()}>
                {uploadingRepro ? 'Enviando...' : <><Plus className="h-3 w-3 mr-1" />Adicionar foto</>}
              </Button>
            )}
            <input ref={reproRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotoRepro} />
          </div>

          {/* Foto da correção */}
          {ocorrencia.status === 'reprovado' && (
            <>
              <Separator className="opacity-30" />
              <div>
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <ImageIcon className="h-2.5 w-2.5 text-green-600" /> Foto da Correção
                </Label>
                {ocorrencia.foto_correcao_url ? (
                  <div className="mt-1 relative">
                    <img src={ocorrencia.foto_correcao_url} alt="Foto correção" className="w-full h-28 object-cover rounded border-2 border-green-400" />
                    <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-5 w-5" onClick={() => onUpdate(ocorrencia.id, { foto_correcao_url: null })}>
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="mt-1 h-7 text-[10px] w-full border-dashed border-green-500 text-green-700 hover:bg-green-50" disabled={uploadingCorrecao} onClick={() => correcaoRef.current?.click()}>
                    {uploadingCorrecao ? 'Enviando...' : <><Plus className="h-3 w-3 mr-1" />Foto após correção</>}
                  </Button>
                )}
                <input ref={correcaoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotoCorrecao} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
