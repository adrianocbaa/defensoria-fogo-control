import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Download, Loader2, Printer, FileText, AlertTriangle } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  obraId: string;
  obraNome?: string;
}

export function RdoImprimirPanel({ obraId, obraNome }: Props) {
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
      toast.info('Gerando PDFs... Isso pode levar alguns minutos.');
      const { data, error } = await supabase.functions.invoke('generate-rdo-batch-pdf', {
        body: {
          obraId,
          dataInicio: format(date.from, 'yyyy-MM-dd'),
          dataFim: format(date.to, 'yyyy-MM-dd'),
        },
      });
      if (error) throw error;

      if (data?.zipUrl) {
        const link = document.createElement('a');
        link.href = data.zipUrl;
        link.download = `RDOs-${format(date.from, 'dd-MM-yyyy')}-a-${format(date.to, 'dd-MM-yyyy')}.zip`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`${data.count} RDO(s) gerado(s) com sucesso!`);
      } else if (data?.count === 0) {
        toast.warning('Nenhum RDO encontrado no período selecionado');
      }
    } catch (error: any) {
      console.error('Erro ao gerar PDFs:', error);
      toast.error(error.message || 'Erro ao gerar os PDFs');
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
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Configurações de Impressão</h2>
              <p className="text-sm text-home-muted">
                Selecione o período para gerar um arquivo ZIP com os PDFs dos RDOs
                {obraNome ? ` de ${obraNome}` : ''}.
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Período</label>
            <DatePickerWithRange date={date} setDate={setDate} />
            <p className="text-xs text-home-muted">
              Os RDOs concluídos ou aprovados no período selecionado serão exportados.
            </p>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-xl border border-home-border bg-home-surface p-6">
          <h3 className="text-base font-semibold text-foreground">Resumo da Impressão</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-home-muted">Período:</dt>
              <dd className="font-medium">
                {date?.from ? format(date.from, 'dd/MM/yyyy') : '—'} a{' '}
                {date?.to ? format(date.to, 'dd/MM/yyyy') : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-home-muted">Formato:</dt>
              <dd className="font-medium">ZIP de PDFs</dd>
            </div>
          </dl>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Relatórios com muitas imagens podem levar até 2 minutos para serem processados.
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" /> Gerar Relatório
                </>
              )}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-home-border bg-home-surface p-6">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 shrink-0 text-home-muted" />
            <div className="text-xs text-home-muted">
              O relatório inclui todos os dados registrados no RDO (fotos, ocorrências,
              comentários, atividades e quantitativos) conforme o gerador atual do sistema.
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
