import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { writeExcelFromArrays } from '@/lib/excelUtils';

interface Props {
  obraId: string;
  obraNome?: string;
}

interface AtividadeReport {
  data: string;
  codigo: string;
  descricao: string;
  executado: number;
  unidade: string;
}
interface RdoReportRow {
  id: string;
  data: string;
}
interface RdoActivityRow {
  id: string;
  descricao: string;
  item_code: string | null;
  executado_dia: number | null;
  unidade: string | null;
  report_id: string;
}

const parseYmdToDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
};

const PAGE_SIZE = 1000;
const fetchAllPages = async <T,>(
  loadPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
) => {
  const allRows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await loadPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data || [];
    allRows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows;
};

export function RdoAtividadesPanel({ obraId, obraNome }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeInProgress, setIncludeInProgress] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const handleGenerate = async () => {
    if (!date?.from || !date?.to) {
      toast.error('Selecione o período inicial e final');
      return;
    }
    setIsGenerating(true);
    try {
      const includedStatuses = includeInProgress
        ? (['concluido', 'aprovado', 'preenchendo', 'rascunho'] as const)
        : (['concluido', 'aprovado'] as const);

      const reports = await fetchAllPages<RdoReportRow>((from, to) =>
        supabase
          .from('rdo_reports')
          .select('id, data')
          .eq('obra_id', obraId)
          .gte('data', format(date.from!, 'yyyy-MM-dd'))
          .lte('data', format(date.to!, 'yyyy-MM-dd'))
          .in('status', includedStatuses)
          .order('data', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      );
      if (reports.length === 0) {
        toast.warning('Nenhum RDO encontrado no período selecionado');
        return;
      }

      const reportDateById = new Map(reports.map((r) => [r.id, r.data]));
      const activities = await fetchAllPages<RdoActivityRow>((from, to) =>
        supabase
          .from('rdo_activities')
          .select('id, descricao, item_code, executado_dia, unidade, report_id')
          .eq('obra_id', obraId)
          .in('report_id', reports.map((r) => r.id))
          .order('report_id', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      );
      if (activities.length === 0) {
        toast.warning('Nenhuma atividade encontrada no período selecionado');
        return;
      }

      const reportData: AtividadeReport[] = activities
        .filter((a) => a.executado_dia && a.executado_dia > 0)
        .map((activity) => {
          const reportDate = reportDateById.get(activity.report_id);
          if (!reportDate) return null;
          return {
            rawDate: reportDate,
            data: format(parseYmdToDate(reportDate), 'dd/MM/yyyy', { locale: ptBR }),
            codigo: activity.item_code || '-',
            descricao: activity.descricao,
            executado: activity.executado_dia || 0,
            unidade: activity.unidade || '-',
          };
        })
        .filter((i): i is AtividadeReport & { rawDate: string } => i !== null)
        .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
        .map(({ rawDate, ...i }) => i);

      if (reportData.length === 0) {
        toast.warning('Nenhuma atividade com execução encontrada no período');
        return;
      }

      const headerRows = [
        [`Relatório de Atividades - RDO`],
        [`Obra: ${obraNome || 'Não informada'}`],
        [
          `Período: ${format(date.from!, 'dd/MM/yyyy', { locale: ptBR })} a ${format(
            date.to!,
            'dd/MM/yyyy',
            { locale: ptBR },
          )}`,
        ],
        [],
        ['Data', 'Código', 'Descrição', 'Executado', 'Unidade'],
      ];
      const dataRows = reportData.map((item) => [
        item.data,
        item.codigo,
        item.descricao,
        item.executado,
        item.unidade,
      ]);
      const allRows = [...headerRows, ...dataRows];
      const obraNomeSanitizado = (obraNome || 'Obra')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 30);
      const fileName = `Atividades_${obraNomeSanitizado}_${format(
        date.from!,
        'dd-MM-yyyy',
      )}_a_${format(date.to!, 'dd-MM-yyyy')}.xlsx`;

      await writeExcelFromArrays(allRows, fileName, {
        sheetName: 'Atividades RDO',
        columnWidths: [12, 15, 60, 12, 10],
        merges: [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
        ],
      });

      toast.success(`${reportData.length} atividade(s) exportada(s) com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      toast.error(error.message || 'Erro ao gerar o relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="rounded-xl border border-home-border bg-home-surface">
        <header className="border-b border-home-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Relatório de Atividades</h2>
              <p className="text-sm text-home-muted">
                Exporte todas as atividades executadas nos RDOs em um período específico
                {obraNome ? ` — ${obraNome}` : ''}.
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Período</label>
            <DatePickerWithRange date={date} setDate={setDate} />
          </div>

          <div className="flex items-start gap-3 rounded-md border border-home-border p-3">
            <Checkbox
              id="include-in-progress"
              checked={includeInProgress}
              onCheckedChange={(v) => setIncludeInProgress(v === true)}
            />
            <div className="space-y-1">
              <label htmlFor="include-in-progress" className="text-sm font-medium cursor-pointer">
                Incluir RDOs em preenchimento e rascunho
              </label>
              <p className="text-xs text-home-muted">
                Por padrão, apenas RDOs concluídos ou aprovados são incluídos.
              </p>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-xl border border-home-border bg-home-surface p-6">
          <h3 className="text-base font-semibold text-foreground">O relatório incluirá</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-home-muted">
            <li>• Data da execução</li>
            <li>• Código do serviço</li>
            <li>• Descrição da atividade</li>
            <li>• Quantidade executada no dia</li>
            <li>• Unidade de medida</li>
          </ul>

          <div className="mt-4">
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" /> Exportar Excel
                </>
              )}
            </Button>
          </div>
        </section>
      </aside>
    </div>
  );
}
