import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Circle, Clock, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { db, rpc } from '@/lib/avaliacao/api';
import { BLOCO_LABEL, BLOCO_ROUTE, CENTRO_LABEL, ESTADO_LABEL, OVERALL_LABEL, fmtMoney } from '@/lib/avaliacao/labels';

const ICON = { PRONTA: CheckCircle2, EM_ANDAMENTO: Clock, PENDENTE: Circle, BLOQUEADA: Lock, DESATUALIZADA: AlertTriangle } as const;

export function ResumoBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const av = ctx.avaliacao.data!;
  const pend = ctx.pendencias.data ?? [];
  const prontas = pend.filter((p) => p.estado === 'PRONTA').length;
  const tecnicos = useAvalQuery(av.id, 'tecnicos', () => rpc<{ user_id: string; display_name: string }[]>('aval_list_tecnicos', {}));
  const resumo = useAvalQuery(av.id, 'resumo', async () => {
    const [ac, res] = await Promise.all([
      db.from('model_acceptances').select('id, modelo_id, avaliacao_modelos(nome), model_validations(overall_status, fundamentacao_grau)')
        .eq('avaliacao_id', av.id).eq('status', 'VIGENTE').maybeSingle(),
      db.from('avaliacao_resultado_economico').select('id, centro, valor_adotado_id').eq('avaliacao_id', av.id).eq('status', 'VIGENTE').maybeSingle(),
    ]);
    let adotado: any = null;
    if (res.data?.valor_adotado_id) {
      const { data } = await db.from('avaliacao_valores_adotados').select('valor_final_apresentacao, origem, avaliacao_projecao_centros(grau_precisao)')
        .eq('id', res.data.valor_adotado_id).maybeSingle();
      adotado = data;
    }
    return { ac: ac.data as any, res: res.data as any, adotado };
  });
  const resp = (tecnicos.data ?? []).find((t) => t.user_id === av.responsavel_tecnico_id)?.display_name ?? '—';
  const amostras = pend.find((p) => p.bloco === 'MERCADO')?.amostras as number | undefined;
  const ac = resumo.data?.ac;
  const res = resumo.data?.res;
  const proxima = pend.find((p) => p.estado !== 'PRONTA' && p.estado !== 'BLOQUEADA');

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-5">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Andamento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3"><Progress value={(prontas / Math.max(1, pend.length)) * 100} className="h-2" /><span className="text-sm text-muted-foreground whitespace-nowrap">{prontas} de {pend.length} blocos</span></div>
            {proxima && ctx.ativa && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-3">
                <div><p className="text-xs text-muted-foreground">Próxima ação</p><p className="text-sm font-medium">{proxima.proxima_acao ?? BLOCO_LABEL[proxima.bloco]}</p></div>
                <Button asChild size="sm"><Link to={`/avaliacoes/${av.id}/${BLOCO_ROUTE[proxima.bloco]}`}>Ir para {BLOCO_LABEL[proxima.bloco]}</Link></Button>
              </div>
            )}
            <ul className="divide-y">
              {pend.map((p) => {
                const Icon = ICON[p.estado] ?? Circle;
                return (
                  <li key={p.bloco} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="flex items-start gap-2.5">
                      <Icon className={`h-4 w-4 mt-0.5 ${p.estado === 'PRONTA' ? 'text-primary' : p.estado === 'DESATUALIZADA' ? 'text-destructive' : 'text-muted-foreground'}`} />
                      <div>
                        <Link to={`/avaliacoes/${av.id}/${BLOCO_ROUTE[p.bloco]}`} className="text-sm font-medium hover:underline">{BLOCO_LABEL[p.bloco]}</Link>
                        {p.pendencias.length > 0 && <p className="text-xs text-muted-foreground">{p.pendencias.join(' · ')}</p>}
                      </div>
                    </div>
                    <Badge variant={p.estado === 'DESATUALIZADA' ? 'destructive' : p.estado === 'PRONTA' ? 'secondary' : 'outline'} className="shrink-0">{ESTADO_LABEL[p.estado]}</Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <Row k="Número" v={av.codigo} />
            <Row k="Processo" v={av.processo_administrativo ?? 'Não informado'} />
            <Row k="Responsável técnico" v={resp} />
            <Row k="Município" v={`${av.municipio_nome}/${av.uf}`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Indicadores</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <Row k="Amostras selecionadas" v={amostras !== undefined ? String(amostras) : '—'} />
            <Row k="Modelo aceito" v={ac?.avaliacao_modelos?.nome ?? 'Nenhum'} />
            <Row k="Validação" v={ac?.model_validations?.overall_status ? OVERALL_LABEL[ac.model_validations.overall_status] : '—'} />
            <Row k="Fundamentação" v={ac?.model_validations?.fundamentacao_grau ? `Grau ${ac.model_validations.fundamentacao_grau}` : '—'} />
            <Row k="Precisão" v={resumo.data?.adotado?.avaliacao_projecao_centros?.grau_precisao ? `Grau ${resumo.data.adotado.avaliacao_projecao_centros.grau_precisao}` : '—'} />
            <Row k="Valor adotado" v={res && resumo.data?.adotado ? `${fmtMoney(resumo.data.adotado.valor_final_apresentacao)} (${CENTRO_LABEL[res.centro]})` : '—'} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{k}</span><span className="text-right font-medium">{v}</span></div>;
}
