import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Trash2,
  Plus,
} from 'lucide-react';
import type { ChecklistAmbiente, ChecklistServico } from '@/hooks/useChecklistDinamico';
import { ServicoItem } from './ServicoItem';

interface ServicosProps {
  ambiente: ChecklistAmbiente | null;
  obraId: string;
  onUpdateServico: (id: string, updates: Partial<ChecklistServico>) => void;
  onDeleteServico: (id: string) => void;
  onAddServico: (ambienteId: string, descricao: string) => void;
  onDeleteAmbiente: (id: string) => void;
  onUploadFoto: (file: File, servicoId: string, tipo: 'reprovacao' | 'correcao') => Promise<string | null>;
  onPinRequest: (servicoId: string, descricao: string) => void;
}

export function ServicosPanel({
  ambiente,
  obraId,
  onUpdateServico,
  onDeleteServico,
  onAddServico,
  onDeleteAmbiente,
  onUploadFoto,
  onPinRequest,
}: ServicosProps) {
  const [newServico, setNewServico] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  if (!ambiente) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
        <MapPin className="h-12 w-12 mb-3 opacity-30" />
        <p className="font-medium">Nenhum ambiente selecionado</p>
        <p className="text-sm mt-1">Clique em um ambiente marcado no PDF ou selecione um na lista.</p>
      </div>
    );
  }

  const total = ambiente.servicos.length;
  const aprovados = ambiente.servicos.filter(s => s.status === 'aprovado').length;
  const reprovados = ambiente.servicos.filter(s => s.status === 'reprovado').length;
  const pendentes = ambiente.servicos.filter(s => s.status === 'pendente').length;

  const handleAddServico = () => {
    if (newServico.trim()) {
      onAddServico(ambiente.id, newServico.trim());
      setNewServico('');
      setShowAdd(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-base">{ambiente.nome}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Página {ambiente.pagina}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => onDeleteAmbiente(ambiente.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {total > 0 && (
          <div className="flex gap-3 mt-3">
            <div className="flex items-center gap-1 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              <span className="font-medium text-green-700">{aprovados}</span>
              <span className="text-muted-foreground">aprovados</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <span className="font-medium text-red-600">{reprovados}</span>
              <span className="text-muted-foreground">reprovados</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Clock className="h-3.5 w-3.5 text-yellow-600" />
              <span className="font-medium text-yellow-700">{pendentes}</span>
              <span className="text-muted-foreground">pendentes</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {ambiente.servicos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhum serviço cadastrado.</p>
            <p className="text-xs mt-1">Adicione serviços para verificar neste ambiente.</p>
          </div>
        ) : (
          ambiente.servicos.map(servico => (
            <ServicoItem
              key={servico.id}
              servico={servico}
              obraId={obraId}
              onUpdate={onUpdateServico}
              onDelete={onDeleteServico}
              onUploadFoto={onUploadFoto}
              onPinRequest={onPinRequest}
            />
          ))
        )}
      </div>

      <div className="p-3 border-t bg-background">
        {showAdd ? (
          <div className="flex gap-2">
            <Input
              value={newServico}
              onChange={e => setNewServico(e.target.value)}
              placeholder="Descreva o serviço..."
              className="text-sm h-8"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddServico();
                if (e.key === 'Escape') { setShowAdd(false); setNewServico(''); }
              }}
            />
            <Button size="sm" className="h-8" onClick={handleAddServico}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => { setShowAdd(false); setNewServico(''); }}>
              ✕
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs border-dashed"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar serviço
          </Button>
        )}
      </div>
    </div>
  );
}
