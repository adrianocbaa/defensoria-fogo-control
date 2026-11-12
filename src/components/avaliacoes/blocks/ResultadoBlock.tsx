import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { db, engine, rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { CENTRO_LABEL, CONCLUSAO_LABEL, VALOR_ADM_LABEL, fmtDateTime, fmtMoney, fmtNum } from '@/lib/avaliacao/labels';

const DIRECAO: Record<string, string> = { ABAIXO_REFERENCIA: 'abaixo da referência', IGUAL_REFERENCIA: 'igual à referência', ACIMA_REFERENCIA: 'acima da referência' };
const POS_IC: Record<string, string> = { ABAIXO_IC: 'abaixo do intervalo de confiança', DENTRO_IC: 'dentro do intervalo de confiança', ACIMA_IC: 'acima do intervalo de confiança', NAO_APLICAVEL: '—' };
const POS_CAMPO: Record<string, string> = { ABAIXO_CAMPO: 'abaixo do campo de arbítrio', DENTRO_CAMPO: 'dentro do campo de arbítrio', ACIMA_CAMPO: 'acima do campo de arbítrio', NAO_APLICAVEL: '—' };
const ORDEM = ['DIRECT', 'MODE', 'MEDIAN', 'MEAN'];
const parse = (s: string) => { const n = Number(s.replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };

export function ResultadoBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const av = ctx.avaliacao.data!;
  const [centro, setCentro] = useState('');
  const [aplicar, setAplicar] = useState(false);
  const [valorArb, setValorArb] = useState('');
  const [just, setJust] = useState('');
  const [caracs, setCaracs] = useState<string[]>([]);
  const [conclusao, setConclusao] = useState('');
  const [concTexto, setConcTexto] = useState('');
  const [busy, setBusy] = useState(false);

  const q = useAvalQuery(av.id, 'resultado', async () => {
    const [ac, pj, res, car, pol] = await Promise.all([
      db.from('model_acceptances').select('*, avaliacao_modelos(nome)').eq('avaliacao_id', av.id).eq('status', 'VIGENTE').maybeSingle(),
      db.from('avaliacao_projecoes').select('*, avaliacao_projecao_centros(*)').eq('avaliacao_id', av.id).eq('stale', false).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('avaliacao_resultado_economico').select('*, avaliacao_valores_adotados(*), avaliacao_compatibilidades(*)').eq('avaliacao_id', av.id).order('confirmado_em', { ascending: false }).limit(10),
      db.from('avaliacao_caracteristicas_relevantes').select('*').eq('avaliacao_id', av.id),
      db.from('arbitration_policies').select('*').eq('status', 'VIGENTE').order('versao', { ascending: false }),
    ]);
    const politica = ((pol.data ?? []) as any[]).sort((a, b) => (a.organization_id ? 0 : 1) - (b.organization_id ? 0 : 1))[0] ?? null;
    return { ac: ac.data as any, pj: pj.data as any, resultados: (res.data ?? []) as any[], caracs: (car.data ?? []) as any[], politica };
  });
  const ac = q.data?.ac; const pj = q.data?.pj;
  const centros: any[] = pj ? [...pj.avaliacao_projecao_centros].sort((a, b) => ORDEM.indexOf(a.centro) - ORDEM.indexOf(b.centro)) : [];
  const sel = centros.find((c) => c.centro === centro);
  const pol = q.data?.politica;
  const campo = sel && pol ? { inf: sel.valor * (1 - pol.percentual_inferior / 100), sup: sel.valor * (1 + pol.percentual_superior / 100) } : null;
  const vigente = (q.data?.resultados ?? []).find((r) => r.status === 'VIGENTE');
  const canConfirm = ctx.can('economic.confirm');

  const projetar = async () => {
    setBusy(true);
    try { await engine({ action: 'project', acceptance_id: ac.id }); toast.success('Projeção oficial calculada.'); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); ctx.refresh(); }
  };
  const confirmar = async () => {
    if (!centro) { toast.error('Selecione a tendência central.'); return; }
    if (!conclusao) { toast.error('Escolha a conclusão.'); return; }
    setBusy(true);
    try {
      await rpc('aval_confirm_economic', {
        p_projecao: pj.id, p_centro: centro, p_aplicar: aplicar, p_valor_arbitrado: aplicar ? parse(valorArb) : null,
        p_justificativa: aplicar ? just : null, p_caracteristicas: aplicar ? caracs : [], p_conclusao: conclusao, p_conclusao_texto: concTexto || null,
      });
      toast.success('Resultado econômico confirmado.');
      ctx.refresh();
    } catch (e) { toast.error(avalErrorMessage(e)); } finally { setBusy(false); }
  };

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!ac) return <Card><CardContent className="p-6 text-sm text-muted-foreground">O resultado econômico só fica disponível após o aceite de um modelo no bloco Validação.</CardContent></Card>;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 flex-wrap gap-2">
          <CardTitle className="text-base">Projeção do modelo aceito — {ac.avaliacao_modelos?.nome}</CardTitle>
          {canConfirm && <Button size="sm" variant={pj ? 'outline' : 'default'} onClick={projetar} disabled={busy}><Calculator className="h-4 w-4 mr-1" />{pj ? 'Recalcular projeção' : 'Calcular projeção oficial'}</Button>}
        </CardHeader>
        <CardContent className="space-y-3">
          {!pj ? <p className="text-sm text-muted-foreground">Calcule a projeção oficial para o avaliando.</p> : (
            <>
              <p className="text-xs text-muted-foreground">Intervalo de confiança de {fmtNum(pj.nivel_confianca * 100, 0)}% · motor {pj.engine_version} · {fmtDateTime(pj.created_at)}{(pj.extrapolacao ?? []).some((x: any) => !x.inside) ? ' · há extrapolação de variável' : ''} · intervalo de predição: não oficial</p>
              <RadioGroup value={centro} onValueChange={setCentro} disabled={!canConfirm}>
                <Table>
                  <TableHeader><TableRow><TableHead className="w-10" /><TableHead>Tendência central</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Limite inferior</TableHead><TableHead className="text-right">Limite superior</TableHead><TableHead className="text-right">Amplitude</TableHead><TableHead>Precisão</TableHead></TableRow></TableHeader>
                  <TableBody>{centros.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell><RadioGroupItem value={c.centro} id={`c-${c.centro}`} aria-label={CENTRO_LABEL[c.centro]} /></TableCell>
                      <TableCell><label htmlFor={`c-${c.centro}`}>{CENTRO_LABEL[c.centro]}</label></TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(c.valor, 2)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(c.limite_inferior, 2)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(c.limite_superior, 2)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(c.amplitude_pct, 2)}%</TableCell>
                      <TableCell>{c.grau_precisao ? `Grau ${c.grau_precisao}` : 'Não enquadrado'}</TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">Valores na unidade da variável dependente. A escolha da tendência central é sua; o sistema não escolhe.</p>
            </>
          )}
        </CardContent>
      </Card>

      {pj && canConfirm && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Decisão do resultado</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3"><Switch id="arb" checked={aplicar} onCheckedChange={setAplicar} disabled={!centro} /><Label htmlFor="arb">Aplicar arbítrio (padrão: não aplicar)</Label></div>
            {aplicar && campo && (
              <div className="grid gap-3 rounded-md border p-3">
                <p>Campo de arbítrio (−{pol.percentual_inferior}% / +{pol.percentual_superior}% — política interna): {fmtNum(campo.inf, 2)} a {fmtNum(campo.sup, 2)}. O arbítrio não altera estatísticas, grau nem precisão.</p>
                <div className="grid gap-1.5 sm:w-56"><Label htmlFor="arb-v">Valor arbitrado</Label><Input id="arb-v" inputMode="decimal" value={valorArb} onChange={(e) => setValorArb(e.target.value)} /></div>
                <div className="grid gap-1.5"><Label htmlFor="arb-j">Justificativa</Label><Textarea id="arb-j" rows={3} value={just} onChange={(e) => setJust(e.target.value)} maxLength={2000} /></div>
                <div><p className="font-medium mb-1">Características que justificam</p>
                  {(q.data?.caracs ?? []).length === 0 ? <p className="text-muted-foreground">Cadastre características relevantes no bloco Imóvel.</p> :
                    q.data!.caracs.map((c) => <label key={c.id} className="flex items-center gap-2 py-0.5"><Checkbox checked={caracs.includes(c.id)} onCheckedChange={(v) => setCaracs(v ? [...caracs, c.id] : caracs.filter((x) => x !== c.id))} />{c.descricao}</label>)}</div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5"><Label>Conclusão</Label>
                <Select value={conclusao} onValueChange={setConclusao}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{Object.entries(CONCLUSAO_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-1.5"><Label htmlFor="conc-t">Complemento (opcional)</Label><Input id="conc-t" value={concTexto} onChange={(e) => setConcTexto(e.target.value)} maxLength={500} /></div>
            </div>
            <div className="flex justify-end"><Button onClick={confirmar} disabled={busy}>Confirmar resultado</Button></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Resultado confirmado</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-3">
          {!vigente ? <p className="text-muted-foreground">{(q.data?.resultados ?? []).some((r) => r.status === 'DESATUALIZADO') ? 'O resultado anterior ficou desatualizado após alterações. Confirme novamente.' : 'Nenhum resultado confirmado.'}</p> : (
            <>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-2xl font-bold tabular-nums">{fmtMoney(vigente.avaliacao_valores_adotados?.valor_final_apresentacao)}</span>
                <Badge variant="outline">{vigente.avaliacao_valores_adotados?.origem === 'ARBITRAMENTO' ? 'Arbitrado' : CENTRO_LABEL[vigente.centro]}</Badge>
                <span className="text-muted-foreground">valor bruto {fmtNum(vigente.avaliacao_valores_adotados?.valor_adotado_bruto, 4)}</span>
              </div>
              <p>Conclusão: <strong>{CONCLUSAO_LABEL[vigente.conclusao]}</strong>{vigente.conclusao_texto ? ` — ${vigente.conclusao_texto}` : ''}</p>
              {(vigente.avaliacao_compatibilidades ?? []).map((c: any) => (
                <p key={c.id} className="text-muted-foreground">{VALOR_ADM_LABEL[c.tipo_valor]} {fmtMoney(c.valor_comparado)}: {DIRECAO[c.direcao]} ({fmtNum(c.diferenca_percentual, 2)}%), {POS_IC[c.posicao_ic]}, {POS_CAMPO[c.posicao_campo]}.</p>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
