// Critério 1 — gráficos de relacionamento (valor estimado × variável original, demais variáveis no ponto médio).
import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileDown, Flag, HelpCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { chartLabels, drawRelationshipChartsPdf, niceTicks, type RelationshipCurve } from '@/lib/avaliacao/engine';
import { fmtDateTime, fmtNum } from '@/lib/avaliacao/labels';
import { ANALISE_VISUAL_LABEL } from '@/lib/avaliacao/cicloModelo';

export interface VarInfo { nome: string; unidade?: string | null }
export interface AnaliseVisual { conclusao: string; observacao: string | null; created_at: string; autor: string }

const T_LABEL: Record<string, (s: string) => string> = {
  DIRECT: (s) => s, INVERSE: (s) => `1/${s}`, LN: (s) => `ln(${s})`, SQUARE: (s) => `${s}²`, SQRT: (s) => `√${s}`,
  INV_SQUARE: (s) => `1/${s}²`, INV_SQRT: (s) => `1/√${s}`, POWER: (s) => `${s}^p`,
};
const DECRESCENTES = ['INVERSE', 'INV_SQUARE', 'INV_SQRT'];

function fmtVal(v: number) {
  const a = Math.abs(v);
  return fmtNum(v, a >= 100 ? 0 : a >= 10 ? 1 : 2);
}

