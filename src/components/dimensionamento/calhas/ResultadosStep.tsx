import { useMemo } from 'react';
import {
  LayoutDashboard, CheckCircle2, XCircle, Droplets, CloudRain, Gauge, Ruler, ArrowDownToLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Calha } from './calhaSchema';
import type { Pano } from './panoSchema';
import { calcularCalhas } from '@/lib/calhaCalculo';
import {
  FAIXAS_CONDUTOR_PADRAO,
  diametroMinimo,
  diametroComercial,
  capacidadePorDiametro,
} from '@/lib/condutorVertical';

interface Props {
  calhas: Calha[];
  panos: Pano[];
  intensidade_mm_h: number;
  onBack: () => void;
}

export function ResultadosStep({ calhas, panos, intensidade_mm_h, onBack }: Props) {
  const faixas = FAIXAS_CONDUTOR_PADRAO;

  const { resultadosCalha, resultadosCondutor, totais } = useMemo(() => {
    const resultadosCalha = calcularCalhas(calhas, panos, intensidade_mm_h);

    const resultadosCondutor = resultadosCalha.flatMap((r) => {
      const n = r.calha.pontos_descida.length || 1;
      const q = r.vazaoProjeto_Lmin / n;
      return r.calha.pontos_descida.map((p) => {
        const dMin = diametroMinimo(faixas, q);
        const comercial = dMin != null ? diametroComercial(faixas, dMin) : null;
        const cap = comercial ? capacidadePorDiametro(faixas, comercial.diametro_mm) : null;
        const atende = cap != null && cap >= q;
        return {
          id: `${r.calha.id}-${p.id}`,
          calhaNome: r.calha.nome,
          pontoRotulo: p.rotulo,
          Q_Lmin: q,
          dMin_mm: dMin,
          dAdotado_mm: comercial?.diametro_mm ?? null,
          capacidade_Lmin: cap,
          fs: cap && q > 0 ? cap / q : null,
          atende,
        };
      });
    });

    const areaTotal = resultadosCalha.reduce((s, r) => s + r.areaContribuicao_m2, 0);
    const vazaoTotal = resultadosCalha.reduce((s, r) => s + r.vazaoProjeto_Lmin, 0);
    const calhasNaoAtendem = resultadosCalha.filter((r) => r.atende === false).length;
    const condNaoAtendem = resultadosCondutor.filter((c) => !c.atende).length;
    const status = calhasNaoAtendem === 0 && condNaoAtendem === 0;

    return {
      resultadosCalha,
      resultadosCondutor,
      totais: {
        areaTotal,
        vazaoTotal,
        nCalhas: calhas.length,
        nCondutores: resultadosCondutor.length,
        calhasNaoAtendem,
        condNaoAtendem,
        status,
      },
    };
  }, [calhas, panos, intensidade_mm_h, faixas]);

  return (
    <div className="space-y-6">
      <div className={cn(
        'rounded-lg border p-4 flex items-center gap-3',
        totais.status
          ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20'
          : 'border-destructive/50 bg-destructive/5',
      )}>
        {totais.status ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        ) : (
          <XCircle className="h-6 w-6 text-destructive" />
        )}
        <div>
          <div className="text-base font-semibold">
            {totais.status
              ? 'Sistema ATENDE à NBR 10844:1989'
              : 'Sistema NÃO atende — revisar itens em vermelho'}
          </div>
          <div className="text-xs text-muted-foreground">
            {totais.calhasNaoAtendem} calha(s) e {totais.condNaoAtendem} condutor(es) não atendem.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI icon={<LayoutDashboard className="h-4 w-4" />} label="Área total" value={`${totais.areaTotal.toFixed(2)} m²`} />
        <KPI icon={<CloudRain className="h-4 w-4" />} label="Intensidade" value={`${intensidade_mm_h} mm/h`} />
        <KPI icon={<Droplets className="h-4 w-4" />} label="Vazão total" value={`${totais.vazaoTotal.toFixed(1)} L/min`} />
        <KPI icon={<Ruler className="h-4 w-4" />} label="Calhas" value={totais.nCalhas.toString()} />
        <KPI icon={<ArrowDownToLine className="h-4 w-4" />} label="Condutores" value={totais.nCondutores.toString()} />
        <KPI
          icon={<Gauge className="h-4 w-4" />}
          label="Status"
          value={totais.status ? 'Atende' : 'Não atende'}
          tone={totais.status ? 'ok' : 'danger'}
        />
      </div>

      <section>
        <h3 className="text-sm font-semibold mb-2">Resultados por calha</h3>
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Calha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Área (m²)</TableHead>
                <TableHead className="text-right">Q proj. (L/min)</TableHead>
                <TableHead className="text-right">Capacidade (L/min)</TableHead>
                <TableHead className="text-right">FS</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultadosCalha.map((r) => (
                <TableRow
                  key={r.calha.id}
                  className={cn(
                    r.atende === false && 'bg-destructive/5',
                    r.atende === true && 'bg-emerald-50/60 dark:bg-emerald-950/10',
                  )}
                >
                  <TableCell className="font-medium">{r.calha.nome}</TableCell>
                  <TableCell className="capitalize text-sm">{r.calha.tipo}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.areaContribuicao_m2.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.vazaoProjeto_Lmin.toFixed(1)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.capacidade_Lmin != null ? r.capacidade_Lmin.toFixed(1) : '—'}
                  </TableCell>
                  <TableCell className={cn(
                    'text-right tabular-nums font-semibold',
                    r.fatorSeguranca != null && r.fatorSeguranca < 1 && 'text-destructive',
                    r.fatorSeguranca != null && r.fatorSeguranca >= 1.5 && 'text-emerald-600',
                  )}>
                    {r.fatorSeguranca != null ? r.fatorSeguranca.toFixed(2) : '—'}
                  </TableCell>
                  <TableCell><StatusBadge atende={r.atende} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2">Resultados por condutor</h3>
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Calha</TableHead>
                <TableHead>Ponto</TableHead>
                <TableHead className="text-right">Q (L/min)</TableHead>
                <TableHead className="text-right">D mín. (mm)</TableHead>
                <TableHead className="text-right">D adotado (mm)</TableHead>
                <TableHead className="text-right">Capacidade (L/min)</TableHead>
                <TableHead className="text-right">FS</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultadosCondutor.map((c) => (
                <TableRow
                  key={c.id}
                  className={cn(
                    !c.atende && 'bg-destructive/5',
                    c.atende && 'bg-emerald-50/60 dark:bg-emerald-950/10',
                  )}
                >
                  <TableCell className="font-medium">{c.calhaNome}</TableCell>
                  <TableCell>{c.pontoRotulo}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.Q_Lmin.toFixed(1)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.dMin_mm != null ? c.dMin_mm.toFixed(0) : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.dAdotado_mm ?? '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.capacidade_Lmin != null ? c.capacidade_Lmin.toFixed(1) : '—'}
                  </TableCell>
                  <TableCell className={cn(
                    'text-right tabular-nums font-semibold',
                    c.fs != null && c.fs < 1 && 'text-destructive',
                    c.fs != null && c.fs >= 1.5 && 'text-emerald-600',
                  )}>
                    {c.fs != null ? c.fs.toFixed(2) : '—'}
                  </TableCell>
                  <TableCell><StatusBadge atende={c.atende} /></TableCell>
                </TableRow>
              ))}
              {!resultadosCondutor.length && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                    Nenhum condutor cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
      </div>
    </div>
  );
}

function KPI({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: string; tone?: 'ok' | 'danger' }) {
  return (
    <div className={cn(
      'rounded-lg border p-3',
      tone === 'danger' && 'border-destructive/50 bg-destructive/5',
      tone === 'ok' && 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20',
    )}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function StatusBadge({ atende }: { atende: boolean | null }) {
  if (atende == null) return <Badge variant="outline">—</Badge>;
  return atende ? (
    <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
      <CheckCircle2 className="h-3 w-3" /> Atende
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" /> Não atende
    </Badge>
  );
}
