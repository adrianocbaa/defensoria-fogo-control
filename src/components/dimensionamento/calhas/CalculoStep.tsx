import { useMemo } from 'react';
import { Calculator, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Calha } from './calhaSchema';
import type { Pano } from './panoSchema';
import { calcularCalhas, ResultadoCalha } from '@/lib/calhaCalculo';

interface Props {
  calhas: Calha[];
  panos: Pano[];
  intensidade_mm_h: number;
  onBack: () => void;
  onConfirm?: (resultados: ResultadoCalha[]) => void;
}

export function CalculoStep({ calhas, panos, intensidade_mm_h, onBack, onConfirm }: Props) {
  const resultados = useMemo(
    () => calcularCalhas(calhas, panos, intensidade_mm_h),
    [calhas, panos, intensidade_mm_h],
  );

  const totalProjeto = resultados.reduce((s, r) => s + r.vazaoProjeto_Lmin, 0);
  const totalArea = resultados.reduce((s, r) => s + r.areaContribuicao_m2, 0);
  const naoAtendem = resultados.filter((r) => r.atende === false).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-md border bg-muted/40 px-4 py-3">
        <Calculator className="h-5 w-5 text-primary mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Vazão de projeto:</strong> Q = (I × A) / 60 — L/min · mm/h · m²
          </p>
          <p>
            <strong>Capacidade da calha (Manning):</strong> Q ={' '}
            <span className="font-mono">(1/n)·A·R<sub>h</sub><sup>2/3</sup>·i<sup>1/2</sup></span>{' '}
            em m³/s, convertida para L/min.
          </p>
          <p className="mt-1">
            Intensidade adotada: <strong>{intensidade_mm_h} mm/h</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <SummaryCard label="Calhas" value={resultados.length.toString()} />
        <SummaryCard label="Área total (m²)" value={totalArea.toFixed(2)} />
        <SummaryCard label="Q projeto total (L/min)" value={totalProjeto.toFixed(1)} />
        <SummaryCard
          label="Não atendem"
          value={naoAtendem.toString()}
          tone={naoAtendem > 0 ? 'danger' : 'ok'}
        />
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Calha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Área (m²)</TableHead>
              <TableHead className="text-right">Q proj. (L/min)</TableHead>
              <TableHead className="text-right">Capacidade (L/min)</TableHead>
              <TableHead className="text-right">R<sub>h</sub> (m)</TableHead>
              <TableHead className="text-right">FS</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resultados.map((r) => (
              <TableRow key={r.calha.id}>
                <TableCell>
                  <div className="font-medium">{r.calha.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.panosAssociados.length} pano(s) · i = {r.calha.declividade_pct}%
                  </div>
                </TableCell>
                <TableCell className="capitalize text-sm">{r.calha.tipo}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.areaContribuicao_m2.toFixed(2)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.vazaoProjeto_Lmin.toFixed(1)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.capacidade_Lmin != null ? r.capacidade_Lmin.toFixed(1) : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.raioHidraulico_m != null ? r.raioHidraulico_m.toFixed(3) : '—'}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right tabular-nums font-semibold',
                    r.fatorSeguranca != null && r.fatorSeguranca < 1 && 'text-destructive',
                    r.fatorSeguranca != null && r.fatorSeguranca >= 1.5 && 'text-emerald-600',
                  )}
                >
                  {r.fatorSeguranca != null ? r.fatorSeguranca.toFixed(2) : '—'}
                </TableCell>
                <TableCell>
                  <StatusBadge r={r} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2">
        {resultados
          .filter((r) => r.atende === false)
          .map((r) => (
            <div
              key={r.calha.id}
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm"
            >
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <strong>{r.calha.nome}:</strong> {r.mensagem}
              </div>
            </div>
          ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        {onConfirm && (
          <Button onClick={() => onConfirm(resultados)}>Avançar para relatório</Button>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'danger';
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        tone === 'danger' && 'border-destructive/50 bg-destructive/5',
        tone === 'ok' && 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20',
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function StatusBadge({ r }: { r: ResultadoCalha }) {
  if (r.atende == null)
    return (
      <Badge variant="outline" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> Indefinido
      </Badge>
    );
  if (r.atende)
    return (
      <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> Atende
      </Badge>
    );
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" /> Não atende
    </Badge>
  );
}
