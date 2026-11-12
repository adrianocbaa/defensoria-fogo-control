import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Info } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
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
  /** Valor anterior e novo já formatados para exibição. */
  de?: string;
  para?: string;
  contexto?: Record<string, unknown>;
}

interface Impacto {
  nivel: string;
  explicacao: string;
  campos: { i: number; nivel: string; descricao: string }[];
  afetados: { entidade: string; quantidade: number }[];
  outras_avaliacoes: { avaliacao_id: string; codigo: string; nivel: string }[];
  imoveis_compartilhados: { outros_dados: number; outras_avaliacoes: string[] }[];
}

const LEVES = ['NO_IMPACT', 'REPORT_ONLY'];

/**
 * Um único resumo de impacto para todas as alterações de um formulário. O servidor calcula o maior nível,
 * aplica tudo em uma transação, desatualiza os dependentes uma vez e grava antes/depois de cada campo.
 */
export function ImpactDialog({ avaliacaoId, changes, change, titulo, onClose, onApplied }: {
  avaliacaoId: string; changes?: PendingChange[] | null; change?: PendingChange | null; titulo?: string;
  onClose: () => void; onApplied: () => void;
}) {
  const lista = changes ?? (change ? [change] : null);
  const open = !!lista && lista.length > 0;
  const [impact, setImpact] = useState<Impacto | null>(null);
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const payload = (lista ?? []).map((c) => ({ entity_type: c.entity_type, entity_id: c.entity_id, campo: c.campo, valor: c.valor ?? null, rotulo: c.rotulo, ...(c.contexto ? { contexto: c.contexto } : {}) }));
  const key = JSON.stringify(payload);

  useEffect(() => {
    setImpact(null); setMotivo('');
    if (!open) return;
    rpc<Impacto>('aval_evaluate_changes_impact', { p_avaliacao: avaliacaoId, p_changes: payload })
      .then(setImpact).catch((e) => { toast.error(avalErrorMessage(e)); onClose(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avaliacaoId, key]);

  const apply = async () => {
    setBusy(true);
    try {
      const r = await rpc<{ aplicados: number; outras_avaliacoes?: number }>('aval_apply_changes', { p_avaliacao: avaliacaoId, p_changes: payload, p_motivo: motivo.trim() || null });
      if (!r?.aplicados) toast.info('Nenhum campo foi alterado.');
      else toast.success(r.aplicados === 1 ? 'Alteração salva.' : `${r.aplicados} alterações salvas.`);
      onApplied();
      onClose();
    } catch (e) { toast.error(avalErrorMessage(e)); } finally { setBusy(false); }
  };

  const grave = impact && !LEVES.includes(impact.nivel);
  const share = impact?.imoveis_compartilhados?.[0];
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo ?? (lista?.length === 1 ? `Confirmar alteração — ${lista[0].rotulo}` : 'Revisar alterações')}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <ul className="divide-y rounded-md border">
                {(lista ?? []).map((c, i) => {
                  const n = impact?.campos?.[i]?.nivel;
                  return (
                    <li key={`${c.entity_type}-${c.campo}-${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 text-foreground">
                      <span className="font-medium">{c.rotulo}</span>
                      {(c.de !== undefined || c.para !== undefined) && (
                        <span className="flex items-center gap-1 text-muted-foreground"><span className="line-through decoration-muted-foreground/60">{c.de ?? '—'}</span><ArrowRight className="h-3 w-3" aria-hidden /><span className="text-foreground">{c.para ?? '—'}</span></span>
                      )}
                      {n && !LEVES.includes(n) && <Badge variant="outline" className="ml-auto border-destructive/40 text-destructive">{NIVEL_IMPACTO_LABEL[n]}</Badge>}
                    </li>
                  );
                })}
              </ul>
              {!impact ? <p>Calculando impacto…</p> : (
                <>
                  {grave ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1.5">
                      <p className="flex items-start gap-2 font-medium text-destructive"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />Estas alterações impactam: {NIVEL_IMPACTO_LABEL[impact.nivel]?.toLowerCase()}</p>
                      <p className="text-foreground">{impact.explicacao}</p>
                      {impact.afetados.length > 0 && <ul className="list-disc pl-5 text-foreground">{impact.afetados.map((a) => <li key={a.entidade}>{a.entidade}: {a.quantidade}</li>)}</ul>}
                    </div>
                  ) : <p>{impact.explicacao}</p>}
                  {share && (
                    <p className="flex items-start gap-2 rounded-md border bg-muted/40 p-2.5 text-foreground"><Info className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>Este cadastro físico é reutilizado em outros registros{share.outros_dados > 0 ? ` (${share.outros_dados} outro(s) dado(s) de mercado)` : ''}. A correção vale para todos os registros vivos; fotografias de conjuntos congelados não mudam.</span>
                    </p>
                  )}
                  {impact.outras_avaliacoes.length > 0 && (
                    <p className="text-foreground">Também ficam marcadas para revisão: {impact.outras_avaliacoes.map((o) => `${o.codigo} (${NIVEL_IMPACTO_LABEL[o.nivel]?.toLowerCase()})`).join('; ')}.</p>
                  )}
                  <p className="text-muted-foreground">Nada é apagado: o histórico guarda o valor anterior de cada campo.</p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="impact-motivo">Motivo da correção {grave ? '(recomendado)' : '(opcional)'}</Label>
          <Textarea id="impact-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} rows={2} placeholder="Ex.: área conferida na matrícula" />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Voltar</AlertDialogCancel>
          <AlertDialogAction disabled={!impact || busy} onClick={(e) => { e.preventDefault(); apply(); }}>{busy ? 'Salvando…' : 'Salvar alterações'}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
