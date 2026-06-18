import { useMemo, useState } from 'react';
import { ArrowDownToLine, Plus, Trash2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Calha } from './calhaSchema';
import type { Pano } from './panoSchema';
import { calcularCalhas } from '@/lib/calhaCalculo';
import {
  FAIXAS_CONDUTOR_PADRAO,
  FaixaCondutor,
  diametroMinimo,
  diametroComercial,
  capacidadePorDiametro,
  ordenarFaixas,
} from '@/lib/condutorVertical';

interface Props {
  calhas: Calha[];
  panos: Pano[];
  intensidade_mm_h: number;
  onBack: () => void;
}

interface LinhaCondutor {
  id: string;
  calhaNome: string;
  pontoRotulo: string;
  Q_Lmin: number;
  diametroAdotado_mm: number | null;
}

export function CondutoresVerticaisStep({ calhas, panos, intensidade_mm_h, onBack }: Props) {
  const [faixas, setFaixas] = useState<FaixaCondutor[]>(FAIXAS_CONDUTOR_PADRAO);

  // vazão por ponto de descida = Q da calha / nº de pontos
  const linhasIniciais = useMemo<LinhaCondutor[]>(() => {
    const resultados = calcularCalhas(calhas, panos, intensidade_mm_h);
    const linhas: LinhaCondutor[] = [];
    resultados.forEach((r) => {
      const n = r.calha.pontos_descida.length || 1;
      const qPorPonto = r.vazaoProjeto_Lmin / n;
      r.calha.pontos_descida.forEach((p) => {
        const dMin = diametroMinimo(faixas, qPorPonto);
        const comercial = dMin != null ? diametroComercial(faixas, dMin) : null;
        linhas.push({
          id: `${r.calha.id}-${p.id}`,
          calhaNome: r.calha.nome,
          pontoRotulo: p.rotulo,
          Q_Lmin: +qPorPonto.toFixed(2),
          diametroAdotado_mm: comercial?.diametro_mm ?? null,
        });
      });
    });
    return linhas;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calhas, panos, intensidade_mm_h]);

  const [linhas, setLinhas] = useState<LinhaCondutor[]>(linhasIniciais);

  const setDiametro = (id: string, d: number) =>
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, diametroAdotado_mm: d } : l)));

  const addFaixa = () =>
    setFaixas((f) => [...f, { diametro_mm: 0, vazao_Lmin: 0 }]);
  const removeFaixa = (i: number) =>
    setFaixas((f) => f.filter((_, idx) => idx !== i));
  const updFaixa = (i: number, key: keyof FaixaCondutor, value: number) =>
    setFaixas((f) => f.map((x, idx) => (idx === i ? { ...x, [key]: value } : x)));

  const diametrosDisponiveis = ordenarFaixas(faixas).map((f) => f.diametro_mm);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-md border bg-muted/40 px-4 py-3">
        <ArrowDownToLine className="h-5 w-5 text-primary mt-0.5" />
        <div className="text-sm text-muted-foreground">
          Dimensionamento de condutores verticais por tabela parametrizada com base nos
          ábacos da <strong>NBR 10844:1989</strong>. A vazão de cada calha é dividida
          igualmente entre seus pontos de descida; o diâmetro mínimo é obtido por
          interpolação log–log e arredondado para o próximo diâmetro comercial.
        </div>
      </div>

      {/* Tabela de faixas parametrizada */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Tabela de faixas (D × Q)</div>
            <div className="text-xs text-muted-foreground">
              Edite, adicione ou remova faixas conforme a fonte adotada.
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setFaixas(FAIXAS_CONDUTOR_PADRAO)}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Restaurar padrão
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addFaixa}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Faixa
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Diâmetro (mm)</TableHead>
                <TableHead>Vazão (L/min)</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {faixas.map((f, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={f.diametro_mm}
                      onChange={(e) => updFaixa(i, 'diametro_mm', Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={f.vazao_Lmin}
                      onChange={(e) => updFaixa(i, 'vazao_Lmin', Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeFaixa(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Resultados por ponto de descida */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Calha</TableHead>
              <TableHead>Ponto</TableHead>
              <TableHead className="text-right">Q (L/min)</TableHead>
              <TableHead className="text-right">D mín. (mm)</TableHead>
              <TableHead>D adotado</TableHead>
              <TableHead className="text-right">Capacidade (L/min)</TableHead>
              <TableHead className="text-right">FS</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => {
              const dMin = diametroMinimo(faixas, l.Q_Lmin);
              const cap = l.diametroAdotado_mm != null
                ? capacidadePorDiametro(faixas, l.diametroAdotado_mm)
                : null;
              const fs = cap != null && l.Q_Lmin > 0 ? cap / l.Q_Lmin : null;
              const atende = cap != null && cap >= l.Q_Lmin;
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.calhaNome}</TableCell>
                  <TableCell>{l.pontoRotulo}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.Q_Lmin.toFixed(1)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {dMin != null ? dMin.toFixed(0) : 'fora da tabela'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={l.diametroAdotado_mm?.toString() ?? ''}
                      onValueChange={(v) => setDiametro(l.id, Number(v))}
                    >
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {diametrosDisponiveis.map((d) => (
                          <SelectItem key={d} value={d.toString()}>
                            {d} mm
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {cap != null ? cap.toFixed(1) : '—'}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums font-semibold',
                      fs != null && fs < 1 && 'text-destructive',
                      fs != null && fs >= 1.5 && 'text-emerald-600',
                    )}
                  >
                    {fs != null ? fs.toFixed(2) : '—'}
                  </TableCell>
                  <TableCell>
                    {cap == null ? (
                      <Badge variant="outline">—</Badge>
                    ) : atende ? (
                      <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> Atende
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" /> Não atende
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {!linhas.length && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                  Nenhum ponto de descida cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
      </div>
    </div>
  );
}
