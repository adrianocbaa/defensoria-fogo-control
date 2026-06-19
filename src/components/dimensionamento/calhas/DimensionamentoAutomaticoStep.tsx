import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Lightbulb, Library, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Pano } from './panoSchema';
import { calcularAreaContribuicao } from './panoSchema';
import {
  CLASSIFICACAO_LABEL,
  dimensionarAutomatico,
  type Classificacao,
  type ResultadoAutomatico,
} from '@/lib/dimensionamentoAutomatico';
import { listarBiblioteca } from '@/lib/bibliotecaCalhasStorage';
import { vazaoProjetoLmin } from '@/lib/calhaCalculo';
import type { ParametrosAutomaticoForm } from './ParametrosAutomaticoStep';
import { BibliotecaCalhasManager } from './BibliotecaCalhasManager';
import { toCSV, baixarCSV } from '@/lib/projetoCalhasStorage';

interface Props {
  panos: Pano[];
  intensidade_mm_h: number;
  parametros: ParametrosAutomaticoForm;
  onBack: () => void;
  onConfirm: (resultado: ResultadoAutomatico) => void;
}

const COR: Record<Classificacao, string> = {
  nao_atende: 'bg-destructive/15 text-destructive border-destructive/40',
  atende_limite: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300',
  atende: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300',
  atende_com_folga: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/30 dark:text-sky-300',
};

