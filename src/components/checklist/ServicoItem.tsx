import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import type { ChecklistServico } from '@/hooks/useChecklistDinamico';

interface ServicoItemProps {
  servico: ChecklistServico;
  onUpdate: (id: string, updates: Partial<ChecklistServico>) => void;
  onDelete: (id: string) => void;
  onUploadFoto: (file: File, servicoId: string, tipo: 'reprovacao' | 'correcao') => Promise<string | null>;
}

const statusConfig = {
  pendente: { label: 'Pendente', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  aprovado: { label: 'Aprovado', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  reprovado: { label: 'Reprovado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
};

export function ServicoItem({ servico, onUpdate, onDelete, onUploadFoto }: ServicoItemProps) {
  const [expanded, setExpanded] = useState(servico.status === 'reprovado');
  const [observacao, setObservacao] = useState(servico.observacao ?? '');
  const [uploadingRepro, setUploadingRepro] = useState(false);
  const [uploadingCorrecao, setUploadingCorrecao] = useState(false);
  const reproInputRef = useRef<HTMLInputElement>(null);
  const correcaoInputRef = useRef<HTMLInputElement>(null);

  const config = statusConfig[servico.status] ?? statusConfig.pendente;
  const Icon = config.icon;

  const handleStatus = async (status: 'aprovado' | 'reprovado' | 'pendente') => {
    onUpdate(servico.id, { status });
    if (status === 'reprovado') setExpanded(true);
  };

  const handleObservacaoBlur = () => {
    if (observacao !== servico.observacao) {
      onUpdate(servico.id, { observacao });
    }
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

  return (
    <div className={`border rounded-lg transition-all ${config.bg}`}>
      {/* Header do item */}
      <div className="flex items-start gap-2 p-3">
        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{servico.descricao}</p>
          {servico.is_padrao && (
            <Badge variant="outline" className="text-[10px] mt-0.5 h-4">Padrão</Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(servico.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-2 px-3 pb-3">
        <Button
          size="sm"
          variant={servico.status === 'aprovado' ? 'default' : 'outline'}
          className={`flex-1 h-7 text-xs ${servico.status === 'aprovado' ? 'bg-green-600 hover:bg-green-700 text-white border-none' : 'hover:border-green-500 hover:text-green-600'}`}
          onClick={() => handleStatus(servico.status === 'aprovado' ? 'pendente' : 'aprovado')}
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          Aprovar
        </Button>
        <Button
          size="sm"
          variant={servico.status === 'reprovado' ? 'default' : 'outline'}
          className={`flex-1 h-7 text-xs ${servico.status === 'reprovado' ? 'bg-red-600 hover:bg-red-700 text-white border-none' : 'hover:border-red-500 hover:text-red-600'}`}
          onClick={() => handleStatus(servico.status === 'reprovado' ? 'pendente' : 'reprovado')}
        >
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Reprovar
        </Button>
      </div>

      {/* Área expandida (observação + fotos) */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-current/10 pt-3">
          {/* Observação */}
          <div>
            <Label className="text-xs font-medium">Observação</Label>
            <Textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              onBlur={handleObservacaoBlur}
              placeholder="Descreva o problema encontrado ou observação relevante..."
              rows={2}
              className="mt-1 text-xs resize-none"
            />
          </div>

          {/* Foto de reprovação */}
          <div>
            <Label className="text-xs font-medium flex items-center gap-1">
              <Camera className="h-3.5 w-3.5 text-red-500" />
              Foto do Problema
            </Label>
            {servico.foto_reprovacao_url ? (
              <div className="mt-1 relative">
                <img
                  src={servico.foto_reprovacao_url}
                  alt="Foto do problema"
                  className="w-full h-32 object-cover rounded-md border"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => onUpdate(servico.id, { foto_reprovacao_url: null })}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="mt-1 h-8 text-xs w-full border-dashed"
                disabled={uploadingRepro}
                onClick={() => reproInputRef.current?.click()}
              >
                {uploadingRepro ? (
                  <span className="flex items-center gap-1"><span className="animate-spin">⟳</span> Enviando...</span>
                ) : (
                  <><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar foto do problema</>
                )}
              </Button>
            )}
            <input ref={reproInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoReprovacao} />
          </div>

          {/* Foto de correção (só aparece se foi reprovado) */}
          {servico.status === 'reprovado' && (
            <>
              <Separator className="opacity-50" />
              <div>
                <Label className="text-xs font-medium flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5 text-green-500" />
                  Foto da Correção
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Registre a foto após o serviço ser corrigido.
                </p>
                {servico.foto_correcao_url ? (
                  <div className="mt-1 relative">
                    <img
                      src={servico.foto_correcao_url}
                      alt="Foto da correção"
                      className="w-full h-32 object-cover rounded-md border border-green-300"
                    />
                    <Badge className="absolute top-1 left-1 text-[10px] bg-green-600">Corrigido</Badge>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => onUpdate(servico.id, { foto_correcao_url: null })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1 h-8 text-xs w-full border-dashed border-green-400 text-green-700 hover:bg-green-50"
                    disabled={uploadingCorrecao}
                    onClick={() => correcaoInputRef.current?.click()}
                  >
                    {uploadingCorrecao ? (
                      <span className="flex items-center gap-1"><span className="animate-spin">⟳</span> Enviando...</span>
                    ) : (
                      <><Plus className="h-3.5 w-3.5 mr-1" /> Registrar foto da correção</>
                    )}
                  </Button>
                )}
                <input ref={correcaoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoCorrecao} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
