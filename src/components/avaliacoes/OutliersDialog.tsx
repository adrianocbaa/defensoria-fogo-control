// Critério 12 — diagnóstico de outliers: indicadores por amostra e decisão do avaliador (manter ou excluir do modelo).
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Scissors, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { fmtDateTime } from '@/lib/avaliacao/labels';
import {
  DECISAO_OUTLIER_LABEL, METRICA_LABEL, NIVEL_AMOSTRA_LABEL, NIVEL_OUTLIER_LABEL, NIVEL_OUTLIER_TEXTO,
  fmtIndicador, fmtPValor, indicadoresAmostra, justificativaObrigatoria, resumoOutliers, rotuloAmostra,
  type AmostraOutlier, type DadosOutliers, type DecisaoOutlier, type EventoDecisao,
} from '@/lib/avaliacao/outliers';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dados: DadosOutliers;
  modeloNome: string;
  decisoes: Record<string, EventoDecisao>;
  nomeUsuario: (uid: string | null) => string;
  podeDecidir: boolean;
  motivoBloqueio: string | null;
  onDecidir: (amostraId: string, decisao: DecisaoOutlier, justificativa: string) => Promise<boolean>;
}

function NivelTag({ nivel }: { nivel: DadosOutliers['nivel'] }) {
  const Icon = nivel === 'SEM_INDICIO' ? CheckCircle2 : AlertTriangle;
  const cls = nivel === 'SEM_INDICIO' ? 'text-primary' : nivel === 'FORTE' ? 'text-destructive' : 'text-foreground';
  return <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${cls}`}><Icon className="h-4 w-4 shrink-0" aria-hidden />{NIVEL_OUTLIER_LABEL[nivel]}</span>;
}

function Suspeita({ a, d, regra, decisao, autor, pode, onDecidir }: {
  a: AmostraOutlier; d: DadosOutliers; regra: DadosOutliers['politica']['justificativa_manter']; decisao: EventoDecisao | undefined; autor: string;
  pode: boolean; onDecidir: Props['onDecidir'];
}) {
  const [just, setJust] = useState('');
  const [busy, setBusy] = useState<DecisaoOutlier | null>(null);
  const decidir = async (x: DecisaoOutlier) => {
    setBusy(x);
    const ok = await onDecidir(a.amostra_id, x, just.trim());
    setBusy(null);
    if (ok) setJust('');
  };
  const faltaJust = (x: DecisaoOutlier) => justificativaObrigatoria(x, a.nivel, regra) && just.trim().length < 10;
  const id = `out-just-${a.amostra_id}`;
  return (
    <li className="rounded-lg border p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{rotuloAmostra(a.ordem)}</p>
        <Badge variant={a.nivel === 'FORTE' ? 'destructive' : 'outline'}>{NIVEL_AMOSTRA_LABEL[a.nivel]}</Badge>
      </div>
      <p className="text-xs tabular-nums">{indicadoresAmostra(a)}</p>
      {a.motivos.length > 0 && <p className="text-xs text-muted-foreground">Motivo: {a.motivos.join(' · ')}</p>}
      {a.nivel === 'FORTE' && <p className="text-xs font-medium">Análise obrigatória antes de concluir a validação.</p>}
      {decisao ? (
        <p className="flex items-start gap-1.5 text-sm">
          {decisao.details_json?.decisao === 'EXCLUIR' ? <Scissors className="h-4 w-4 mt-0.5 shrink-0" aria-hidden /> : <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden />}
          <span>{DECISAO_OUTLIER_LABEL[decisao.details_json?.decisao as DecisaoOutlier] ?? decisao.details_json?.decisao} · {autor} · {fmtDateTime(decisao.created_at)}
            {decisao.details_json?.justificativa ? ` — ${decisao.details_json.justificativa}` : ''}
            {decisao.details_json?.modelo_derivado_nome ? ` · novo modelo: ${decisao.details_json.modelo_derivado_nome}` : ''}</span>
        </p>
      ) : <p className="text-xs text-muted-foreground">Aguardando decisão do avaliador.</p>}
      {pode && (
        <div className="grid gap-2 pt-1">
          <Label htmlFor={id} className="text-xs">
            Justificativa {justificativaObrigatoria('MANTER', a.nivel, regra) ? '(obrigatória)' : '(obrigatória para excluir; opcional para manter)'}
          </Label>
          <Textarea id={id} rows={2} maxLength={2000} value={just} onChange={(e) => setJust(e.target.value)}
            placeholder="Ex.: imóvel com acabamento superior, representativo do mercado local" />
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" disabled={!!busy || faltaJust('MANTER')} onClick={() => decidir('MANTER')}>
              <ShieldCheck className="h-4 w-4 mr-1" />{busy === 'MANTER' ? 'Registrando…' : decisao ? 'Manter amostra (nova decisão)' : 'Manter amostra'}</Button>
            <Button size="sm" variant="outline" disabled={!!busy || faltaJust('EXCLUIR')} onClick={() => decidir('EXCLUIR')}>
              <Scissors className="h-4 w-4 mr-1" />{busy === 'EXCLUIR' ? 'Criando modelo…' : 'Excluir do modelo'}</Button>
          </div>
        </div>
      )}
    </li>
  );
}

export function OutliersDialog({ open, onOpenChange, dados: d, modeloNome, decisoes, nomeUsuario, podeDecidir, motivoBloqueio, onDecidir }: Props) {
  const [todas, setTodas] = useState(false);
  const ordenadas = [...d.amostras].sort((a, b) => Math.abs(b.residuo_dp) - Math.abs(a.residuo_dp));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3">Outliers — {modeloNome} <NivelTag nivel={d.nivel} /></DialogTitle>
          <DialogDescription>{NIVEL_OUTLIER_TEXTO[d.nivel]} Nenhuma amostra é excluída automaticamente: a decisão é sua.</DialogDescription>
        </DialogHeader>

        <ul className="grid gap-2 grid-cols-2 lg:grid-cols-4 text-sm" aria-label="Resumo do diagnóstico">
          {resumoOutliers(d).map((t) => <li key={t} className="rounded-md border px-3 py-2">{t}</li>)}
        </ul>
        <p className="text-xs text-muted-foreground">
          Métrica que define o resultado: {METRICA_LABEL[d.metrica] ?? d.metrica} (limite moderado {fmtIndicador(d.politica.limite_moderado)}, forte {fmtIndicador(d.politica.limite_forte)}).
          {d.bonferroni_limite !== null ? ` Forte indício também quando o p-valor do resíduo studentizado externo < ${fmtPValor(d.bonferroni_limite)} (Bonferroni α/n).` : ''}
          {' '}Resíduo studentizado, p-valor, Cook e leverage são mostrados como informação complementar.
          {d.politica.origem === 'PROCEDIMENTO_INTERNO' ? ' Limites de procedimento interno da política, não normativos.' : ''}
        </p>
        {d.aviso_metrica && <p className="text-xs">{d.aviso_metrica}</p>}

        {d.nivel === 'FORTE' && (
          <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Forte indício de outlier — análise obrigatória</AlertTitle>
            <AlertDescription>Um ponto extremo pode ser legítimo e representativo do mercado. Analise a amostra e registre se ela deve ser mantida ou excluída do modelo.</AlertDescription></Alert>
        )}

        {d.suspeitas.length > 0 && (
          <section className="space-y-2">
            <p className="text-sm font-medium">Amostras sinalizadas</p>
            {!podeDecidir && motivoBloqueio && <p className="text-xs text-muted-foreground">{motivoBloqueio}</p>}
            <ul className="space-y-2">
              {d.suspeitas.map((a) => {
                const dec = decisoes[a.amostra_id];
                return <Suspeita key={a.amostra_id} a={a} d={d} regra={d.politica.justificativa_manter} decisao={dec} autor={nomeUsuario(dec?.actor_id ?? null)}
                  pode={podeDecidir} onDecidir={onDecidir} />;
              })}
            </ul>
            <p className="text-xs text-muted-foreground">“Excluir do modelo” cria um novo modelo, do mesmo conjunto de dados, sem a amostra, e o calcula. Este modelo e os seus cálculos não são alterados. Depois de decidir, execute a validação novamente.</p>
          </section>
        )}

        <section>
          <Button variant="ghost" size="sm" onClick={() => setTodas((x) => !x)} aria-expanded={todas}>
            {todas ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}Diagnóstico de todas as amostras
          </Button>
          {todas && (
            <div className="max-h-72 overflow-auto rounded-md border mt-2">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Amostra</TableHead><TableHead className="text-right">Resíduo/DP</TableHead><TableHead className="text-right">Studentizado ext.</TableHead>
                  <TableHead className="text-right">p-valor</TableHead><TableHead className="text-right">Cook</TableHead><TableHead className="text-right">Leverage</TableHead><TableHead>Indício</TableHead>
                </TableRow></TableHeader>
                <TableBody>{ordenadas.map((a) => (
                  <TableRow key={a.amostra_id} className={a.nivel !== 'SEM_INDICIO' ? 'bg-muted/50' : ''}>
                    <TableCell className="tabular-nums">{String(a.ordem).padStart(2, '0')}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtIndicador(a.residuo_dp)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtIndicador(a.studentizado_externo)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPValor(a.p_valor)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtIndicador(a.cook, 3)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtIndicador(a.leverage, 3)}</TableCell>
                    <TableCell className="text-xs">{a.nivel === 'SEM_INDICIO' ? '—' : NIVEL_AMOSTRA_LABEL[a.nivel]}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          )}
        </section>

        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