export function DimensionamentoAutomaticoStep({
  panos,
  intensidade_mm_h,
  parametros,
  onBack,
  onConfirm,
}: Props) {
  const resultado = useMemo(() => {
    const areaTotal = panos.reduce(
      (s, p) => s + calcularAreaContribuicao(p).areaContribuicao,
      0,
    );
    const Q = vazaoProjetoLmin(intensidade_mm_h, areaTotal);
    const biblioteca = listarBiblioteca();
    return dimensionarAutomatico(biblioteca, Q, {
      declividade_pct: parametros.declividade_pct,
      material: parametros.material,
      manning_n_override: parametros.manning_n,
      num_descidas: parametros.num_descidas,
      fs_alvo: parametros.fs_alvo,
    });
  }, [panos, intensidade_mm_h, parametros]);

  const exportarCSV = () => {
    const rows: (string | number)[][] = [
      ['Nome', 'Tipo', 'Material', 'Dimensão', 'Capacidade (L/min)', 'FS', 'Classificação'],
      ...resultado.alternativas.map((a) => [
        a.item.nome,
        a.item.tipo,
        a.item.material,
        a.dimensaoLabel,
        a.capacidade_Lmin ?? '',
        a.fs ?? '',
        CLASSIFICACAO_LABEL[a.classificacao],
      ]),
    ];
    baixarCSV('dimensionamento-automatico-alternativas', toCSV(rows));
  };

  const rec = resultado.recomendada;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Vazão de projeto total: <strong>{resultado.Qtotal_Lmin.toFixed(1)} L/min</strong> •
          Vazão por descida: <strong>{resultado.Qpd_Lmin.toFixed(1)} L/min</strong>
        </div>
        <div className="flex gap-2">
          <BibliotecaCalhasManager />
          <Button variant="outline" size="sm" className="gap-2" onClick={exportarCSV}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Solução recomendada */}
      <Card className={cn('border-2', rec ? 'border-emerald-500/50' : 'border-destructive/60')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {rec ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            {rec ? 'Solução recomendada' : 'Nenhuma calha da biblioteca atende com folga'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rec ? (
            <>
              <div className="grid md:grid-cols-4 gap-3 text-sm">
                <Info label="Calha" value={rec.item.nome} />
                <Info label="Dimensão" value={rec.dimensaoLabel} />
                <Info label="Material" value={rec.item.material} />
                <Info label="Capacidade" value={`${rec.capacidade_Lmin?.toFixed(1)} L/min`} />
                <Info label="FS" value={rec.fs?.toFixed(2) ?? '—'} />
                <Info label="Descidas" value={String(parametros.num_descidas)} />
                <Info
                  label="Cond. vertical (mín)"
                  value={
                    resultado.condutor.diametro_min_mm
                      ? `${resultado.condutor.diametro_min_mm.toFixed(0)} mm`
                      : 'fora da tabela'
                  }
                />
                <Info
                  label="Cond. vertical adotado"
                  value={
                    resultado.condutor.diametro_adotado_mm
                      ? `Ø ${resultado.condutor.diametro_adotado_mm} mm (FS ${resultado.condutor.fs?.toFixed(2)})`
                      : '—'
                  }
                />
              </div>
              {resultado.dimensaoMinima && resultado.dimensaoMinima.item.id !== rec.item.id && (
                <div className="text-xs text-muted-foreground">
                  Dimensão mínima absoluta (FS ≥ 1): <strong>{resultado.dimensaoMinima.item.nome}</strong> ({resultado.dimensaoMinima.dimensaoLabel}) — FS {resultado.dimensaoMinima.fs?.toFixed(2)}.
                </div>
              )}
            </>
          ) : (
            <div className="text-sm">
              A biblioteca para o material <strong>{parametros.material}</strong> não contém
              uma calha com FS ≥ {parametros.fs_alvo.toFixed(2)}. Veja sugestões abaixo,
              cadastre uma seção maior na biblioteca ou ajuste os parâmetros.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sugestões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Sugestões / alternativas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>Aumentar quantidade de descidas para {resultado.sugestaoAumentarDescidas.num_descidas}:</strong>{' '}
            vazão por descida cai para {resultado.sugestaoAumentarDescidas.Qpd_Lmin.toFixed(1)} L/min.{' '}
            {resultado.sugestaoAumentarDescidas.recomendada ? (
              <>
                Calha recomendada: <strong>{resultado.sugestaoAumentarDescidas.recomendada.item.nome}</strong>{' '}
                ({resultado.sugestaoAumentarDescidas.recomendada.dimensaoLabel}, FS{' '}
                {resultado.sugestaoAumentarDescidas.recomendada.fs?.toFixed(2)}).
              </>
            ) : (
              <>Ainda não há calha na biblioteca que atenda.</>
            )}
          </div>
          <div>
            <strong>Aumentar a seção da calha:</strong> verifique a tabela completa abaixo —
            seções maiores em azul ("Atende com folga") fornecem mais segurança.
          </div>
        </CardContent>
      </Card>

      {/* Alternativas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Library className="h-4 w-4 text-primary" />
            Alternativas analisadas ({resultado.alternativas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resultado.alternativas.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma calha do material selecionado encontrada na biblioteca.
            </div>
          ) : (
            <div className="rounded border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Dimensão</TableHead>
                    <TableHead className="text-right">Capacidade (L/min)</TableHead>
                    <TableHead className="text-right">FS</TableHead>
                    <TableHead>Classificação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultado.alternativas.map((a) => (
                    <TableRow key={a.item.id}>
                      <TableCell className="text-xs">{a.item.nome}</TableCell>
                      <TableCell className="text-xs">{a.item.tipo}</TableCell>
                      <TableCell className="text-xs">{a.dimensaoLabel}</TableCell>
                      <TableCell className="text-xs text-right">
                        {a.capacidade_Lmin?.toFixed(1) ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {a.fs?.toFixed(2) ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', COR[a.classificacao])}>
                          {a.classificacao === 'nao_atende' && <XCircle className="h-3 w-3 mr-1" />}
                          {a.classificacao === 'atende_limite' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {(a.classificacao === 'atende' || a.classificacao === 'atende_com_folga') && (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {CLASSIFICACAO_LABEL[a.classificacao]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <Button onClick={() => onConfirm(resultado)} disabled={!rec}>
          Avançar para memorial
        </Button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
