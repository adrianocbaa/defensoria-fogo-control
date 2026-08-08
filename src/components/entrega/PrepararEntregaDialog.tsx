import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, UserRound } from 'lucide-react';
import { PAPEL_LABEL, formatarData } from '@/lib/entrega/constants';
import type { RecebimentoDefinitivo } from '@/hooks/useEntregaInstitucional';

interface Participante {
  nome: string;
  papel: string;
  funcao: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  definitivo: RecebimentoDefinitivo | null;
  salvando: boolean;
  onConfirmar: (args: {
    data: string;
    observacoes?: string;
    participantes: { userId: string | null; nome: string; papel: string; funcao?: string | null }[];
  }) => Promise<void>;
}

const PAPEIS = ['fiscal', 'gestor', 'diretoria', 'outro'];

export function PrepararEntregaDialog({
  open,
  onOpenChange,
  definitivo,
  salvando,
  onConfirmar,
}: Props) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(hoje);
  const [observacoes, setObservacoes] = useState('');
  const [participantes, setParticipantes] = useState<Participante[]>([
    { nome: '', papel: 'fiscal', funcao: '' },
  ]);

  const atualizar = (i: number, campo: keyof Participante, valor: string) =>
    setParticipantes((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));

  const confirmar = async () => {
    await onConfirmar({
      data,
      observacoes: observacoes.trim() || undefined,
      participantes: participantes
        .filter((p) => p.nome.trim())
        .map((p) => ({
          userId: null,
          nome: p.nome.trim(),
          papel: p.papel,
          funcao: p.funcao.trim() || null,
        })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Preparar Entrega Institucional</DialogTitle>
          <DialogDescription>
            Os ambientes são importados automaticamente do Recebimento Definitivo, com os checklists
            institucionais aplicados por tipo de ambiente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/40 p-3 text-sm">
            <p className="font-semibold">Recebimento Definitivo</p>
            <p className="text-muted-foreground">
              {definitivo
                ? `Concluído em ${formatarData(definitivo.concluido_em ?? definitivo.data)}`
                : 'Não concluído — a entrega não pode ser iniciada.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entrega-data">Data da entrega</Label>
            <Input
              id="entrega-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label>Participantes</Label>
            {participantes.map((p, i) => (
              <div key={i} className="space-y-2 rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={p.nome}
                    onChange={(e) => atualizar(i, 'nome', e.target.value)}
                    placeholder="Nome do participante"
                    className="h-10"
                  />
                  {participantes.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive"
                      aria-label="Remover participante"
                      onClick={() =>
                        setParticipantes((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={p.papel} onValueChange={(v) => atualizar(i, 'papel', v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAPEIS.map((papel) => (
                        <SelectItem key={papel} value={papel}>
                          {PAPEL_LABEL[papel] ?? papel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={p.funcao}
                    onChange={(e) => atualizar(i, 'funcao', e.target.value)}
                    placeholder="Função / cargo"
                    className="h-10"
                  />
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              className="h-10 w-full"
              onClick={() =>
                setParticipantes((prev) => [...prev, { nome: '', papel: 'gestor', funcao: '' }])
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar participante
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entrega-obs">Observações (opcional)</Label>
            <Textarea
              id="entrega-obs"
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!definitivo || salvando} onClick={confirmar}>
            {salvando ? 'Preparando...' : 'Preparar entrega'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
