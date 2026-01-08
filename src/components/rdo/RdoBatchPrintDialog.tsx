import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Printer, Download, Loader2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RdoBatchPrintDialogProps {
  obraId: string;
  obraNome?: string;
}

export function RdoBatchPrintDialog({ obraId, obraNome }: RdoBatchPrintDialogProps) {
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
        // Download the ZIP file
        const link = document.createElement('a');
        link.href = data.zipUrl;
        link.download = `RDOs-${format(date.from, 'dd-MM-yyyy')}-a-${format(date.to, 'dd-MM-yyyy')}.zip`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`${data.count} RDO(s) gerado(s) com sucesso!`);
        setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-3 px-4 py-3 min-h-[44px]"
        >
          <Printer className="h-5 w-5" />
          <span>Imprimir RDOs</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Imprimir RDOs em Lote</DialogTitle>
          <DialogDescription>
            Selecione o período para gerar um arquivo ZIP com todos os PDFs dos RDOs.
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
            Os RDOs concluídos ou aprovados no período selecionado serão gerados em PDF e compactados em um arquivo ZIP.
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
                Gerar ZIP
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
