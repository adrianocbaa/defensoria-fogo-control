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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RESPONSABILIDADE_LABEL, type Responsabilidade } from '@/lib/entrega/constants';
import type { BibliotecaGrupo, EntregaAmbiente } from '@/hooks/useEntregaInstitucional';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  biblioteca: BibliotecaGrupo[];
  ambientes: EntregaAmbiente[];
  ambienteAtivoId: string | null;
  onConfirmar: (args: {
    bibliotecaGrupoId: string;
    responsabilidade: Responsabilidade;
    ambienteIds: string[];
  }) => Promise<void>;
}

const RESPONSABILIDADES: Responsabilidade[] = [
  'contratada',
  'dif_engenharia',
  'administracao',
  'terceiro',
];

/** Aplica um serviço complementar pós-obra (ex.: persianas, mobiliário) a vários ambientes. */
export function ServicoComplementarSheet({
  open,
  onOpenChange,
  biblioteca,
  ambientes,
  ambienteAtivoId,
  onConfirmar,
}: Props) {
  const [grupoId, setGrupoId] = useState<string>('');
  const [responsabilidade, setResponsabilidade] = useState<Responsabilidade>('contratada');
  const [selecionados, setSelecionados] = useState<string[]>(
    ambienteAtivoId ? [ambienteAtivoId] : [],
  );
  const [salvando, setSalvando] = useState(false);

  const alternar = (id: string) =>
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const confirmar = async () => {
    if (!grupoId || !selecionados.length) return;
    setSalvando(true);
    await onConfirmar({ bibliotecaGrupoId: grupoId, responsabilidade, ambienteIds: selecionados });
    setSalvando(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar serviço complementar</DialogTitle>
          <DialogDescription>
            Serviços pós-obra (persianas, mobiliário, climatização) podem ser verificados em vários
            ambientes de uma só vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Serviço / grupo de verificação</Label>
            <Select value={grupoId} onValueChange={setGrupoId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {biblioteca.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Responsabilidade padrão</Label>
            <Select
              value={responsabilidade}
              onValueChange={(v) => setResponsabilidade(v as Responsabilidade)}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESPONSABILIDADES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {RESPONSABILIDADE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Aplicar aos ambientes ({selecionados.length})</Label>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border p-2">
              {ambientes.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selecionados.includes(a.id)}
                    onCheckedChange={() => alternar(a.id)}
                  />
                  <span className="min-w-0 flex-1 truncate">{a.nome}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelecionados(ambientes.map((a) => a.id))}
              >
                Selecionar todos
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelecionados([])}>
                Limpar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!grupoId || !selecionados.length || salvando} onClick={confirmar}>
            {salvando ? 'Aplicando...' : 'Aplicar serviço'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
