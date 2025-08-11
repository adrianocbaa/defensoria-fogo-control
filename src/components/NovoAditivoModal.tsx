import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NovoAditivoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: { extracontratual: boolean; file?: File | null }) => void;
}

const NovoAditivoModal: React.FC<NovoAditivoModalProps> = ({ open, onOpenChange, onConfirm }) => {
  const [extracontratual, setExtracontratual] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const handleCreate = async () => {
    if (extracontratual && !file) return; // require file if selected
    setSubmitting(true);
    try {
      onConfirm({ extracontratual, file });
      onOpenChange(false);
      // reset state
      setExtracontratual(false);
      setFile(null);
    } finally {
      setSubmitting(false);
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

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting || (extracontratual && !file)}>
              {submitting ? 'Criando...' : 'Criar Aditivo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NovoAditivoModal;
