import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { NIVEL_IMPACTO_LABEL } from '@/lib/avaliacao/labels';

export interface PendingChange {
  entity_type: string;
  entity_id: string;
  campo: string;
  valor: unknown;
  rotulo: string;
}

/** Mostra o impacto técnico antes de aplicar uma alteração e registra o motivo no histórico. */
export function ImpactDialog({ avaliacaoId, change, onClose, onApplied }: {
  avaliacaoId: string; change: PendingChange | null; onClose: () => void; onApplied: () => void;
}) {
  const [impact, setImpact] = useState<{ nivel: string; descricao: string; afetados: { entidade: string; quantidade: number }[] } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setImpact(null); setMotivo('');
    if (!change) return;
    rpc<any>('aval_evaluate_change_impact', { p_avaliacao: avaliacaoId, p_entity_type: change.entity_type, p_campo: change.campo, p_entity_id: change.entity_id })
      .then(setImpact).catch((e) => toast.error(avalErrorMessage(e)));
  }, [avaliacaoId, change]);

  const apply = async () => {
    if (!change) return;
    setBusy(true);
    try {
      await rpc('aval_apply_change', { p_avaliacao: avaliacaoId, p_entity_type: change.entity_type, p_entity_id: change.entity_id,
        p_campo: change.campo, p_valor: change.valor, p_motivo: motivo.trim() || null });
      toast.success('Alteração aplicada.');
      onApplied();
      onClose();
    } catch (e) { toast.error(avalErrorMessage(e)); } finally { setBusy(false); }
  };

  const grave = impact && !['NO_IMPACT', 'REPORT_ONLY'].includes(impact.nivel);
  return (
    <AlertDialog open={!!change} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar alteração — {change?.rotulo}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              {!impact ? <p>Calculando impacto…</p> : (
                <>
                  <p className={grave ? 'flex items-start gap-2 text-destructive' : ''}>{grave && <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}{NIVEL_IMPACTO_LABEL[impact.nivel] ?? impact.descricao}</p>
                  {impact.afetados.length > 0 && (
                    <ul className="list-disc pl-5">{impact.afetados.map((a) => <li key={a.entidade}>{a.entidade}: {a.quantidade}</li>)}</ul>
                  )}
                  <p className="text-muted-foreground">Nada é apagado: os itens afetados ficam marcados como desatualizados e o histórico preserva o valor anterior.</p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="impact-motivo">Motivo (fica no histórico)</Label>
          <Textarea id="impact-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} rows={2} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={!impact || busy} onClick={(e) => { e.preventDefault(); apply(); }}>Aplicar alteração</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
