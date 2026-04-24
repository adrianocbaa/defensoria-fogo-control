import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface NovaMedicaoData {
  periodo_inicio: string;
  periodo_fim: string;
  data_vistoria: string;
  data_relatorio: string;
}

interface NovaMedicaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proximaSequencia: number;
  onConfirm: (data: NovaMedicaoData) => Promise<void> | void;
}

export function NovaMedicaoDialog({ open, onOpenChange, proximaSequencia, onConfirm }: NovaMedicaoDialogProps) {
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [dataVistoria, setDataVistoria] = useState('');
  const [dataRelatorio, setDataRelatorio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPeriodoInicio('');
      setPeriodoFim('');
      setDataVistoria('');
      setDataRelatorio(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!periodoInicio || !periodoFim || !dataVistoria || !dataRelatorio) {
      toast.error('Preencha todas as datas para criar a medição.');
      return;
    }
    if (periodoFim < periodoInicio) {
      toast.error('A data final do período deve ser igual ou posterior à data inicial.');
      return;
    }
    setSaving(true);
    try {
      await onConfirm({
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        data_vistoria: dataVistoria,
        data_relatorio: dataRelatorio,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Medição ({proximaSequencia}ª)</DialogTitle>
          <DialogDescription>
            Informe as datas referentes a esta medição. Esses valores serão usados automaticamente ao gerar o relatório técnico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nova-medicao-inicio">Período Início *</Label>
              <Input
                id="nova-medicao-inicio"
                type="date"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nova-medicao-fim">Período Fim *</Label>
              <Input
                id="nova-medicao-fim"
                type="date"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nova-medicao-vistoria">Data da Vistoria *</Label>
            <Input
              id="nova-medicao-vistoria"
              type="date"
              value={dataVistoria}
              onChange={(e) => setDataVistoria(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nova-medicao-relatorio">Data do Relatório *</Label>
            <Input
              id="nova-medicao-relatorio"
              type="date"
              value={dataRelatorio}
              onChange={(e) => setDataRelatorio(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? 'Criando...' : 'Criar Medição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