function Sintese({ c }: { c: RelationshipCurve }) {
  const Icon = c.coherence === 'COERENTE' ? CheckCircle2 : c.coherence === 'INCOERENTE' ? AlertTriangle : c.coherence === 'SEM_REFERENCIA' ? HelpCircle : AlertTriangle;
  const cls = c.coherence === 'COERENTE' ? 'text-primary' : c.coherence === 'INCOERENTE' ? 'text-destructive' : 'text-foreground';
  const Trend = c.trend === 'DECRESCENTE' ? TrendingDown : TrendingUp;
  return (
    <p className={`flex items-start gap-1.5 text-sm font-medium ${cls}`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
      <span className="flex-1">{c.synthesis}</span>
      {(c.trend === 'CRESCENTE' || c.trend === 'DECRESCENTE') && <Trend className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />}
    </p>
  );
}

function Grafico({ c, info, dep, nomes }: { c: RelationshipCurve; info: VarInfo; dep: VarInfo; nomes: Record<string, VarInfo> }) {
  const lb = chartLabels(info, dep);
  const fixos = Object.entries(c.fixed).map(([k, v]) => `${nomes[k]?.nome ?? k} = ${fmtVal(v)}${nomes[k]?.unidade ? ` ${nomes[k]!.unidade}` : ''}`);
  const termo = (T_LABEL[c.transform] ?? ((s: string) => s))(info.nome.toLowerCase());
  return (
    <figure className="rounded-lg border p-4 space-y-2" aria-label={lb.titulo}>
      <figcaption className="text-sm font-medium">{lb.titulo}</figcaption>
      <div className="h-60" role="img" aria-label={`${lb.titulo}: ${c.synthesis}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={c.points} margin={{ top: 8, right: 12, bottom: 22, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" dataKey="x" domain={[c.min, c.max]} allowDecimals={!c.discrete} ticks={c.discrete && c.points.length <= 12 ? c.points.map((p) => p.x) : niceTicks(c.min, c.max)}
              tick={{ fontSize: 11 }} tickFormatter={(x: number) => (c.discrete && Number.isInteger(x) ? String(x) : fmtVal(x))} label={{ value: lb.eixoX, position: 'insideBottom', offset: -12, fontSize: 11 }} />
            <YAxis type="number" domain={['auto', 'auto']} tick={{ fontSize: 11 }} tickFormatter={fmtVal} width={64}
              label={{ value: lb.eixoY, angle: -90, position: 'insideLeft', offset: 0, fontSize: 11, style: { textAnchor: 'middle' } }} />
            <Tooltip formatter={(v: number) => [fmtNum(v, 2), lb.eixoY]} labelFormatter={(x: number) => `${lb.eixoX}: ${fmtVal(x)}`} />
            {c.meanPoint && <ReferenceLine x={c.meanPoint.x} strokeDasharray="4 4" className="stroke-muted-foreground" />}
            <Line type={c.discrete ? 'linear' : 'monotone'} dataKey="y" stroke="hsl(var(--primary))" strokeWidth={2} dot={c.discrete ? { r: 4 } : false} isAnimationActive={false} />
            {c.meanPoint && <ReferenceDot x={c.meanPoint.x} y={c.meanPoint.y} r={5} fill="hsl(var(--warning))" stroke="hsl(var(--background))" />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Sintese c={c} />
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <dt>Intervalo observado</dt><dd>{fmtVal(c.min)} a {fmtVal(c.max)}{info.unidade ? ` ${info.unidade}` : ''}{c.discrete ? ' · valores discretos' : ''}</dd>
        <dt>Ponto médio</dt><dd>{fmtVal(c.mean)}{info.unidade ? ` ${info.unidade}` : ''}{c.meanPoint ? ` → ${fmtNum(c.meanPoint.y, 2)}${dep.unidade ? ` ${dep.unidade}` : ''}` : ''}</dd>
        {fixos.length > 0 && <><dt>Demais na média</dt><dd>{fixos.join(' · ')}</dd></>}
        <dt>Coeficiente de {termo}</dt><dd>{fmtNum(c.beta, 4)}{DECRESCENTES.includes(c.transform) ? ' (transformação decrescente: o sinal se inverte na escala original)' : ''}</dd>
        {c.elasticity !== null && <><dt>Elasticidade no ponto médio</dt><dd>{fmtNum(c.elasticity, 3)}% para cada 1% de variação</dd></>}
      </dl>
    </figure>
  );
}

export function RelacionamentoDialog({
  open, onOpenChange, curves, nomes, dep, modeloNome, engineVersion, criterio, ultima, podeRegistrar, motivoBloqueio, obrigatoria, onRegistrar,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; curves: RelationshipCurve[] | null; nomes: Record<string, VarInfo>; dep: VarInfo;
  modeloNome: string; engineVersion: string | null; criterio: { status: string; detalhe: string | null } | null;
  ultima: AnaliseVisual | null; podeRegistrar: boolean; motivoBloqueio: string | null; obrigatoria: boolean;
  onRegistrar: (conclusao: 'COERENTE' | 'REVISAR', observacao: string) => Promise<boolean>;
}) {
  const [obs, setObs] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const resumo = useMemo(() => {
    if (!curves) return null;
    const coerentes = curves.filter((c) => c.coherence === 'COERENTE').length;
    return { coerentes, total: curves.length, alerta: curves.some((c) => c.coherence === 'INCOERENTE' || c.coherence === 'REQUER_ANALISE') };
  }, [curves]);

  const registrar = async (c: 'COERENTE' | 'REVISAR') => {
    setBusy(c);
    try { if (await onRegistrar(c, obs.trim())) setObs(''); } finally { setBusy(null); }
  };
  const baixarPdf = () => {
    if (!curves) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('Gráficos de relacionamento das variáveis no ponto médio', 15, 16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(`${modeloNome}${engineVersion ? ` · motor ${engineVersion}` : ''} · demais variáveis fixadas na média do conjunto usado no modelo · sem extrapolação`, 15, 21);
    drawRelationshipChartsPdf(doc as never, curves.map((c) => ({ curve: c, ...chartLabels(nomes[c.code] ?? { nome: c.code }, dep) })),
      { left: 15, top: 27, width: 180, pageBottom: 285, newPage: () => { doc.addPage(); return 15; } });
    doc.save(`relacionamento-${modeloNome.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relacionamento das variáveis — {modeloNome}</DialogTitle>
          <DialogDescription>
            Cada gráfico varia só uma variável dentro do intervalo usado no modelo, mantém as demais na média e mostra o valor estimado na escala original,
            com os mesmos coeficientes já calculados. O ponto destacado é o ponto médio.
          </DialogDescription>
        </DialogHeader>
        {!curves ? <p className="text-sm text-muted-foreground">Carregando os dados do modelo…</p> : curves.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este modelo não tem variáveis independentes para analisar.</p>
        ) : (
          <div className="space-y-4">
            {resumo && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                <p><strong>{resumo.coerentes} de {resumo.total}</strong> curva(s) coerente(s) com a relação esperada.{criterio ? ` Verificação automática: ${criterio.detalhe ?? criterio.status}` : ''}</p>
                {resumo.alerta && <p className="flex items-start gap-1.5"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />Há curva contrária ao esperado ou sem comportamento definido: analise antes de concluir.</p>}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {curves.map((c) => <Grafico key={c.code} c={c} info={nomes[c.code] ?? { nome: c.code }} dep={dep} nomes={nomes} />)}
            </div>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Análise do avaliador</p>
                {ultima && <p className="text-xs text-muted-foreground">Última: {ANALISE_VISUAL_LABEL[ultima.conclusao] ?? ultima.conclusao} · {ultima.autor} · {fmtDateTime(ultima.created_at)}</p>}
              </div>
              <p className="text-xs text-muted-foreground">
                {obrigatoria
                  ? 'Na política desta organização este critério depende da sua confirmação: ela entra na próxima validação.'
                  : 'Na política atual a coerência é verificada automaticamente. Sua análise fica registrada no histórico como evidência técnica e não altera o resultado do critério.'}
              </p>
              {ultima?.observacao && <p className="text-sm">Observação registrada: {ultima.observacao}</p>}
              <div className="grid gap-1.5">
                <Label htmlFor="rel-obs">Observação (opcional)</Label>
                <Textarea id="rel-obs" rows={3} maxLength={2000} value={obs} onChange={(e) => setObs(e.target.value)} disabled={!podeRegistrar}
                  placeholder="Ex.: curvas de área e banheiros crescentes, coerentes com o mercado local" />
              </div>
              {!podeRegistrar && motivoBloqueio && <p className="text-xs text-muted-foreground">{motivoBloqueio}</p>}
            </div>
          </div>
        )}
        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <Button variant="outline" onClick={baixarPdf} disabled={!curves?.length}><FileDown className="h-4 w-4 mr-1" />Baixar gráficos (PDF)</Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => registrar('REVISAR')} disabled={!podeRegistrar || !!busy || !curves?.length}><Flag className="h-4 w-4 mr-1" />{busy === 'REVISAR' ? 'Registrando…' : 'Marcar para revisão'}</Button>
            <Button onClick={() => registrar('COERENTE')} disabled={!podeRegistrar || !!busy || !curves?.length}><CheckCircle2 className="h-4 w-4 mr-1" />{busy === 'COERENTE' ? 'Registrando…' : 'Confirmar coerência'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
