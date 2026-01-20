import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface RdoAtividadesReportDialogProps {
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

export function RdoAtividadesReportDialog({ obraId, obraNome }: RdoAtividadesReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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
      // Buscar atividades no período selecionado
      const { data: activities, error } = await supabase
        .from('rdo_activities')
        .select(`
          id,
          descricao,
          item_code,
          executado_dia,
          unidade,
          report_id,
          rdo_reports!inner (
            data,
            status
          )
        `)
        .eq('obra_id', obraId)
        .gte('rdo_reports.data', format(date.from, 'yyyy-MM-dd'))
        .lte('rdo_reports.data', format(date.to, 'yyyy-MM-dd'))
        .in('rdo_reports.status', ['concluido', 'aprovado'])
        .order('rdo_reports(data)', { ascending: true });

      if (error) throw error;

      if (!activities || activities.length === 0) {
        toast.warning('Nenhuma atividade encontrada no período selecionado');
        return;
      }

      // Formatar dados para o relatório
      const reportData: AtividadeReport[] = activities
        .filter(a => a.executado_dia && a.executado_dia > 0)
        .map(activity => ({
          data: format(new Date((activity.rdo_reports as any).data + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
          codigo: activity.item_code || '-',
          descricao: activity.descricao,
          executado: activity.executado_dia || 0,
          unidade: activity.unidade || '-',
        }));

      if (reportData.length === 0) {
        toast.warning('Nenhuma atividade com execução encontrada no período');
        return;
      }

      // Criar cabeçalho com informações da obra
      const headerRows = [
        [`Relatório de Atividades - RDO`],
        [`Obra: ${obraNome || 'Não informada'}`],
        [`Período: ${format(date.from, 'dd/MM/yyyy', { locale: ptBR })} a ${format(date.to, 'dd/MM/yyyy', { locale: ptBR })}`],
        [], // Linha em branco
        ['Data', 'Código', 'Descrição', 'Executado', 'Unidade'], // Cabeçalho da tabela
      ];

      // Adicionar dados
      const dataRows = reportData.map(item => [
        item.data,
        item.codigo,
        item.descricao,
        item.executado,
        item.unidade,
      ]);

      // Combinar cabeçalho e dados
      const allRows = [...headerRows, ...dataRows];

      // Criar planilha Excel
      const worksheet = XLSX.utils.aoa_to_sheet(allRows);

      // Ajustar largura das colunas
      worksheet['!cols'] = [
        { wch: 12 },  // Data
        { wch: 15 },  // Código
        { wch: 60 },  // Descrição
        { wch: 12 },  // Executado
        { wch: 10 },  // Unidade
      ];

      // Mesclar células do cabeçalho para melhor visualização
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Título
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Obra
        { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, // Período
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Atividades RDO');

      // Gerar nome do arquivo com nome da obra
      const obraNomeSanitizado = (obraNome || 'Obra').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const fileName = `Atividades_${obraNomeSanitizado}_${format(date.from, 'dd-MM-yyyy')}_a_${format(date.to, 'dd-MM-yyyy')}.xlsx`;

      // Download
      XLSX.writeFile(workbook, fileName);

      toast.success(`${reportData.length} atividade(s) exportada(s) com sucesso!`);
      setOpen(false);
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      toast.error(error.message || 'Erro ao gerar o relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px] w-full text-left"
        >
          <FileSpreadsheet className="h-5 w-5" />
          <span>Relatório de Atividades</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Relatório de Atividades</DialogTitle>
          <DialogDescription>
            Exporte todas as atividades executadas nos RDOs em um período específico.
            {obraNome && (
              <span className="block mt-1 font-medium text-foreground">{obraNome}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Período</label>
            <DatePickerWithRange date={date} setDate={setDate} />
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">O relatório incluirá:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Data da execução</li>
              <li>Código do serviço</li>
              <li>Descrição da atividade</li>
              <li>Quantidade executada no dia</li>
              <li>Unidade de medida</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
