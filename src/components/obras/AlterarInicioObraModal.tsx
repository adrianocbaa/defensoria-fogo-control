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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarClock, Info } from 'lucide-react';
import { useAlterarInicioObra, useObraInicioHistorico, addDaysIso } from '@/hooks/useObraInicio';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obraId: string;
  dataInicioAtual: string | null;
  dataInicioPrevista?: string | null;
  prazoTotalDias?: number;
}

function fmt(iso?: string | null) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

export function AlterarInicioObraModal({
  open,
  onOpenChange,
  obraId,
  dataInicioAtual,
  dataInicioPrevista,
  prazoTotalDias = 0,
}: Props) {
  const [dataNova, setDataNova] = useState(dataInicioAtual ?? '');
  const [motivo, setMotivo] = useState('');
  const [documento, setDocumento] = useState('');
  const { data: historico } = useObraInicioHistorico(open ? obraId : undefined);
  const alterar = useAlterarInicioObra();

  const novoTermino = dataNova && prazoTotalDias > 0 ? addDaysIso(dataNova, prazoTotalDias) : null;
  const valido = !!dataNova && motivo.trim().length >= 10 && dataNova !== dataInicioAtual;

  const handleSubmit = async () => {
    if (!valido) return;
    await alterar.mutateAsync({
      obraId,
      dataAnterior: dataInicioAtual,
      dataNova,
      motivo,
      documentoUrl: documento,
    });
    setMotivo('');
    setDocumento('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Alterar data de início da obra
          </DialogTitle>
          <DialogDescription>
            Use apenas após a formalização por e-mail entre a Defensoria e a contratada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Início previsto (NAD)</div>
              <div className="font-medium">{fmt(dataInicioPrevista)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Início vigente</div>
              <div className="font-medium">{fmt(dataInicioAtual)}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nova-data">Nova data de início efetiva</Label>
            <Input
              id="nova-data"
              type="date"
              value={dataNova}
              onChange={(e) => setDataNova(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo / referência da formalização</Label>
            <Textarea
              id="motivo"
              rows={3}
              placeholder="Ex.: Contratada formalizou antecipação por e-mail em 05/08/2026, aceita pela fiscalização."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Mínimo de 10 caracteres.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="documento">Link do documento / e-mail (opcional)</Label>
            <Input
              id="documento"
              placeholder="https://... ou nº do SEI"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
            />
          </div>

          {novoTermino && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                A previsão de término será recalculada para <strong>{fmt(novoTermino)}</strong>{' '}
                ({prazoTotalDias} dias de prazo). O RDO só poderá ser preenchido a partir de{' '}
                <strong>{fmt(dataNova)}</strong>.
              </AlertDescription>
            </Alert>
          )}

          {!!historico?.length && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Histórico de alterações</div>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-2">
                {historico.map((h) => (
                  <div key={h.id} className="text-xs">
                    <div className="font-medium">
                      {fmt(h.data_anterior)} → {fmt(h.data_nova)}
                    </div>
                    <div className="text-muted-foreground">
                      {h.motivo} — {h.changed_by_name ?? 'usuário'} em {fmt(h.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!valido || alterar.isPending}>
            {alterar.isPending ? 'Salvando...' : 'Confirmar alteração'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
