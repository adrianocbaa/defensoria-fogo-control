import { useEffect, useState } from 'react';
import { CheckCircle2, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { db, engine, rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { CRITERIO_STATUS_LABEL, OVERALL_LABEL, fmtDateTime } from '@/lib/avaliacao/labels';

const statusVariant = (s: string) => (s === 'ATENDE' ? 'secondary' : s === 'NAO_ATENDE' ? 'destructive' : 'outline') as 'secondary' | 'destructive' | 'outline';

export function ValidacaoBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const av = ctx.avaliacao.data!;
  const [modeloId, setModeloId] = useState<string>('');
  const [review, setReview] = useState<{ codigo: string; nome: string; decisao: string; just: string } | null>(null);
  const [aceite, setAceite] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const q = useAvalQuery(av.id, 'validacao', async () => {
    const [mods, ac] = await Promise.all([
      db.from('avaliacao_modelos').select('id, numero, nome, status, stale').eq('avaliacao_id', av.id).in('status', ['EM_VALIDACAO']).order('numero', { ascending: false }),
      db.from('model_acceptances').select('*, avaliacao_modelos(nome)').eq('avaliacao_id', av.id).order('accepted_at', { ascending: false }).limit(20),
    ]);
    return { modelos: (mods.data ?? []) as any[], aceites: (ac.data ?? []) as any[] };
  });
  useEffect(() => {
    if (!modeloId && q.data?.modelos.length) setModeloId(q.data.modelos.find((m) => !m.stale)?.id ?? q.data.modelos[0].id);
  }, [q.data, modeloId]);
  const val = useAvalQuery(av.id, `validacao-${modeloId}`, async () => {
    const { data: v } = await db.from('model_validations').select('*').eq('modelo_id', modeloId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!v) return { v: null, results: [], reviews: [] };
    const [r, rv] = await Promise.all([
      db.from('model_validation_results').select('*').eq('validation_id', v.id).order('numero'),
      db.from('validation_manual_reviews').select('*').eq('modelo_id', modeloId).order('created_at', { ascending: false }),
    ]);
    return { v: v as any, results: (r.data ?? []) as any[], reviews: (rv.data ?? []) as any[] };
  }, !!modeloId);

  const modelo = q.data?.modelos.find((m) => m.id === modeloId);
  const vigente = q.data?.aceites.find((a) => a.status === 'VIGENTE');
  const v = val.data?.v;
  const reviewsAfter = v && (val.data?.reviews ?? []).some((r) => r.created_at > v.created_at);

  const rodar = async () => {
    setBusy(true);
    try { const r: any = await engine({ action: 'run_validation', modelo_id: modeloId }); toast.success(`Validação concluída: ${OVERALL_LABEL[r.overall] ?? r.overall}.`); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); ctx.refresh(); }
  };
  const salvarReview = async () => {
    if (!review) return;
    try { await rpc('aval_manual_review', { p_modelo: modeloId, p_codigo: review.codigo, p_decisao: review.decisao, p_justificativa: review.just }); toast.success('Análise registrada. Execute a validação novamente para incorporá-la.'); setReview(null); ctx.refresh(); }
    catch (e) { toast.error(avalErrorMessage(e)); }
  };
  const aceitar = async () => {
    try { await rpc('aval_accept_model', { p_validation: v.id, p_justificativa: aceite }); toast.success('Modelo aceito.'); setAceite(null); ctx.refresh(); }
    catch (e) { toast.error(avalErrorMessage(e)); }
  };

  return (
    <div className="space-y-5">
      {vigente && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" />Modelo aceito vigente: <strong>{vigente.avaliacao_modelos?.nome}</strong> em {fmtDateTime(vigente.accepted_at)}.</div>
      )}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 flex-wrap gap-2">
          <CardTitle className="text-base">Validação do modelo</CardTitle>
          <div className="flex items-center gap-2">
            {(q.data?.modelos ?? []).length > 0 && (
              <Select value={modeloId} onValueChange={setModeloId}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Modelo" /></SelectTrigger>
                <SelectContent>{q.data!.modelos.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}{m.stale ? ' (desatualizado)' : ''}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {ctx.can('validation.run') && modelo && !modelo.stale && <Button size="sm" onClick={rodar} disabled={busy}><PlayCircle className="h-4 w-4 mr-1" />{busy ? 'Validando…' : v ? 'Validar novamente' : 'Executar validação'}</Button>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(q.data?.modelos ?? []).length === 0 && <p className="text-sm text-muted-foreground">Envie um modelo calculado para validação no bloco Modelagem.</p>}
          {modelo && !v && <p className="text-sm text-muted-foreground">Ainda não validado.</p>}
          {v && (
            <>
              <div className="grid gap-3 sm:grid-cols-4 text-sm">
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Situação</p><p className="font-semibold">{OVERALL_LABEL[v.overall_status]}</p></div>
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Fundamentação</p><p className="font-semibold">{v.fundamentacao_grau ? `Grau ${v.fundamentacao_grau}` : 'Não enquadrado'}</p></div>
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Precisão (preliminar)</p><p className="font-semibold">{v.precisao_grau ? `Grau ${v.precisao_grau}` : 'Não enquadrado'}</p></div>
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Política</p><p className="font-semibold">{v.resumo_json?.politica?.codigo} v{v.resumo_json?.politica?.versao}</p></div>
              </div>
              {(v.stale || reviewsAfter) && <p className="text-sm text-destructive">{v.stale ? 'Esta validação está desatualizada.' : 'Há análises manuais posteriores — execute a validação novamente.'}</p>}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Critério</TableHead><TableHead>Situação</TableHead><TableHead>Grau</TableHead><TableHead>Detalhe</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>{(val.data?.results ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="tabular-nums">{r.numero}</TableCell>
                      <TableCell><p className="font-medium">{r.nome}</p><p className="text-xs text-muted-foreground">{r.modo === 'MANUAL' ? 'Análise manual' : r.modo === 'ASSISTIDO' ? 'Assistido' : r.modo === 'DERIVADO' ? 'Derivado' : 'Automático'}{r.bloqueante ? ' · bloqueante' : ''}{r.revisado ? ' · revisado' : ''}</p></TableCell>
                      <TableCell><Badge variant={statusVariant(r.status)}>{CRITERIO_STATUS_LABEL[r.status]}</Badge></TableCell>
                      <TableCell>{r.grau ?? '—'}</TableCell>
                      <TableCell className="text-xs max-w-md">{r.detalhe}</TableCell>
                      <TableCell>{ctx.can('validation.manual_review') && ['REQUER_ANALISE', 'NAO_VERIFICADO'].includes(r.status) && !v.stale &&
                        <Button size="sm" variant="outline" onClick={() => setReview({ codigo: r.codigo, nome: r.nome, decisao: 'ATENDE', just: '' })}>Analisar</Button>}</TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
              {ctx.can('validation.accept') && !v.stale && !reviewsAfter && ['APTO', 'APTO_COM_RESSALVAS'].includes(v.overall_status) && (
                <div className="flex justify-end"><Button onClick={() => setAceite('')}><CheckCircle2 className="h-4 w-4 mr-1" />Aceitar este modelo</Button></div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!review} onOpenChange={(o) => !o && setReview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Análise manual — {review?.nome}</DialogTitle><DialogDescription>Registre a sua conclusão técnica e o motivo. Ela entra na próxima validação.</DialogDescription></DialogHeader>
          {review && (
            <div className="grid gap-3">
              <Select value={review.decisao} onValueChange={(d) => setReview({ ...review, decisao: d })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ATENDE">Atende</SelectItem><SelectItem value="NAO_ATENDE">Não atende</SelectItem><SelectItem value="INCONCLUSIVO">Inconclusivo</SelectItem></SelectContent></Select>
              <Label htmlFor="rev-just">Justificativa</Label>
              <Textarea id="rev-just" rows={4} value={review.just} onChange={(e) => setReview({ ...review, just: e.target.value })} maxLength={2000} />
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setReview(null)}>Cancelar</Button><Button onClick={salvarReview}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aceite !== null} onOpenChange={(o) => !o && setAceite(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aceitar {modelo?.nome}</DialogTitle><DialogDescription>O aceite é uma decisão técnica sua. Um aceite anterior será substituído e o resultado econômico precisará ser confirmado novamente.</DialogDescription></DialogHeader>
          <Label htmlFor="ac-just">Justificativa {v?.overall_status === 'APTO_COM_RESSALVAS' ? '(obrigatória — há ressalvas)' : '(opcional)'}</Label>
          <Textarea id="ac-just" rows={4} value={aceite ?? ''} onChange={(e) => setAceite(e.target.value)} maxLength={2000} />
          <DialogFooter><Button variant="outline" onClick={() => setAceite(null)}>Cancelar</Button><Button onClick={aceitar}>Aceitar modelo</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
