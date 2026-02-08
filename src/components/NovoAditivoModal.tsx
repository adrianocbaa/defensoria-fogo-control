import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface NovoAditivoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sequenciasDisponiveis: number[];
  defaultSequencia: number;
  onConfirm: (options: { 
    extracontratual: boolean; 
    file?: File | null; 
    sequenciaEfetiva: number;
    temAditivoPrazo: boolean;
    diasAditivoPrazo: number;
  }) => void;
}

const NovoAditivoModal: React.FC<NovoAditivoModalProps> = ({ open, onOpenChange, sequenciasDisponiveis, defaultSequencia, onConfirm }) => {
  const [extracontratual, setExtracontratual] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sequencia, setSequencia] = useState<number>(defaultSequencia);
  const [submitting, setSubmitting] = useState(false);
  const [temAditivoPrazo, setTemAditivoPrazo] = useState(false);
  const [diasAditivoPrazo, setDiasAditivoPrazo] = useState<number>(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const handleCreate = async () => {
    if (extracontratual && !file) return; // require file if selected
    if (submitting) return; // Prevenir double-click
    
    setSubmitting(true);
    // Fechar modal imediatamente para evitar double-click
    onOpenChange(false);
    
    try {
      await onConfirm({ 
        extracontratual, 
        file, 
        sequenciaEfetiva: sequencia,
        temAditivoPrazo,
        diasAditivoPrazo: temAditivoPrazo ? diasAditivoPrazo : 0
      });
    } finally {
      // reset state após execução
      setSubmitting(false);
      setExtracontratual(false);
      setFile(null);
      setTemAditivoPrazo(false);
      setDiasAditivoPrazo(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Aditivo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Este aditivo inclui serviços extracontratuais?</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="extracontratual"
                  checked={extracontratual}
                  onChange={() => setExtracontratual(true)}
                />
                <span>Sim, vou anexar uma planilha</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="extracontratual"
                  checked={!extracontratual}
                  onChange={() => setExtracontratual(false)}
                />
                <span>Não, seguir sem anexos</span>
              </label>
            </div>
          </div>

          {extracontratual && (
            <div className="space-y-2">
              <Label htmlFor="planilha-extra" className="text-sm">Anexar planilha complementar (.xlsx, .csv)</Label>
              <Input id="planilha-extra" type="file" accept=".xlsx,.csv" onChange={handleFileChange} />
              <p className="text-xs text-muted-foreground">A planilha será anexada ao final da planilha original, sem substituir.</p>
            </div>
          )}

          <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="aditivo-prazo" 
                checked={temAditivoPrazo}
                onCheckedChange={(checked) => setTemAditivoPrazo(checked === true)}
              />
              <Label htmlFor="aditivo-prazo" className="text-sm font-medium cursor-pointer">
                Este aditivo inclui prorrogação de prazo
              </Label>
            </div>
            
            {temAditivoPrazo && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="dias-prazo" className="text-sm">Dias a adicionar ao prazo</Label>
                <Input 
                  id="dias-prazo" 
                  type="number" 
                  min="1"
                  placeholder="Ex: 30"
                  value={diasAditivoPrazo || ''}
                  onChange={(e) => setDiasAditivoPrazo(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Os dias serão somados ao prazo atual da obra e a data de término será recalculada.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Passa a valer a partir de:</Label>
            <select
              className="w-full h-9 border rounded-md px-2 text-sm"
              value={sequencia}
              onChange={(e) => setSequencia(Number(e.target.value))}
            >
              {sequenciasDisponiveis.map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? 'Antes da 1ª Medição' : `Medição ${n}`}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {sequencia === 0 
                ? 'O aditivo será considerado desde o início, afetando todas as medições.' 
                : 'Percentuais a partir desta medição usarão o contrato atualizado.'}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting || (extracontratual && !file) || (temAditivoPrazo && diasAditivoPrazo <= 0)}>
              {submitting ? 'Criando...' : 'Criar Aditivo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NovoAditivoModal;
